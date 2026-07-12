import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  isCloudflareAccessConfigured,
  isCloudflareAccessRequestSafe,
  verifyCloudflareAccessToken,
} from '../server/utils/cloudflare-access'

const issuer = 'https://sink.cloudflareaccess.com'
const audience = 'sink-audience'
const keyId = 'sink-test-key'

let privateKey: CryptoKey
let localJwks: ReturnType<typeof createLocalJWKSet>

beforeAll(async () => {
  const keyPair = await generateKeyPair('RS256', { extractable: true })
  privateKey = keyPair.privateKey

  const publicJwk = await exportJWK(keyPair.publicKey)
  localJwks = createLocalJWKSet({
    keys: [{
      ...publicJwk,
      alg: 'RS256',
      kid: keyId,
      use: 'sig',
    }],
  })
})

interface TokenOptions {
  aud?: string
  exp?: number
  iss?: string
  key?: CryptoKey
}

async function createToken(options: TokenOptions = {}) {
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({ type: 'app' })
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .setIssuer(options.iss || issuer)
    .setAudience(options.aud || audience)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(options.exp || now + 300)
    .sign(options.key || privateKey)
}

describe('cloudflare Access JWT validation', () => {
  it('accepts a valid token', async () => {
    const token = await createToken()
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBe(true)
  })

  it('rejects an invalid audience', async () => {
    const token = await createToken({ aud: 'other-audience' })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBe(false)
  })

  it('rejects an invalid issuer', async () => {
    const token = await createToken({ iss: 'https://other.cloudflareaccess.com' })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBe(false)
  })

  it('rejects an expired token', async () => {
    const token = await createToken({ exp: Math.floor(Date.now() / 1000) - 60 })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBe(false)
  })

  it('rejects a token with an invalid signature', async () => {
    const otherKeyPair = await generateKeyPair('RS256')
    const token = await createToken({ key: otherKeyPair.privateKey })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBe(false)
  })

  it('fails closed when the key source is unavailable', async () => {
    const token = await createToken()
    const unavailableJwks = async () => {
      throw new Error('JWKS unavailable')
    }
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, unavailableJwks)).resolves.toBe(false)
  })
})

describe('cloudflare Access configuration', () => {
  it('requires both configuration values', () => {
    expect(isCloudflareAccessConfigured(issuer, audience)).toBe(true)
    expect(isCloudflareAccessConfigured('', audience)).toBe(false)
    expect(isCloudflareAccessConfigured(issuer, '')).toBe(false)
    expect(isCloudflareAccessConfigured(' ', ' ')).toBe(false)
  })
})

describe('cloudflare Access CSRF protection', () => {
  it('rejects cross-site browser requests', () => {
    expect(isCloudflareAccessRequestSafe({
      method: 'GET',
      requestOrigin: 'https://sink.example.com',
      secFetchSite: 'cross-site',
    })).toBe(false)
  })

  it('rejects unsafe requests from another origin', () => {
    expect(isCloudflareAccessRequestSafe({
      method: 'POST',
      origin: 'https://attacker.example.com',
      requestOrigin: 'https://sink.example.com',
      secFetchSite: 'same-site',
    })).toBe(false)
  })

  it('accepts same-origin unsafe requests and non-browser clients', () => {
    expect(isCloudflareAccessRequestSafe({
      method: 'POST',
      origin: 'https://sink.example.com',
      requestOrigin: 'https://sink.example.com',
      secFetchSite: 'same-origin',
    })).toBe(true)
    expect(isCloudflareAccessRequestSafe({
      method: 'POST',
      requestOrigin: 'https://sink.example.com',
    })).toBe(true)
  })

  it('rejects cookie-authenticated unsafe requests without an origin', () => {
    expect(isCloudflareAccessRequestSafe({
      method: 'POST',
      hasAccessCookie: true,
      requestOrigin: 'https://sink.example.com',
    })).toBe(false)
  })
})
