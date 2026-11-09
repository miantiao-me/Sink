import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { fetch as workerFetch } from './utils'

export const TEST_ACCESS_ISSUER = 'https://sink-test.cloudflareaccess.com'
export const TEST_ACCESS_AUDIENCE = 'sink-test-audience'
export const TEST_ADMIN_EMAIL = 'admin@example.com'

const keyId = 'sink-ownership-test-key'

let privateKeyPromise: Promise<CryptoKey> | undefined
let jwksBodyPromise: Promise<string> | undefined
let originalFetch: typeof fetch | undefined

async function getPrivateKey(): Promise<CryptoKey> {
  privateKeyPromise ??= (async () => {
    const keyPair = await generateKeyPair('RS256', { extractable: true })
    const publicJwk = await exportJWK(keyPair.publicKey)
    jwksBodyPromise = Promise.resolve(JSON.stringify({
      keys: [{ ...publicJwk, alg: 'RS256', kid: keyId, use: 'sig' }],
    }))
    return keyPair.privateKey
  })()
  return privateKeyPromise
}

function installFetchInterceptor(): void {
  if (originalFetch)
    return
  originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString()
    if (url.startsWith(TEST_ACCESS_ISSUER) && new URL(url).pathname === '/cdn-cgi/access/certs') {
      const body = await jwksBodyPromise!
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return originalFetch!(input as any, init)
  }
}

/** Builds a signed Cloudflare Access JWT for the given email, verifiable against the mocked JWKS endpoint. */
export async function createAccessUserToken(email: string, userID = `access-${email}`): Promise<string> {
  await getPrivateKey()
  installFetchInterceptor()
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({ type: 'app', sub: userID, email })
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setIssuer(TEST_ACCESS_ISSUER)
    .setAudience(TEST_ACCESS_AUDIENCE)
    .setExpirationTime(now + 300)
    .sign(await getPrivateKey())
}

/** Sends a request authenticated as the given Access user email (non-admin unless it matches NUXT_ADMIN_EMAILS). */
export async function fetchAsUser(path: string, email: string, options?: RequestInit): Promise<Response> {
  const token = await createAccessUserToken(email)
  return workerFetch(path, {
    ...options,
    headers: {
      ...options?.headers,
      'Cf-Access-Jwt-Assertion': token,
    },
  })
}

export function postJsonAsUser(path: string, email: string, body: unknown): Promise<Response> {
  return fetchAsUser(path, email, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function putJsonAsUser(path: string, email: string, body: unknown): Promise<Response> {
  return fetchAsUser(path, email, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}
