import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    family: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

import { prisma } from '@/lib/db'
import {
  getHueAccessToken,
  exchangeCodeForTokens,
  refreshHueToken,
  HUE_OAUTH_URL,
  HUE_API_URL,
} from '@/lib/hue'

const mockPrisma = vi.mocked(prisma)

describe('Hue API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('getHueAccessToken', () => {
    it('should return existing token if not expired', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        hueAccessToken: 'valid-token',
        hueRefreshToken: 'refresh-token',
        hueTokenExpiry: futureDate,
        hueUsername: 'hue-user',
      } as any)

      const result = await getHueAccessToken('family-1')

      expect(result).toEqual({
        accessToken: 'valid-token',
        username: 'hue-user',
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should refresh token if expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000) // 1 minute ago
      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        hueAccessToken: 'expired-token',
        hueRefreshToken: 'refresh-token',
        hueTokenExpiry: pastDate,
        hueUsername: 'hue-user',
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-token',
          refresh_token: 'new-refresh',
          expires_in: 604800,
        }),
      })

      mockPrisma.family.update.mockResolvedValue({} as any)

      const result = await getHueAccessToken('family-1')

      expect(result).toEqual({
        accessToken: 'new-token',
        username: 'hue-user',
      })
      expect(mockPrisma.family.update).toHaveBeenCalled()
    })

    it('should return null if no Hue connection', async () => {
      mockPrisma.family.findUnique.mockResolvedValue({
        id: 'family-1',
        hueAccessToken: null,
        hueRefreshToken: null,
        hueTokenExpiry: null,
        hueUsername: null,
      } as any)

      const result = await getHueAccessToken('family-1')

      expect(result).toBeNull()
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should exchange auth code for tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 604800,
        }),
      })

      const result = await exchangeCodeForTokens('auth-code')

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 604800,
      })
    })

    it('should throw on failed exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid code'),
      })

      await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow(
        'Failed to exchange code for tokens'
      )
    })
  })
})
