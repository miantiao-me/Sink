import type { H3Event } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentLinkOwnerId, getCurrentLinkOwnerIds } from '../../server/utils/link-owner'

describe('link owner identities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the authenticated subject as the canonical owner', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ linkOwnerAliases: '' }))
    const event = eventWithOwner('current-subject')

    expect(getCurrentLinkOwnerId(event)).toBe('current-subject')
    expect(getCurrentLinkOwnerIds(event)).toEqual(['current-subject'])
  })

  it('uses the shared root owner outside OIDC mode', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ linkOwnerAliases: '' }))

    expect(getCurrentLinkOwnerId(eventWithOwner('access-user', 'access-subject'))).toBe('root')
    expect(getCurrentLinkOwnerIds(eventWithOwner('access-user', 'access-subject'))).toEqual(['root'])
  })

  it('includes configured prior owner IDs without duplicates', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      linkOwnerAliases: JSON.stringify({
        'current-subject': ['previous-subject', 'current-subject', 'previous-subject'],
      }),
    }))

    expect(getCurrentLinkOwnerIds(eventWithOwner('current-subject'))).toEqual([
      'current-subject',
      'previous-subject',
    ])
  })

  it('reads aliases from the Worker environment when runtime config is empty', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ linkOwnerAliases: '' }))
    const event = eventWithOwner('current-subject', {
      NUXT_LINK_OWNER_ALIASES: '{"current-subject":["previous-subject"]}',
    })

    expect(getCurrentLinkOwnerIds(event)).toEqual(['current-subject', 'previous-subject'])
  })

  it('fails closed when alias configuration is invalid', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ linkOwnerAliases: '{"current-subject":"previous-subject"}' }))

    expect(() => getCurrentLinkOwnerIds(eventWithOwner('current-subject'))).toThrowError(
      expect.objectContaining({ statusCode: 500 }),
    )
  })

  it('requires an authenticated owner', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ linkOwnerAliases: '' }))

    expect(() => getCurrentLinkOwnerId(eventWithOwner(''))).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    )
  })
})

function eventWithOwner(authMethod: string, userID: string, env?: Record<string, string>): H3Event
function eventWithOwner(userID: string, env?: Record<string, string>): H3Event
function eventWithOwner(authMethodOrUserID: string, userIDOrEnv: string | Record<string, string> = {}, explicitEnv: Record<string, string> = {}): H3Event {
  const hasExplicitAuthMethod = typeof userIDOrEnv === 'string'
  const authMethod = hasExplicitAuthMethod ? authMethodOrUserID : 'oidc-session'
  const userID = hasExplicitAuthMethod ? userIDOrEnv : authMethodOrUserID
  const env = hasExplicitAuthMethod ? explicitEnv : userIDOrEnv
  return {
    context: {
      authMethod,
      userID,
      cloudflare: { env },
    },
  } as H3Event
}
