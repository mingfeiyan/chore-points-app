import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '../../helpers/api-test-utils'

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  authRateLimiter: {
    check: vi.fn(() => ({ success: true, limit: 5, remaining: 4, resetTime: Date.now() + 60000 })),
  },
  checkRateLimit: vi.fn(() => null),
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
}))

// Mock Prisma - define inside the factory to avoid hoisting issues
vi.mock('@/lib/db', () => {
  const mockPrismaInternal = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    family: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(mockPrismaInternal)),
  }
  return { prisma: mockPrismaInternal }
})

// Get reference to mocked prisma for test assertions
import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

// Import after mocks
import { POST } from '@/app/api/auth/signup/route'

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset env vars
    delete process.env.REGISTRATION_SECRET
  })

  describe('validation', () => {
    it('should return 400 if email is missing', async () => {
      const request = createMockRequest('POST', { password: 'password123' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should return 400 if password is missing', async () => {
      const request = createMockRequest('POST', { email: 'test@example.com' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })
  })

  describe('user creation', () => {
    it('should return 400 if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      })

      const request = createMockRequest('POST', {
        email: 'test@example.com',
        password: 'password123',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'User with this email already exists')
    })

    it('should create a new parent user without family', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'PARENT',
        familyId: null,
      })

      const request = createMockRequest('POST', {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ user: { id: string; email: string } }>(response)

      expect(status).toBe(201)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('newuser@example.com')
    })

    it('should create user with family when valid invite code provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        inviteCode: 'VALID-CODE',
      })
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'PARENT',
        familyId: 'family-1',
      })

      const request = createMockRequest('POST', {
        email: 'newuser@example.com',
        password: 'password123',
        inviteCode: 'VALID-CODE',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ user: { familyId: string | null } }>(response)

      expect(status).toBe(201)
      expect(data.user.familyId).toBe('family-1')
    })

    it('should return 400 for invalid invite code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.family.findUnique.mockResolvedValue(null)

      const request = createMockRequest('POST', {
        email: 'newuser@example.com',
        password: 'password123',
        inviteCode: 'INVALID-CODE',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid invite code')
    })

    it('should create kid user with valid invite code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        inviteCode: 'VALID-CODE',
      })
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-kid-id',
        email: 'kid@example.com',
        name: 'Test Kid',
        role: 'KID',
        familyId: 'family-1',
      })

      const request = createMockRequest('POST', {
        email: 'kid@example.com',
        password: 'password123',
        role: 'KID',
        inviteCode: 'VALID-CODE',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ user: { role: string } }>(response)

      expect(status).toBe(201)
      expect(data.user.role).toBe('KID')
    })

    it('should require invite code for kid signup', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = createMockRequest('POST', {
        email: 'kid@example.com',
        password: 'password123',
        role: 'KID',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'Invite code is required for kid signup')
    })
  })

  describe('registration secret', () => {
    it('should require registration secret when configured', async () => {
      process.env.REGISTRATION_SECRET = 'secret123'
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = createMockRequest('POST', {
        email: 'newuser@example.com',
        password: 'password123',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error', 'Invalid registration code')
    })

    it('should allow signup with correct registration secret', async () => {
      process.env.REGISTRATION_SECRET = 'secret123'
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: null,
        role: 'PARENT',
        familyId: null,
      })

      const request = createMockRequest('POST', {
        email: 'newuser@example.com',
        password: 'password123',
        registrationSecret: 'secret123',
      })
      const response = await POST(request)
      const { status } = await parseResponse(response)

      expect(status).toBe(201)
    })
  })

})
