import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import { assertCanAccessLink, getOwnerScope, isAdmin } from '../../server/utils/ownership'

function fakeEvent(context: Partial<H3Event['context']>): H3Event {
  return { context } as H3Event
}

describe('isAdmin', () => {
  it('treats site-token auth as admin', () => {
    expect(isAdmin(fakeEvent({ authMethod: 'site-token', userEmail: 'root@localhost' }))).toBe(true)
  })

  it('treats access-service auth as admin', () => {
    expect(isAdmin(fakeEvent({ authMethod: 'access-service', userEmail: 'root@localhost' }))).toBe(true)
  })

  it('treats an access-user whose email is in NUXT_ADMIN_EMAILS as admin', () => {
    expect(isAdmin(fakeEvent({ authMethod: 'access-user', userEmail: 'admin@example.com' }))).toBe(true)
  })

  it('treats an access-user whose email is not in NUXT_ADMIN_EMAILS as non-admin', () => {
    expect(isAdmin(fakeEvent({ authMethod: 'access-user', userEmail: 'alice@example.com' }))).toBe(false)
  })

  it('matches admin emails case-insensitively', () => {
    expect(isAdmin(fakeEvent({ authMethod: 'access-user', userEmail: 'Admin@Example.com' }))).toBe(true)
  })
})

describe('getOwnerScope', () => {
  it('returns admin scope for an admin caller', () => {
    expect(getOwnerScope(fakeEvent({ authMethod: 'site-token', userEmail: 'root@localhost' })))
      .toEqual({ admin: true })
  })

  it('returns a lowercased email scope for a non-admin caller', () => {
    expect(getOwnerScope(fakeEvent({ authMethod: 'access-user', userEmail: 'Alice@Example.com' })))
      .toEqual({ admin: false, email: 'alice@example.com' })
  })
})

describe('assertCanAccessLink', () => {
  it('allows an admin to access any link, including an unassigned one', () => {
    const adminEvent = fakeEvent({ authMethod: 'site-token', userEmail: 'root@localhost' })
    expect(() => assertCanAccessLink(adminEvent, { ownerEmail: null })).not.toThrow()
    expect(() => assertCanAccessLink(adminEvent, { ownerEmail: 'alice@example.com' })).not.toThrow()
  })

  it('allows a non-admin to access their own link', () => {
    const aliceEvent = fakeEvent({ authMethod: 'access-user', userEmail: 'alice@example.com' })
    expect(() => assertCanAccessLink(aliceEvent, { ownerEmail: 'alice@example.com' })).not.toThrow()
  })

  it('denies a non-admin access to another user\'s link with a 404, not a 403', () => {
    const aliceEvent = fakeEvent({ authMethod: 'access-user', userEmail: 'alice@example.com' })
    try {
      assertCanAccessLink(aliceEvent, { ownerEmail: 'bob@example.com' })
      expect.unreachable('expected assertCanAccessLink to throw')
    }
    catch (error) {
      expect((error as { statusCode?: number }).statusCode).toBe(404)
    }
  })

  it('denies a non-admin access to an unassigned link with a 404', () => {
    const aliceEvent = fakeEvent({ authMethod: 'access-user', userEmail: 'alice@example.com' })
    try {
      assertCanAccessLink(aliceEvent, { ownerEmail: null })
      expect.unreachable('expected assertCanAccessLink to throw')
    }
    catch (error) {
      expect((error as { statusCode?: number }).statusCode).toBe(404)
    }
  })
})
