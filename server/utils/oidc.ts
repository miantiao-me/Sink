import type { H3Event } from 'h3'
import type { IDToken, UserInfoResponse } from 'openid-client'
import { createError, getRequestURL } from 'h3'
import * as client from 'openid-client'

interface OidcRuntimeConfig {
  issuer: string
  clientId: string
  clientSecret: string
  redirectUri: string
  sessionTtlSeconds: number
}

export type AuthenticationMode = 'single-user' | 'oidc'

const requiredOidcSettings: Array<[string, string]> = [
  ['oidcIssuer', 'NUXT_OIDC_ISSUER'],
  ['oidcClientId', 'NUXT_OIDC_CLIENT_ID'],
  ['oidcClientSecret', 'NUXT_OIDC_CLIENT_SECRET'],
  ['oidcSessionSecret', 'NUXT_OIDC_SESSION_SECRET'],
]

const configurations = new Map<string, Promise<client.Configuration>>()

export async function getOidcConfiguration(event: H3Event): Promise<client.Configuration> {
  const runtime = getOidcRuntimeConfig(event)
  const cacheKey = `${runtime.issuer}\n${runtime.clientId}`
  const cached = configurations.get(cacheKey)
  if (cached)
    return await cached

  const pending = client.discovery(
    new URL(runtime.issuer),
    runtime.clientId,
    {
      client_secret: runtime.clientSecret,
      redirect_uris: [runtime.redirectUri],
      response_types: ['code'],
    },
    client.ClientSecretBasic(runtime.clientSecret),
    {
      execute: [
        client.enableNonRepudiationChecks,
        ...(allowInsecureRequests(event) ? [client.allowInsecureRequests] : []),
      ],
      timeout: 10,
    },
  ).catch((error) => {
    configurations.delete(cacheKey)
    throw error
  })
  configurations.set(cacheKey, pending)
  return await pending
}

export function getOidcRuntimeConfig(event: H3Event): OidcRuntimeConfig {
  const issuer = requiredConfig(event, 'oidcIssuer', 'NUXT_OIDC_ISSUER').replace(/\/$/, '')
  const clientId = requiredConfig(event, 'oidcClientId', 'NUXT_OIDC_CLIENT_ID')
  const clientSecret = requiredConfig(event, 'oidcClientSecret', 'NUXT_OIDC_CLIENT_SECRET')
  const requestOrigin = getRequestURL(event).origin
  const redirectUri = configString(event, 'oidcRedirectUri', 'NUXT_OIDC_REDIRECT_URI')
    || `${requestOrigin}/api/auth/callback`
  const configuredTtl = Number(configValue(event, 'oidcSessionTtlSeconds') || cloudflareString(event, 'NUXT_OIDC_SESSION_TTL_SECONDS'))

  return {
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    sessionTtlSeconds: Number.isSafeInteger(configuredTtl) && configuredTtl > 0 ? configuredTtl : 8 * 60 * 60,
  }
}

export function isOidcConfigured(event: H3Event): boolean {
  return getAuthenticationMode(event) === 'oidc'
}

export function getAuthenticationMode(event: H3Event): AuthenticationMode {
  const configured = requiredOidcSettings.filter(([key, envKey]) => configString(event, key, envKey))
  if (configured.length === 0)
    return 'single-user'

  const missing = requiredOidcSettings
    .filter(([key, envKey]) => !configString(event, key, envKey))
    .map(([, envKey]) => envKey)
  if (missing.length) {
    throw createError({
      status: 500,
      statusText: `OIDC configuration is incomplete: ${missing.join(', ')}`,
    })
  }

  return 'oidc'
}

export function normalizeOidcReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
    return '/dashboard'

  return value.startsWith('/dashboard') ? value : '/dashboard'
}

export function oidcUserFromClaims(claims: IDToken, userInfo?: UserInfoResponse) {
  const email = stringClaim(userInfo?.email) ?? stringClaim(claims.email)
  if (!email) {
    throw createError({
      status: 401,
      statusText: 'OIDC identity does not contain an email address',
    })
  }

  return {
    id: claims.sub,
    email,
    name: stringClaim(userInfo?.name)
      ?? stringClaim(claims.name)
      ?? stringClaim(userInfo?.preferred_username)
      ?? stringClaim(claims.preferred_username),
  }
}

export function oidcSessionExpiration(event: H3Event, claims: IDToken): number {
  const providerExpiration = claims.exp
  const configuredExpiration = Math.floor(Date.now() / 1000) + getOidcRuntimeConfig(event).sessionTtlSeconds
  return Math.min(providerExpiration, configuredExpiration)
}

function requiredConfig(event: H3Event, key: string, envKey: string): string {
  const value = configString(event, key, envKey)
  if (!value) {
    throw createError({
      status: 500,
      statusText: `${envKey} is not configured`,
    })
  }
  return value
}

function configString(event: H3Event, key: string, envKey: string): string {
  const value = configValue(event, key)
  return (typeof value === 'string' ? value.trim() : '') || cloudflareString(event, envKey)
}

function configValue(event: H3Event, key: string): unknown {
  return (useRuntimeConfig(event) as unknown as Record<string, unknown>)[key]
}

function cloudflareString(event: H3Event, key: string): string {
  const env = event.context.cloudflare?.env as unknown as Record<string, unknown> | undefined
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function allowInsecureRequests(event: H3Event): boolean {
  return configValue(event, 'oidcAllowInsecure') === true
    || cloudflareString(event, 'NUXT_OIDC_ALLOW_INSECURE') === 'true'
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

export { client as oidcClient }
