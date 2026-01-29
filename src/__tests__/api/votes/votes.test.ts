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

vi.mock('@/lib/week-utils', () => ({
  getWeekStart: vi.fn(() => new Date('2026-01-26T00:00:00')),
}))

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      weeklyVote: {
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn(),
      },
      dish: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    }
  }
})

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { GET, POST } from '@/app/api/votes/route'
import { DELETE } from '@/app/api/votes/[id]/route'

describe('Votes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/votes', () => {
    it('should return 500 if not authenticated', async () => {
      const response = await GET()
      const { status, data } = await parseResponse(response)

      expect(status).toBe(500)
      expect(data).toHaveProperty('error')
    })

    it('should return current week votes', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.weeklyVote.findMany.mockResolvedValue([
        {
          id: 'vote-1',
          familyId: 'family-1',
          dishId: 'dish-1',
          suggestedDishName: null,
          voterId: 'user-1',
          weekStart: new Date('2026-01-26'),
          dish: { id: 'dish-1', name: 'Beef Stir Fry', photoUrl: 'https://example.com/beef.jpg', totalVotes: 3 },
          voter: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const response = await GET()
      const { status, data } = await parseResponse<{ votes: unknown[] }>(response)

      expect(status).toBe(200)
      expect(data.votes).toHaveLength(1)
    })
  })

  describe('POST /api/votes', () => {
    it('should return 400 if neither dishId nor suggestedDishName provided', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', {})
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should create vote for existing dish', async () => {
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
        totalVotes: 2,
        familyId: 'family-1',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.weeklyVote.findFirst.mockResolvedValue(null) // No existing vote

      mockPrisma.weeklyVote.create.mockResolvedValue({
        id: 'vote-1',
        familyId: 'family-1',
        dishId: 'dish-1',
        suggestedDishName: null,
        voterId: 'user-1',
        weekStart: new Date('2026-01-26'),
        dish: { id: 'dish-1', name: 'Beef Stir Fry', photoUrl: 'https://example.com/beef.jpg', totalVotes: 3 },
        voter: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.dish.update.mockResolvedValue({
        id: 'dish-1',
        name: 'Beef Stir Fry',
        photoUrl: 'https://example.com/beef.jpg',
        totalVotes: 3,
        familyId: 'family-1',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', { dishId: 'dish-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ vote: { id: string } }>(response)

      expect(status).toBe(201)
      expect(data.vote).toBeDefined()
    })

    it('should create vote for suggested dish', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.weeklyVote.findFirst.mockResolvedValue(null)

      mockPrisma.weeklyVote.create.mockResolvedValue({
        id: 'vote-2',
        familyId: 'family-1',
        dishId: null,
        suggestedDishName: 'Sushi Night',
        voterId: 'user-1',
        weekStart: new Date('2026-01-26'),
        dish: null,
        voter: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', { suggestedDishName: 'Sushi Night' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ vote: { suggestedDishName: string } }>(response)

      expect(status).toBe(201)
      expect(data.vote.suggestedDishName).toBe('Sushi Night')
    })

    it('should return 400 when both dishId and suggestedDishName are provided', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { dishId: 'dish-1', suggestedDishName: 'Sushi Night' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data.error).toBe('Provide either dishId or suggestedDishName, not both')
    })

    it('should return 400 when duplicate vote is attempted', async () => {
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
        totalVotes: 2,
        familyId: 'family-1',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Simulate existing vote
      mockPrisma.weeklyVote.findFirst.mockResolvedValue({
        id: 'vote-1',
        familyId: 'family-1',
        dishId: 'dish-1',
        suggestedDishName: null,
        voterId: 'user-1',
        weekStart: new Date('2026-01-26'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', { dishId: 'dish-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data.error).toBe('You have already voted for this dish this week')
    })
  })

  describe('DELETE /api/votes/[id]', () => {
    it('should return 404 if vote not found or not users vote', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.weeklyVote.findFirst.mockResolvedValue(null)

      const request = new Request('http://localhost/api/votes/vote-999', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: 'vote-999' }) })
      const { status, data } = await parseResponse(response)

      expect(status).toBe(404)
      expect(data.error).toBe('Vote not found or not yours to delete')
    })

    it('should successfully delete users own vote', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.weeklyVote.findFirst.mockResolvedValue({
        id: 'vote-1',
        familyId: 'family-1',
        dishId: null,
        suggestedDishName: 'Sushi Night',
        voterId: 'user-1',
        weekStart: new Date('2026-01-26'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.weeklyVote.delete.mockResolvedValue({
        id: 'vote-1',
        familyId: 'family-1',
        dishId: null,
        suggestedDishName: 'Sushi Night',
        voterId: 'user-1',
        weekStart: new Date('2026-01-26'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new Request('http://localhost/api/votes/vote-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: 'vote-1' }) })
      const { status, data } = await parseResponse<{ success: boolean }>(response)

      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.weeklyVote.delete).toHaveBeenCalledWith({
        where: { id: 'vote-1' },
      })
    })

    it('should decrement dish totalVotes when vote was for an existing dish', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.weeklyVote.findFirst.mockResolvedValue({
        id: 'vote-1',
        familyId: 'family-1',
        dishId: 'dish-1',
        suggestedDishName: null,
        voterId: 'user-1',
        weekStart: new Date('2026-01-26'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.dish.update.mockResolvedValue({
        id: 'dish-1',
        name: 'Beef Stir Fry',
        photoUrl: 'https://example.com/beef.jpg',
        totalVotes: 2,
        familyId: 'family-1',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.weeklyVote.delete.mockResolvedValue({
        id: 'vote-1',
        familyId: 'family-1',
        dishId: 'dish-1',
        suggestedDishName: null,
        voterId: 'user-1',
        weekStart: new Date('2026-01-26'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new Request('http://localhost/api/votes/vote-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: 'vote-1' }) })
      const { status, data } = await parseResponse<{ success: boolean }>(response)

      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.dish.update).toHaveBeenCalledWith({
        where: { id: 'dish-1' },
        data: { totalVotes: { decrement: 1 } },
      })
    })
  })
})
