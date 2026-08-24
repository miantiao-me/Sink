import type { H3Event } from 'h3'
import type { JWTVerifyGetKey } from 'jose'
import { createRemoteJWKSet, jwtVerify } from 'jose'

interface CloudflareAccessConfig {
  audience: string
  issuer: string
}

export type CloudflareAccessIdentity
  = | {
    kind: 'user'
    userID: string
    userEmail: string
  }
  | {
    kind: 'service'
  }

export type CloudflareAccessAuth
  = | {
    authMethod: 'access-user'
    userID: string
    userEmail: string
  }
  | {
    authMethod: 'access-service'
    userID: 'root'
    userEmail: string
  }

const jwksByTeamDomain = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getAccessTokens(event: H3Event): string[] {
  return [...new Set([
    getHeader(event, 'Cf-Access-Jwt-Assertion'),
    getCookie(event, 'CF_Authorization'),
  ].filter((token): token is string => !!token))]
}

function getJwks(teamDomain: string) {
  const cachedJwks = jwksByTeamDomain.get(teamDomain)
  if (cachedJwks)
    return cachedJwks

  const certsUrl = new URL('/cdn-cgi/access/certs', `${teamDomain}/`)
  const jwks = createRemoteJWKSet(certsUrl)
  jwksByTeamDomain.set(teamDomain, jwks)
  return jwks
}

export async function verifyCloudflareAccessToken(
  token: string,
  config: CloudflareAccessConfig,
  getKey?: JWTVerifyGetKey,
): Promise<CloudflareAccessIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, getKey || getJwks(config.issuer), {
      algorithms: ['RS256'],
      audience: config.audience,
      issuer: config.issuer,
      requiredClaims: ['exp'],
    })

    if (payload.type !== 'app')
      return null

    const userID = typeof payload.sub === 'string' ? payload.sub.trim() : ''
    const userEmail = typeof payload.email === 'string' ? payload.email.trim() : ''
    const commonName = typeof payload.common_name === 'string' ? payload.common_name.trim() : ''

    if (userID && userEmail && payload.common_name === undefined) {
      return {
        kind: 'user',
        userID,
        userEmail,
      }
    }

    if (payload.sub === '' && payload.email === undefined && commonName) {
      return {
        kind: 'service',
      }
    }

    return null
  }
  catch {
    return null
  }
}

export function mapCloudflareAccessIdentity(
  identity: CloudflareAccessIdentity,
  hostname: string,
): CloudflareAccessAuth {
  if (identity.kind === 'user') {
    return {
      authMethod: 'access-user',
      userID: identity.userID,
      userEmail: identity.userEmail,
    }
  }

  return {
    authMethod: 'access-service',
    userID: 'root',
    userEmail: `root@${hostname}`,
  }
}

export async function verifyCloudflareAccess(event: H3Event): Promise<CloudflareAccessIdentity | null> {
  const { cfAccessTeamDomain, cfAccessAud } = useRuntimeConfig(event)
  const issuer = cfAccessTeamDomain.trim().replace(/\/+$/, '')
  const audience = cfAccessAud.trim()
  if (!issuer || !audience)
    return null

  for (const token of getAccessTokens(event)) {
    const identity = await verifyCloudflareAccessToken(token, { audience, issuer })
    if (identity)
      return identity
  }

  return null
}

export function isCloudflareAccessConfigured(teamDomain: string, audience: string): boolean {
  return !!teamDomain.trim() && !!audience.trim()
}

export function isCloudflareAccessRequestAllowed(event: H3Event): boolean {
  return isCloudflareAccessRequestSafe({
    method: event.method,
    hasAccessCookie: !!getCookie(event, 'CF_Authorization'),
    origin: getHeader(event, 'Origin'),
    requestOrigin: getRequestURL(event).origin,
    secFetchSite: getHeader(event, 'Sec-Fetch-Site'),
  })
}

interface CloudflareAccessRequest {
  method: string
  hasAccessCookie?: boolean
  origin?: string
  requestOrigin: string
  secFetchSite?: string
}

export function isCloudflareAccessRequestSafe(request: CloudflareAccessRequest): boolean {
  if (request.secFetchSite === 'cross-site')
    return false

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method))
    return true

  if (request.origin)
    return request.origin === request.requestOrigin

  return !request.hasAccessCookie
}
