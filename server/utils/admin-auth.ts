import type { H3Event } from 'h3'
import { createError } from 'h3'

export function assertSiteAdministrator(event: H3Event): void {
  if (isSiteAdministrator(event))
    return

  throw createError({
    status: 403,
    statusText: 'Administrator access required',
  })
}

export function isSiteAdministrator(event: H3Event): boolean {
  if (event.context.authMethod === 'site-token' && event.context.userID === 'root')
    return true

  if (event.context.authMethod !== 'oidc-session' || !event.context.userEmail)
    return false

  const { siteAdminEmails } = useRuntimeConfig(event)
  const administrators = String(siteAdminEmails)
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)

  return administrators.includes(event.context.userEmail.trim().toLowerCase())
}
