import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseResponse } from '../../helpers/api-test-utils'
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
      dailyMealLog: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    }
  }
})

vi.mock('@/lib/meal-plan-convert', () => ({
  autoConvertPlannedMeals: vi.fn(),
}))

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { GET, POST } from '@/app/api/daily-meals/route'

function createMockRequest(method: string, body: unknown) {
  return new Request('http://localhost/api/daily-meals', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Daily Meals API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/daily-meals', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await GET(new Request('http://localhost/api/daily-meals?start=2026-02-01&end=2026-02-07'))
      const { status, data } = await parseResponse(response)

      expect(status).toBe(401)
      expect(data).toHaveProperty('error')
    })

    it('should return daily logs for date range', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.dailyMealLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          familyId: 'family-1',
          date: new Date('2026-02-03'),
          notes: null,
          meals: [
            {
              id: 'meal-1',
              mealType: 'dinner',
              notes: null,
              dishes: [
                { id: 'd-1', dishName: 'Kung Pao Chicken', isFreeForm: false, dish: { id: 'dish-1', name: 'Kung Pao Chicken', photoUrl: 'url' } }
              ]
            }
          ],
          dailyItems: [
            { id: 'item-1', name: 'Apples' }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const response = await GET(new Request('http://localhost/api/daily-meals?start=2026-02-01&end=2026-02-07'))
      const { status, data } = await parseResponse<{ logs: unknown[] }>(response)

      expect(status).toBe(200)
      expect(data.logs).toHaveLength(1)
      expect(mockPrisma.dailyMealLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: 'family-1',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('should return 400 if start date is missing', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const response = await GET(new Request('http://localhost/api/daily-meals?end=2026-02-07'))
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should return 400 if end date is missing', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const response = await GET(new Request('http://localhost/api/daily-meals?start=2026-02-01'))
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })
  })

  describe('POST /api/daily-meals', () => {
    it('should return 401 if not authenticated', async () => {
      const request = createMockRequest('POST', {
        date: '2026-02-03',
        meals: [],
        dailyItems: [],
      })
      const response = await POST(request)
      const { status } = await parseResponse(response)

      expect(status).toBe(401)
    })

    it('should return 400 if date is missing', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', {
        meals: [],
        dailyItems: [],
      })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should create a daily log with meals', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.dailyMealLog.upsert.mockResolvedValue({
        id: 'log-1',
        familyId: 'family-1',
        date: new Date('2026-02-03'),
        notes: null,
        meals: [
          {
            id: 'meal-1',
            mealType: 'dinner',
            dishes: [{ id: 'd-1', dishName: 'Kung Pao Chicken', isFreeForm: false }],
          },
        ],
        dailyItems: [{ id: 'item-1', name: 'Apples' }],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', {
        date: '2026-02-03',
        meals: [
          {
            mealType: 'dinner',
            dishes: [{ dishId: 'dish-1', dishName: 'Kung Pao Chicken' }],
          },
        ],
        dailyItems: ['Apples', 'Milk'],
      })

      const response = await POST(request)
      const { status, data } = await parseResponse<{ log: { id: string } }>(response)

      expect(status).toBe(200)
      expect(data.log).toBeDefined()
      expect(mockPrisma.dailyMealLog.upsert).toHaveBeenCalled()
    })
  })
})
