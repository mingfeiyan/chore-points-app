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
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    }
  }
})

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { GET, POST } from '@/app/api/meal-plans-v2/route'

describe('Meal Plans V2 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/meal-plans-v2', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await GET(new Request('http://localhost/api/meal-plans-v2?week=2026-02-07'))
      const { status } = await parseResponse(response)
      expect(status).toBe(401)
    })

    it('should return plan for specified week', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'test@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      mockPrisma.mealPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        familyId: 'family-1',
        weekStart: new Date('2026-02-07'),
        weeklyStaples: ['Apples', 'Milk'],
        aiRecommendation: null,
        aiGeneratedAt: null,
        createdById: 'user-1',
        plannedDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await GET(new Request('http://localhost/api/meal-plans-v2?week=2026-02-07'))
      const { status, data } = await parseResponse<{ plan: { id: string } }>(response)

      expect(status).toBe(200)
      expect(data.plan).toBeDefined()
    })
  })

  describe('POST /api/meal-plans-v2', () => {
    it('should reject non-parent users', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'kid@example.com', role: Role.KID, familyId: 'family-1' },
      }

      const request = createMockRequest('POST', {
        weekStart: '2026-02-07',
        plannedDays: [],
        weeklyStaples: [],
      })

      const response = await POST(request)
      const { status } = await parseResponse(response)
      expect(status).toBe(403)
    })

    it('should return 400 if weekStart is missing', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'test@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      const request = createMockRequest('POST', { plannedDays: [], weeklyStaples: [] })
      const response = await POST(request)
      const { status } = await parseResponse(response)
      expect(status).toBe(400)
    })

    it('should create meal plan', async () => {
      mockSession = {
        user: { id: 'user-1', email: 'test@example.com', role: Role.PARENT, familyId: 'family-1' },
      }

      mockPrisma.mealPlan.upsert.mockResolvedValue({
        id: 'plan-1',
        familyId: 'family-1',
        weekStart: new Date('2026-02-07'),
        weeklyStaples: ['Apples'],
        aiRecommendation: null,
        aiGeneratedAt: null,
        createdById: 'user-1',
        plannedDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', {
        weekStart: '2026-02-07',
        plannedDays: [{ date: '2026-02-08', meals: [{ mealType: 'dinner', dishes: [{ dishName: 'Pasta' }] }] }],
        weeklyStaples: ['Apples'],
      })

      const response = await POST(request)
      const { status, data } = await parseResponse<{ plan: { id: string } }>(response)

      expect(status).toBe(200)
      expect(data.plan).toBeDefined()
    })
  })
})
