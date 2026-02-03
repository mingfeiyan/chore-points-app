import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '../../helpers/api-test-utils'
import { Role } from '@prisma/client'

let mockSession: { user: { id: string; email: string; role: Role; familyId: string | null } } | null = null

vi.mock('@/lib/permissions', () => ({
  requireFamily: vi.fn(() => {
    if (!mockSession) throw new Error('Unauthorized')
    if (!mockSession.user.familyId) throw new Error('Forbidden: Must be part of a family')
    return mockSession
  }),
}))

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      mealPlan: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    }
  }
})

const mockMessagesCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockMessagesCreate,
      }
    },
  }
})

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { POST } from '@/app/api/meal-plans-v2/feedback/route'

describe('Meal Plans V2 Feedback API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
    // Set up environment variable for tests
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key')
  })

  describe('POST /api/meal-plans-v2/feedback', () => {
    it('should return 401 if not authenticated', async () => {
      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(401)
      expect(data).toHaveProperty('error')
    })

    it('should return 403 for non-parent users', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'kid@example.com', role: Role.KID, familyId: 'family-1' },
      }

      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(403)
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('parent')
    })

    it('should return 400 if planId is missing', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'parent@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      const request = createMockRequest('POST', {})
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should return 404 if plan not found', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'parent@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      mockPrisma.mealPlan.findFirst.mockResolvedValue(null)

      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(404)
      expect(data).toHaveProperty('error')
    })

    it('should return 404 if plan belongs to different family', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'parent@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      // With the secure query pattern, plans from other families won't be found
      // (query includes familyId in where clause)
      mockPrisma.mealPlan.findFirst.mockResolvedValue(null)

      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(404)
      expect(data).toHaveProperty('error')
    })

    it('should generate AI feedback for plan', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'parent@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        weekStart: new Date('2026-02-07'),
        weeklyStaples: ['Apples', 'Milk'],
        aiRecommendation: null,
        aiGeneratedAt: null,
        createdById: 'user-1',
        plannedDays: [
          {
            id: 'day-1',
            date: new Date('2026-02-08'),
            meals: [
              {
                id: 'meal-1',
                mealType: 'dinner',
                notes: null,
                dishes: [
                  {
                    id: 'dish-ref-1',
                    dishId: 'dish-1',
                    dishName: 'Kung Pao Chicken',
                    isFreeForm: false,
                    dish: {
                      id: 'dish-1',
                      name: 'Kung Pao Chicken',
                      photoUrl: 'url',
                      ingredients: ['chicken', 'peanuts', 'soy sauce'],
                    },
                  },
                ],
              },
            ],
          },
          {
            id: 'day-2',
            date: new Date('2026-02-09'),
            meals: [
              {
                id: 'meal-2',
                mealType: 'lunch',
                notes: null,
                dishes: [
                  {
                    id: 'dish-ref-2',
                    dishId: null,
                    dishName: 'Salad',
                    isFreeForm: true,
                    dish: null,
                  },
                ],
              },
            ],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.mealPlan.findFirst.mockResolvedValue(mockPlan)

      const mockFeedback = {
        summary: 'Good variety of proteins and vegetables.',
        breakdown: {
          proteins: { status: 'good', items: ['chicken'] },
          vegetables: { status: 'limited', items: ['lettuce'] },
          grains: { status: 'missing', items: [] },
          dairy: { status: 'good', items: ['milk'] },
          fruits: { status: 'good', items: ['apples'] },
        },
        suggestions: ['Add more whole grains', 'Include more variety in vegetables'],
      }

      mockMessagesCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockFeedback),
          },
        ],
      })

      mockPrisma.mealPlan.update.mockResolvedValue({
        ...mockPlan,
        aiRecommendation: JSON.stringify(mockFeedback),
        aiGeneratedAt: new Date(),
      })

      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ feedback: typeof mockFeedback }>(response)

      expect(status).toBe(200)
      expect(data.feedback).toBeDefined()
      expect(data.feedback.summary).toBe(mockFeedback.summary)
      expect(data.feedback.breakdown).toBeDefined()
      expect(data.feedback.suggestions).toBeDefined()

      // Verify Anthropic API was called with correct model
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
        })
      )

      // Verify the plan was updated with feedback
      expect(mockPrisma.mealPlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'plan-1' },
          data: expect.objectContaining({
            aiRecommendation: expect.any(String),
            aiGeneratedAt: expect.any(Date),
          }),
        })
      )
    })

    it('should track missingIngredientsDishes for free-form dishes', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'parent@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        weekStart: new Date('2026-02-07'),
        weeklyStaples: [],
        aiRecommendation: null,
        aiGeneratedAt: null,
        createdById: 'user-1',
        plannedDays: [
          {
            id: 'day-1',
            date: new Date('2026-02-08'),
            meals: [
              {
                id: 'meal-1',
                mealType: 'dinner',
                notes: null,
                dishes: [
                  {
                    id: 'dish-ref-1',
                    dishId: null,
                    dishName: 'Salad',
                    isFreeForm: true,
                    dish: null, // No ingredients available
                  },
                ],
              },
            ],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.mealPlan.findFirst.mockResolvedValue(mockPlan)

      const mockFeedback = {
        summary: 'Limited information available.',
        breakdown: {
          proteins: { status: 'missing', items: [] },
          vegetables: { status: 'limited', items: [] },
          grains: { status: 'missing', items: [] },
          dairy: { status: 'missing', items: [] },
          fruits: { status: 'missing', items: [] },
        },
        suggestions: ['Add more details to dishes'],
      }

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockFeedback) }],
      })

      mockPrisma.mealPlan.update.mockResolvedValue({
        ...mockPlan,
        aiRecommendation: JSON.stringify(mockFeedback),
        aiGeneratedAt: new Date(),
      })

      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ feedback: { missingIngredientsDishes: string[] } }>(response)

      expect(status).toBe(200)
      expect(data.feedback.missingIngredientsDishes).toContain('Salad')
    })

    it('should handle invalid JSON response from AI with fallback', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'parent@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        weekStart: new Date('2026-02-07'),
        weeklyStaples: [],
        aiRecommendation: null,
        aiGeneratedAt: null,
        createdById: 'user-1',
        plannedDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.mealPlan.findFirst.mockResolvedValue(mockPlan)

      // Return invalid JSON from AI
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'This is not valid JSON at all' }],
      })

      mockPrisma.mealPlan.update.mockResolvedValue({
        ...mockPlan,
        aiRecommendation: '{}',
        aiGeneratedAt: new Date(),
      })

      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ feedback: { summary: string; breakdown: object; suggestions: string[] } }>(response)

      expect(status).toBe(200)
      // Fallback response should have the expected structure
      expect(data.feedback.summary).toBeDefined()
      expect(data.feedback.breakdown).toBeDefined()
      expect(data.feedback.suggestions).toContain('Unable to parse detailed feedback. Please try again.')
    })

    it('should return 503 if Anthropic API key is not configured', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', '')

      mockSession = {
        user: { id: 'user-1', email: 'parent@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        weekStart: new Date('2026-02-07'),
        weeklyStaples: [],
        aiRecommendation: null,
        aiGeneratedAt: null,
        createdById: 'user-1',
        plannedDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.mealPlan.findFirst.mockResolvedValue(mockPlan)

      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(503)
      expect(data).toHaveProperty('error')
    })
  })
})
