import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '../../helpers/api-test-utils'
import { Role, MealType } from '@prisma/client'

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
      mealLog: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      dish: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    }
  }
})

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { GET, POST } from '@/app/api/meals/route'

describe('Meals API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/meals', () => {
    it('should return 500 if not authenticated', async () => {
      const response = await GET(new Request('http://localhost/api/meals'))
      const { status, data } = await parseResponse(response)

      expect(status).toBe(500)
      expect(data).toHaveProperty('error')
    })

    it('should return meal logs for the family', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.mealLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          familyId: 'family-1',
          dishId: 'dish-1',
          mealType: MealType.DINNER,
          date: new Date(),
          loggedById: 'user-1',
          dish: {
            id: 'dish-1',
            name: 'Beef Stir Fry',
            photoUrl: 'https://example.com/beef.jpg',
          },
          loggedBy: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const response = await GET(new Request('http://localhost/api/meals'))
      const { status, data } = await parseResponse<{ meals: unknown[] }>(response)

      expect(status).toBe(200)
      expect(data.meals).toHaveLength(1)
    })
  })

  describe('POST /api/meals', () => {
    it('should return 400 if mealType is missing', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { dishId: 'dish-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should create meal log for existing dish', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.dish.findFirst.mockResolvedValue({
        id: 'dish-1',
        name: 'Beef Stir Fry',
        photoUrl: 'https://example.com/beef.jpg',
        totalVotes: 0,
        familyId: 'family-1',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.mealLog.create.mockResolvedValue({
        id: 'log-1',
        familyId: 'family-1',
        dishId: 'dish-1',
        mealType: MealType.DINNER,
        date: new Date(),
        loggedById: 'user-1',
        dish: {
          id: 'dish-1',
          name: 'Beef Stir Fry',
          photoUrl: 'https://example.com/beef.jpg',
        },
        loggedBy: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', {
        dishId: 'dish-1',
        mealType: 'DINNER',
        date: '2026-01-28',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ meal: { id: string } }>(response)

      expect(status).toBe(201)
      expect(data.meal).toBeDefined()
    })
  })
})
