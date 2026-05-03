import { describe, it, expect } from 'vitest'
import { classifyDriveError } from '@/lib/google-drive'

describe('classifyDriveError', () => {
  it('returns null for unknown errors', () => {
    expect(classifyDriveError(new Error('some random failure'))).toBeNull()
    expect(classifyDriveError('plain string')).toBeNull()
  })

  it('flags Drive API not enabled (503)', () => {
    const r = classifyDriveError(new Error('Drive search failed: SERVICE_DISABLED'))
    expect(r?.status).toBe(503)
    expect(r?.body.error).toMatch(/Drive API/)
  })

  it('flags revoked refresh tokens as reauthorize-required (401)', () => {
    // Surface from getValidAccessToken when refresh fails
    const r = classifyDriveError(
      new Error('Failed to refresh token: {"error":"invalid_grant"}')
    )
    expect(r?.status).toBe(401)
    expect(r?.body.needsReauthorize).toBe(true)
    expect(r?.body.error).toMatch(/reconnect/i)
  })

  it('flags missing Google account as reauthorize-required (401)', () => {
    const r = classifyDriveError(new Error('No Google account found for user'))
    expect(r?.status).toBe(401)
    expect(r?.body.needsReauthorize).toBe(true)
  })

  it('flags missing refresh token as reauthorize-required (401)', () => {
    const r = classifyDriveError(new Error('No refresh token available'))
    expect(r?.status).toBe(401)
    expect(r?.body.needsReauthorize).toBe(true)
  })
})
