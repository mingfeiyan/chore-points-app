import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '../../helpers/api-test-utils'
import { Role } from '@prisma/client'

// Mock session
let mockSession: { user: { id: string; email: string; role: Role; familyId: string | null } } | null = null

vi.mock('@/lib/permissions', () => ({
  requireFamily: vi.fn(() => {
    if (!mockSession) throw new Error('Unauthorized')
    if (!mockSession.user.familyId) throw new Error('Forbidden: Must be part of a family')
    return mockSession
  }),
}))

// Mock badge evaluator to avoid complex badge logic in points tests
vi.mock('@/lib/badge-evaluator', () => ({
  evaluateAndAwardBadges: vi.fn(() => Promise.resolve([])),
}))

// Mock Prisma - define inside the factory to avoid hoisting issues
vi.mock('@/lib/db', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      chore: {
        findUnique: vi.fn(),
      },
      pointEntry: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
    }
  }
})

// Get reference to mocked prisma for test assertions
import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

// Import after mocks
import { GET, POST } from '@/app/api/points/route'

describe('Points API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/points', () => {
    it('should return 401 if not authenticated', async () => {
      const request = createMockRequest('GET', undefined, {
        url: 'http://localhost:3000/api/points?kidId=kid-1',
      })
      const response = await GET(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(401)
      expect(data).toHaveProperty('error')
    })

    it('should return 400 if kidId is missing for parent', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('GET', undefined, {
        url: 'http://localhost:3000/api/points',
      })
      const response = await GET(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'kidId parameter required for parents')
    })

    it('should use own ID for kid users', async () => {
      mockSession = {
        user: {
          id: 'kid-1',
          email: 'kid@example.com',
          role: Role.KID,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'kid-1',
        name: 'Test Kid',
        email: 'kid@example.com',
        role: Role.KID,
        familyId: 'family-1',
      })

      mockPrisma.pointEntry.findMany.mockResolvedValue([
        { id: 'entry-1', points: 5, date: new Date() },
        { id: 'entry-2', points: 3, date: new Date() },
      ])

      const request = createMockRequest('GET', undefined, {
        url: 'http://localhost:3000/api/points',
      })
      const response = await GET(request)
      const { status, data } = await parseResponse<{ totalPoints: number }>(response)

      expect(status).toBe(200)
      expect(data.totalPoints).toBe(8)
    })

    it('should return 404 if kid not found', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = createMockRequest('GET', undefined, {
        url: 'http://localhost:3000/api/points?kidId=nonexistent',
      })
      const response = await GET(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(404)
      expect(data).toHaveProperty('error', 'Kid not found or not in your family')
    })

    it('should return 404 if kid is in different family', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'kid-other',
        familyId: 'other-family', // Different family
      })

      const request = createMockRequest('GET', undefined, {
        url: 'http://localhost:3000/api/points?kidId=kid-other',
      })
      const response = await GET(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(404)
      expect(data).toHaveProperty('error', 'Kid not found or not in your family')
    })

    it('should return points and entries for valid kid', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'kid-1',
        name: 'Test Kid',
        email: 'kid@example.com',
        familyId: 'family-1',
      })

      mockPrisma.pointEntry.findMany.mockResolvedValue([
        { id: 'entry-1', points: 10, date: new Date(), chore: { title: 'Clean room' } },
        { id: 'entry-2', points: -5, date: new Date(), redemption: { reward: { title: 'Ice cream' } } },
      ])

      const request = createMockRequest('GET', undefined, {
        url: 'http://localhost:3000/api/points?kidId=kid-1',
      })
      const response = await GET(request)
      const { status, data } = await parseResponse<{ totalPoints: number; entries: unknown[]; kid: { id: string } }>(response)

      expect(status).toBe(200)
      expect(data.totalPoints).toBe(5) // 10 - 5
      expect(data.entries).toHaveLength(2)
      expect(data.kid.id).toBe('kid-1')
    })
  })

  describe('POST /api/points', () => {
    it('should return 403 if user is not a parent', async () => {
      mockSession = {
        user: {
          id: 'kid-1',
          email: 'kid@example.com',
          role: Role.KID,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { kidId: 'kid-1', points: 5 })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(403)
      expect(data).toHaveProperty('error', 'Only parents can add points')
    })

    it('should return 400 if kidId is missing', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { points: 5 })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'kidId and points are required')
    })

    it('should return 400 if points is missing', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { kidId: 'kid-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'kidId and points are required')
    })

    it('should return 400 if points is not a number', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { kidId: 'kid-1', points: 'five' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'points must be a number')
    })

    it('should return 400 for invalid kid', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = createMockRequest('POST', { kidId: 'invalid-kid', points: 5 })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid kid')
    })

    it('should return 400 if kid is not in same family', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'kid-other',
        role: Role.KID,
        familyId: 'other-family',
      })

      const request = createMockRequest('POST', { kidId: 'kid-other', points: 5 })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid kid')
    })

    it('should return 400 if user is not a kid', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        role: Role.PARENT, // Not a kid
        familyId: 'family-1',
      })

      const request = createMockRequest('POST', { kidId: 'user-2', points: 5 })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid kid')
    })

    it('should return 400 for invalid chore', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'kid-1',
        role: Role.KID,
        familyId: 'family-1',
      })

      mockPrisma.chore.findUnique.mockResolvedValue(null)

      const request = createMockRequest('POST', { kidId: 'kid-1', points: 5, choreId: 'invalid-chore' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid chore')
    })

    it('should create point entry successfully', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'kid-1',
        role: Role.KID,
        familyId: 'family-1',
      })

      mockPrisma.pointEntry.create.mockResolvedValue({
        id: 'new-entry-id',
        points: 5,
        note: 'Good job!',
        familyId: 'family-1',
        kidId: 'kid-1',
        chore: { title: 'Clean room' },
        createdBy: { name: 'Parent', email: 'test@example.com' },
        updatedBy: { name: 'Parent', email: 'test@example.com' },
      })

      const request = createMockRequest('POST', { kidId: 'kid-1', points: 5, note: 'Good job!' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ pointEntry: { id: string; points: number } }>(response)

      expect(status).toBe(201)
      expect(data.pointEntry).toBeDefined()
      expect(data.pointEntry.points).toBe(5)
    })

    it('should allow negative points (for deductions)', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'kid-1',
        role: Role.KID,
        familyId: 'family-1',
      })

      mockPrisma.pointEntry.create.mockResolvedValue({
        id: 'new-entry-id',
        points: -10,
        note: 'Behavior adjustment',
        familyId: 'family-1',
        kidId: 'kid-1',
        createdBy: { name: 'Parent', email: 'test@example.com' },
        updatedBy: { name: 'Parent', email: 'test@example.com' },
      })

      const request = createMockRequest('POST', { kidId: 'kid-1', points: -10, note: 'Behavior adjustment' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ pointEntry: { points: number } }>(response)

      expect(status).toBe(201)
      expect(data.pointEntry.points).toBe(-10)
    })
  })
})
