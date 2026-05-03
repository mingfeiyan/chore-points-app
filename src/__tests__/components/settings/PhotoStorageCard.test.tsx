import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession, signIn } from 'next-auth/react'
import PhotoStorageCard from '@/components/settings/PhotoStorageCard'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// PhotoProvider enum is read at render time; jsdom env doesn't run the
// generated Prisma client.
vi.mock('@prisma/client', () => ({
  PhotoProvider: {
    NONE: 'NONE',
    VERCEL_BLOB: 'VERCEL_BLOB',
    GOOGLE_DRIVE: 'GOOGLE_DRIVE',
  },
}))

// Default useSession is unauthenticated (per setup.ts). Override per test.
const useSessionMock = useSession as ReturnType<typeof vi.fn>
const signInMock = signIn as ReturnType<typeof vi.fn>

global.fetch = vi.fn()

function withDriveSession() {
  useSessionMock.mockReturnValue({
    data: {
      user: {
        id: 'user-1',
        email: 'parent@example.com',
        role: 'PARENT',
        familyId: 'fam-1',
        photoProvider: 'GOOGLE_DRIVE',
      },
    },
    status: 'authenticated',
    update: vi.fn(),
  })
}

describe('PhotoStorageCard — Drive reconnect path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ family: { googleDriveConnectedAt: null } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
  })

  it('exposes a Reconnect button when Drive is connected', async () => {
    withDriveSession()
    render(<PhotoStorageCard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'reconnectDrive' })).toBeInTheDocument()
    })
  })

  it('clicking Reconnect triggers Google sign-in returning to /settings', async () => {
    withDriveSession()
    render(<PhotoStorageCard />)
    const btn = await screen.findByRole('button', { name: 'reconnectDrive' })
    await userEvent.click(btn)
    expect(signInMock).toHaveBeenCalledWith('google', {
      callbackUrl: '/settings?pendingDrive=1',
    })
  })

  it('connect handler treats 401 needsReauthorize the same as 409 (matches new classifyDriveError contract)', async () => {
    // Session starts on NONE so the Connect button is rendered.
    useSessionMock.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          email: 'parent@example.com',
          role: 'PARENT',
          familyId: 'fam-1',
          photoProvider: 'NONE',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    })
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ needsReauthorize: true }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    )

    render(<PhotoStorageCard />)
    const btn = await screen.findByRole('button', { name: 'connectDrive' })
    await userEvent.click(btn)

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('google', {
        callbackUrl: '/settings?pendingDrive=1',
      })
    })
  })
})
