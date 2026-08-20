import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertSiteAdministrator, isSiteAdministrator } from '../../server/utils/admin-auth'

describe('site administrator authorization', () => {
  beforeEach(() => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      siteAdminEmails: ' admin@example.com,OWNER@example.com ',
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('allows the root site-token identity', () => {
    expect(isSiteAdministrator(eventWithIdentity('site-token', 'root', 'root@example.com'))).toBe(true)
    expect(() => assertSiteAdministrator(eventWithIdentity('site-token', 'root', 'root@example.com'))).not.toThrow()
  })

  it('allows configured OIDC administrators case-insensitively', () => {
    expect(isSiteAdministrator(eventWithIdentity('oidc-session', 'test-user', 'owner@example.com'))).toBe(true)
    expect(() => assertSiteAdministrator(eventWithIdentity('oidc-session', 'test-user', 'OWNER@example.com'))).not.toThrow()
  })

  it('rejects identities outside the administrator allowlist', () => {
    expect(isSiteAdministrator(eventWithIdentity('oidc-session', 'root', 'user@example.com'))).toBe(false)
    expect(() => assertSiteAdministrator(eventWithIdentity('oidc-session', 'test-user', 'user@example.com'))).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    )
    expect(() => assertSiteAdministrator(eventWithIdentity('access-user', 'test-user', 'admin@example.com'))).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    )
  })
})

function eventWithIdentity(authMethod: string, userID: string, userEmail: string): H3Event {
  return {
    context: { authMethod, userID, userEmail },
  } as H3Event
}
