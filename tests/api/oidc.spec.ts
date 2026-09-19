import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { deleteStoredLink, fetch, fetchWithAuth, setLinkStoreD1Mode, TEST_OIDC_ISSUER } from '../utils'

const transactionCookieName = 'sink_oidc'
const sessionCookieName = 'sink_session'

describe.sequential('openID Connect session authentication', () => {
  it('reports OIDC as enabled when confidential client settings are present', async () => {
    const response = await SELF.fetch('http://localhost/api/auth/config')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ enabled: true })
  })

  it('starts authorization with PKCE, state, nonce, and a protected transaction cookie', async () => {
    const response = await SELF.fetch('http://localhost/api/auth/login?returnTo=/dashboard/links', {
      redirect: 'manual',
    })

    expect(response.status).toBe(302)
    expect(response.headers.get('set-cookie')).toContain(`${transactionCookieName}=`)
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax')

    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe(TEST_OIDC_ISSUER)
    expect(location.searchParams.get('client_id')).toBe('sink-test-client')
    expect(location.searchParams.get('redirect_uri')).toBe('http://localhost/api/auth/callback')
    expect(location.searchParams.get('response_type')).toBe('code')
    expect(location.searchParams.get('scope')).toBe('openid profile email')
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(location.searchParams.get('code_challenge')).toBeTruthy()
    expect(location.searchParams.get('state')).toBeTruthy()
    expect(location.searchParams.get('nonce')).toBeTruthy()
  })

  it('rejects a callback with mismatched state', async () => {
    const login = await SELF.fetch('http://localhost/api/auth/login', { redirect: 'manual' })
    const response = await SELF.fetch('http://localhost/api/auth/callback?code=test-code&state=wrong', {
      redirect: 'manual',
      headers: { Cookie: responseCookie(login, transactionCookieName) },
    })

    expect(response.status).toBe(401)
  })

  it('creates a session from a validated callback and authenticates protected APIs', async () => {
    await setLinkStoreD1Mode()
    const login = await SELF.fetch('http://localhost/api/auth/login', { redirect: 'manual' })
    const location = new URL(login.headers.get('location')!)
    const state = location.searchParams.get('state')!
    const transactionCookie = await transactionCookieWithNonce(
      responseCookie(login, transactionCookieName),
      'test-nonce',
    )

    const callback = await SELF.fetch(`http://localhost/api/auth/callback?code=test-code&state=${state}`, {
      redirect: 'manual',
      headers: { Cookie: transactionCookie },
    })

    expect(callback.status, await callback.clone().text()).toBe(302)
    expect(callback.headers.get('location')).toBe('/dashboard')
    expect(callback.headers.get('set-cookie')).toContain(`${sessionCookieName}=`)
    const sessionCookie = responseCookie(callback, sessionCookieName)

    const verify = await fetch('/api/verify', { headers: { Cookie: sessionCookie } })
    expect(verify.status).toBe(200)
    await expect(verify.json()).resolves.toMatchObject({
      authMethod: 'oidc-session',
      userID: 'test-user',
      userEmail: 'oidc-user@example.com',
    })

    const crossOriginWrite = await fetch('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com' }),
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
        'Origin': 'https://attacker.example',
      },
    })
    expect(crossOriginWrite.status).toBe(403)

    const slug = `oidc-owned-${crypto.randomUUID()}`
    try {
      const create = await fetch('/api/link/create', {
        method: 'POST',
        body: JSON.stringify({ slug, url: 'https://example.com/owned' }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
          'Origin': 'http://localhost',
        },
      })
      expect(create.status, await create.clone().text()).toBe(201)

      expect((await fetchWithAuth(`/api/link/query?slug=${slug}`)).status).toBe(401)
      expect((await fetchWithAuth('/api/link/upsert', {
        method: 'POST',
        body: JSON.stringify({ slug, url: 'https://attacker.example/replace' }),
        headers: { 'Content-Type': 'application/json' },
      })).status).toBe(401)
      expect((await fetch(`/api/link/query?slug=${slug}`, {
        headers: { Cookie: sessionCookie },
      })).status).toBe(200)

      const remove = await fetch('/api/link/delete', {
        method: 'POST',
        body: JSON.stringify({ slug }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
          'Origin': 'http://localhost',
        },
      })
      expect(remove.status).toBe(204)
    }
    finally {
      await deleteStoredLink(slug)
    }

    const logout = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: sessionCookie,
        Origin: 'http://localhost',
      },
    })
    expect(logout.status).toBe(204)
    expect(logout.headers.get('set-cookie')).toContain(`${sessionCookieName}=`)
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})

function responseCookie(response: Response, name: string): string {
  const setCookie = response.headers.get('set-cookie')
  expect(setCookie).toContain(`${name}=`)
  const cookie = setCookie!.split(', ').find(value => value.startsWith(`${name}=`))
  expect(cookie).toBeTruthy()
  return cookie!.split(';')[0]
}

async function transactionCookieWithNonce(cookie: string, nonce: string): Promise<string> {
  const [name, value] = cookie.split('=')
  const [encodedIv, encodedCiphertext] = value.split('.')
  const keyMaterial = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('test-session-secret-with-at-least-32-characters'),
  )
  const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlDecode(encodedIv) },
    key,
    base64UrlDecode(encodedCiphertext),
  )
  const transaction = JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, unknown>
  transaction.nonce = nonce

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(transaction)),
  )
  return `${name}=${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`
}

function base64UrlEncode(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0))
}
