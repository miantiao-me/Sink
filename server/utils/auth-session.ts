import type { H3Event } from 'h3'
import { createError, deleteCookie, getCookie, getHeader, getRequestURL, setCookie } from 'h3'

export const OIDC_SESSION_COOKIE = 'sink_session'
export const OIDC_TRANSACTION_COOKIE = 'sink_oidc'

export interface OidcSession {
  user: {
    id: string
    email: string
    name?: string
  }
  issuer: string
  expiresAt: number
}

export interface OidcTransaction {
  codeVerifier: string
  state: string
  nonce: string
  returnTo: string
  expiresAt: number
}

const encoder = new TextEncoder()

export async function setOidcTransaction(event: H3Event, transaction: OidcTransaction): Promise<void> {
  setCookie(event, OIDC_TRANSACTION_COOKIE, await sealPayload(event, transaction), cookieOptions(event, 10 * 60))
}

export async function takeOidcTransaction(event: H3Event): Promise<OidcTransaction | null> {
  const token = getCookie(event, OIDC_TRANSACTION_COOKIE)
  deleteCookie(event, OIDC_TRANSACTION_COOKIE, { path: '/' })
  if (!token)
    return null

  const transaction = await unsealPayload<OidcTransaction>(event, token)
  return transaction && transaction.expiresAt > nowInSeconds() ? transaction : null
}

export async function setOidcSession(event: H3Event, session: OidcSession): Promise<void> {
  const ttl = Math.max(1, session.expiresAt - nowInSeconds())
  setCookie(event, OIDC_SESSION_COOKIE, await sealPayload(event, session), cookieOptions(event, ttl))
}

export async function getOidcSession(event: H3Event): Promise<OidcSession | null> {
  const token = getCookie(event, OIDC_SESSION_COOKIE)
  if (!token)
    return null

  const session = await unsealPayload<OidcSession>(event, token)
  return session && session.expiresAt > nowInSeconds() ? session : null
}

export function clearOidcSession(event: H3Event): void {
  deleteCookie(event, OIDC_SESSION_COOKIE, { path: '/' })
}

export function oidcSessionAuth(session: OidcSession) {
  return {
    authMethod: 'oidc-session' as const,
    userID: session.user.id,
    userEmail: session.user.email,
  }
}

export function assertSameOriginUnsafeRequest(event: H3Event): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method))
    return

  const origin = getHeader(event, 'Origin')
  if (origin !== getRequestURL(event).origin) {
    throw createError({
      status: 403,
      statusText: 'Forbidden',
    })
  }
}

function cookieOptions(event: H3Event, maxAge: number) {
  return {
    httpOnly: true,
    secure: !allowInsecureCookies(event),
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

function allowInsecureCookies(event: H3Event): boolean {
  const configValue = useRuntimeConfig(event).oidcAllowInsecure
  const envValue = cloudflareString(event, 'NUXT_OIDC_ALLOW_INSECURE')
  return configValue === true || envValue === 'true'
}

async function sealPayload(event: H3Event, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(event),
    encoder.encode(JSON.stringify(value)),
  )
  return `${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`
}

async function unsealPayload<T>(event: H3Event, token: string): Promise<T | null> {
  try {
    const [encodedIv, encodedCiphertext] = token.split('.')
    if (!encodedIv || !encodedCiphertext)
      return null

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64UrlDecodeBytes(encodedIv) },
      await encryptionKey(event),
      base64UrlDecodeBytes(encodedCiphertext),
    )
    return JSON.parse(new TextDecoder().decode(plaintext)) as T
  }
  catch {
    return null
  }
}

async function encryptionKey(event: H3Event): Promise<CryptoKey> {
  const secret = configString(event, 'oidcSessionSecret', 'NUXT_OIDC_SESSION_SECRET')
  if (secret.length < 32) {
    throw createError({
      status: 500,
      statusText: 'OIDC session secret must contain at least 32 characters',
    })
  }

  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

function configString(event: H3Event, key: string, envKey: string): string {
  const config = useRuntimeConfig(event) as unknown as Record<string, unknown>
  const value = config[key]
  return (typeof value === 'string' ? value.trim() : '') || cloudflareString(event, envKey)
}

function cloudflareString(event: H3Event, key: string): string {
  const env = event.context.cloudflare?.env as unknown as Record<string, unknown> | undefined
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input
  let value = ''
  for (const byte of bytes)
    value += String.fromCharCode(byte)

  return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlDecodeBytes(input: string): Uint8Array<ArrayBuffer> {
  const normalized = input.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
}

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000)
}
