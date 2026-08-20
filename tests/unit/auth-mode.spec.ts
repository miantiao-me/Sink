import type { H3Event } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthenticationMode } from '../../server/utils/oidc'

describe('authentication mode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses single-user mode when OIDC is not configured', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({}))

    expect(getAuthenticationMode(eventWithEnv())).toBe('single-user')
  })

  it('uses OIDC mode when all required settings are configured', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      oidcIssuer: 'https://identity.example.com',
      oidcClientId: 'sink',
      oidcClientSecret: 'secret',
      oidcSessionSecret: 'session-secret',
    }))

    expect(getAuthenticationMode(eventWithEnv())).toBe('oidc')
  })

  it('rejects partial OIDC configuration instead of falling back to single-user mode', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      oidcIssuer: 'https://identity.example.com',
    }))

    expect(() => getAuthenticationMode(eventWithEnv())).toThrowError(expect.objectContaining({
      statusCode: 500,
      statusMessage: 'OIDC configuration is incomplete: NUXT_OIDC_CLIENT_ID, NUXT_OIDC_CLIENT_SECRET, NUXT_OIDC_SESSION_SECRET',
    }))
  })
})

function eventWithEnv(env: Record<string, string> = {}): H3Event {
  return {
    context: { cloudflare: { env } },
  } as unknown as H3Event
}
