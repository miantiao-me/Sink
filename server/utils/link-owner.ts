import type { H3Event } from 'h3'
import { createError } from 'h3'

export function getCurrentLinkOwnerId(event: H3Event): string {
  if (event.context.authMethod !== 'oidc-session')
    return 'root'

  const ownerId = event.context.userID
  if (!ownerId) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }
  return ownerId
}

export function getCurrentLinkOwnerIds(event: H3Event): string[] {
  const ownerId = getCurrentLinkOwnerId(event)
  const aliases = parseOwnerAliases(configString(event, 'linkOwnerAliases', 'NUXT_LINK_OWNER_ALIASES'))
  return [...new Set([ownerId, ...(aliases[ownerId] ?? [])])]
}

function parseOwnerAliases(value: string): Record<string, string[]> {
  if (!value)
    return {}

  try {
    const parsed = JSON.parse(value) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      throw new Error('Owner aliases must be an object')

    return Object.fromEntries(Object.entries(parsed).map(([ownerId, aliases]) => {
      if (!Array.isArray(aliases) || aliases.some(alias => typeof alias !== 'string' || !alias))
        throw new Error(`Owner aliases for ${ownerId} must be non-empty strings`)
      return [ownerId, aliases]
    }))
  }
  catch (cause) {
    throw createError({
      status: 500,
      statusText: 'NUXT_LINK_OWNER_ALIASES is invalid',
      cause,
    })
  }
}

function configString(event: H3Event, key: string, envKey: string): string {
  const config = useRuntimeConfig(event) as unknown as Record<string, unknown>
  const configured = config[key]
  if (typeof configured === 'string' && configured.trim())
    return configured.trim()

  const env = event.context.cloudflare?.env as unknown as Record<string, unknown> | undefined
  const value = env?.[envKey]
  return typeof value === 'string' ? value.trim() : ''
}
