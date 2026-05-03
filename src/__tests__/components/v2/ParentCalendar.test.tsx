import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ParentCalendar from '@/components/v2/parent/ParentCalendar'

// next-intl is used by CalendarConnectionCard
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// ParentTabBar pulls in next/link + next/navigation; usePathname is already
// mocked in setup.ts but Link needs a stub.
vi.mock('@/components/v2/ParentTabBar', () => ({
  default: () => null,
}))

// CalendarEventForm is heavy and unrelated to the regression we're testing.
vi.mock('@/components/calendar/CalendarEventForm', () => ({
  default: () => null,
}))

global.fetch = vi.fn()

function mockFetchByPath(map: Record<string, { status: number; body: unknown }>) {
  ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
    async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.toString()
      for (const [path, resp] of Object.entries(map)) {
        if (url.startsWith(path)) {
          return new Response(JSON.stringify(resp.body), {
            status: resp.status,
            headers: { 'content-type': 'application/json' },
          })
        }
      }
      throw new Error(`unmocked fetch: ${url}`)
    }
  )
}

describe('ParentCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([401, 403])(
    'surfaces the reconnect card when /api/calendar/events returns %s',
    async (errStatus) => {
      mockFetchByPath({
        '/api/family/kids': { status: 200, body: { kids: [] } },
        '/api/family/parents': { status: 200, body: { parents: [] } },
        '/api/calendar/settings': {
          status: 200,
          body: {
            settings: {
              isConnected: true,
              selectedCalendarId: 'cal-1',
              selectedCalendarName: 'Personal',
            },
          },
        },
        '/api/calendar/events': { status: errStatus, body: { error: 'expired' } },
        '/api/calendar/calendars': { status: errStatus, body: { error: 'expired' } },
      })

      render(<ParentCalendar />)

      await waitFor(() => {
        expect(screen.getByText('connectCalendar')).toBeInTheDocument()
      })
    }
  )

  it('surfaces the reconnect card when /api/calendar/events returns 401, even if settings says isConnected', async () => {
    mockFetchByPath({
      '/api/family/kids': { status: 200, body: { kids: [] } },
      '/api/family/parents': { status: 200, body: { parents: [] } },
      '/api/calendar/settings': {
        status: 200,
        body: {
          settings: {
            isConnected: true,
            selectedCalendarId: 'cal-1',
            selectedCalendarName: 'Personal',
          },
        },
      },
      '/api/calendar/events': {
        status: 401,
        body: { error: 'Google calendar access has expired. Please reconnect the calendar.' },
      },
      // CalendarConnectionCard mounts and probes /calendars; mirror the same
      // 401 so the card shows its needs-reauth state.
      '/api/calendar/calendars': {
        status: 401,
        body: { error: 'Please sign in with Google to access calendars' },
      },
    })

    render(<ParentCalendar />)

    // The connection card should appear because isConnected got flipped to
    // false on the 401. Its "connectCalendar" heading is the cleanest anchor.
    await waitFor(() => {
      expect(screen.getByText('connectCalendar')).toBeInTheDocument()
    })
  })
})
