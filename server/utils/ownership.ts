import type { H3Event } from 'h3'
import { createError } from 'h3'

export type OwnerScope = { admin: true } | { admin: false, email: string }

function getAdminEmails(event: H3Event): Set<string> {
  const { adminEmails } = useRuntimeConfig(event)
  return new Set(
    adminEmails
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isAdmin(event: H3Event): boolean {
  const authMethod = event.context.authMethod
  if (authMethod === 'site-token' || authMethod === 'access-service')
    return true

  const userEmail = event.context.userEmail
  if (typeof userEmail !== 'string' || !userEmail)
    return false

  return getAdminEmails(event).has(userEmail.toLowerCase())
}

export function getOwnerScope(event: H3Event): OwnerScope {
  if (isAdmin(event))
    return { admin: true }

  const userEmail = event.context.userEmail
  return { admin: false, email: typeof userEmail === 'string' ? userEmail.toLowerCase() : '' }
}

/**
 * The owner to stamp on a newly created link. The synthetic `root` identity
 * (site-token or access-service auth) stamps no owner, matching how
 * pre-migration legacy links are unassigned and admin-only.
 */
export function ownerEmailForNewLink(event: H3Event): string | null {
  if (event.context.userID === 'root')
    return null

  const userEmail = event.context.userEmail
  return typeof userEmail === 'string' && userEmail ? userEmail.toLowerCase() : null
}

export function canAccessLink(event: H3Event, link: { ownerEmail: string | null }): boolean {
  const scope = getOwnerScope(event)
  if (scope.admin)
    return true

  return !!link.ownerEmail && link.ownerEmail.toLowerCase() === scope.email
}

/** Throws a 404 (not 403) so a link's existence is never revealed to a caller who cannot access it. */
export function assertCanAccessLink(event: H3Event, link: { ownerEmail: string | null }): void {
  if (!canAccessLink(event, link)) {
    throw createError({
      status: 404,
      statusText: 'Not Found',
    })
  }
}
