import { Buffer } from 'node:buffer'
import { createPrivateKey, sign } from 'node:crypto'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { MockAgent } from 'undici'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

interface HandledValidationError {
  statusCode: 400
  statusMessage: 'Validation Error'
  data: {
    issues: unknown[]
    name: 'ZodError'
    stack: string
  }
}

function isHandledValidationError(error: unknown): error is HandledValidationError {
  if (typeof error !== 'object' || error === null
    || !('statusCode' in error) || error.statusCode !== 400
    || !('statusMessage' in error) || error.statusMessage !== 'Validation Error'
    || !('data' in error) || typeof error.data !== 'object' || error.data === null) {
    return false
  }

  const { data } = error
  return 'issues' in data && Array.isArray(data.issues)
    && 'name' in data && data.name === 'ZodError'
    && 'stack' in data && typeof data.stack === 'string'
    && data.stack.includes('validateData')
}

const testOidcIssuer = 'http://oidc.test'
const testOidcPrivateJwk = {
  kty: 'RSA',
  n: 'nFp0teLq6HaSXRlh_fyX8cDqlx_QYtbEpWvjKghtz3uBAdCzKJCvYewsKhjjLUcP-xhQXLbiAr28QtLSzis28GIi0dYWyrFvMy0kmoPou3liK4MQA0QGdBfNgIs7DSYv3-Zp9vPLtymIBwq8PRW6EqZCG-pZEtUd0Xji8E8T4hiwXOWRsTiditkZ2btnqAK8k5oCb7zzg__LpERybZdHef3lTzsoro5O-YuM-plBnC-d3AE-UHyl6kqLWAl-GuTr-bn8dUVh_rTjMy3D3dOsv-1RVaQgMZNU8fJGAD-uHftmxRIFiRGc-inU3NlHYSRnarl8SBl3dYxO0Xfvj0pvWw',
  e: 'AQAB',
  d: 'Gn5VYnCl_2gAGxhu-1uu338iASOZ6vWbcrBaWMf-23aBAK69fPUvUrdzMFrxO73b3l9bVqqCl5ZQ7T3ODLNT5t2qKsZNLGFuh0xx9GC_sey6jsbxkqwXL9rMrqhpBCxhVl4zvG3JKis2aoMOLIee9QQJFbPbDg7gs5r5UWEE7H2gqkJt4qgxAtohNZxQV6B1rUYyN8mho0ePZZkOqgyVysw1WRFTzT_TPef4udvWhc7ztNh4R8jBLRBi4tZW-NR8va6oldfIv-5NAF3gLZgxInnWmLsHApndsAp6MEz5A_FtbRKLsyHURuPX4o5As8OjJ6mPGuBYL-NzPwaGkqA-sQ',
  p: 'zQs6VJq-Hs-UbQOiyeLUiWAAaQYJornv9QDFxIesXbrpMY78CSnWcJ9MQRS1uCMhX9U72fpAqWf2cvWnUPkXYoS01cvg71PsQH3v4CODGx4XILz0uj-AljmYPCwyJMesSlA5U4NE_euwGg_7xvY78SYRgW8yEl382hVViv9MtRM',
  q: 'wzWQxVPAMOGxnuU6zfOi3NRNmzYcrfhkqB1dJ5c7q5ZqelIEImMAMlELWB6teDzUwpWCWhKS6z8vpm4FGA7XziZyh6H74-53GY1dC1JK4ZA_hA6bt5tUL1WozdmycrOMAgDkY2uiQ5zwM90dPIEH4nh2ToS6autC8Oihm1UGzZk',
  dp: 'bqBzLTh8ASWgAB0pFGGkqCW6su9F_ZzyQS7UhQ9qSPvSWyG5C7yd7Q-VVbu1u46AsDLc4uNpRb1Is4ekaUSrgET3SC6Cwr11xunrpPOkBdp7QfeQ1nfyiZqzbyutNjjg1QtpkoxNie5Cih07i4JInvgaE8qJqm05QfSmvaK2oS8',
  dq: 'scBo3wXwD5Kzxlg9P6QGPMclE5wmaVOxdFOoq5BOSWRh-JgOI7G6UBb0GX11v_LEWZsCYzpehc-3d_jespVxdMoVp-OcFmTiFmZevxxkCxjqfTlAGeRat-9sEmWU1FUhvAFL9ivgSWjyYIeLQ7jKkTHXqI-7n_gxsGRkI6k81KE',
  qi: 'HyVGsu5e--qAyz7zeUPgEV3jDxKdcttooDefeIsJ85MZBNBWnudV7xB0Km32q3HS674Yz1fxxCu-HoqEmPNHPMwrQfcF1avc_ajwexd22SJdS50lh4T18aFm9Sf6WrW-QluXQ47XZpI4g859QHwnS9RKVyJeSdGimaAZ-NCeAjs',
  kid: 'test-key',
  alg: 'RS256',
  use: 'sig',
}

function createOidcFetchMock(): MockAgent {
  const fetchMock = new MockAgent()
  fetchMock.disableNetConnect()
  const provider = fetchMock.get(testOidcIssuer)
  const jsonHeaders = { headers: { 'content-type': 'application/json' } }

  provider.intercept({ path: '/.well-known/openid-configuration' }).reply(200, {
    issuer: testOidcIssuer,
    authorization_endpoint: `${testOidcIssuer}/oauth2/authorize`,
    token_endpoint: `${testOidcIssuer}/oauth2/token`,
    userinfo_endpoint: `${testOidcIssuer}/oauth2/userinfo`,
    jwks_uri: `${testOidcIssuer}/jwks`,
    end_session_endpoint: `${testOidcIssuer}/oauth2/end-session`,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    code_challenge_methods_supported: ['S256'],
  }, jsonHeaders).persist()
  provider.intercept({ path: '/jwks' }).reply(200, {
    keys: [{
      kty: testOidcPrivateJwk.kty,
      n: testOidcPrivateJwk.n,
      e: testOidcPrivateJwk.e,
      kid: testOidcPrivateJwk.kid,
      alg: testOidcPrivateJwk.alg,
      use: testOidcPrivateJwk.use,
    }],
  }, jsonHeaders).persist()
  provider.intercept({ method: 'POST', path: '/oauth2/token' }).reply(200, {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 300,
    id_token: signTestIdToken('test-nonce'),
  }, jsonHeaders).persist()
  provider.intercept({ path: '/oauth2/userinfo' }).reply(200, {
    sub: 'test-user',
    email: 'oidc-user@example.com',
    name: 'OIDC User',
  }, jsonHeaders).persist()

  return fetchMock
}

function signTestIdToken(nonce: string): string {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: testOidcIssuer,
    aud: 'sink-test-client',
    sub: 'test-user',
    email: 'oidc-user@example.com',
    name: 'OIDC User',
    nonce,
    iat: now,
    exp: now + 300,
  })).toString('base64url')
  const signingInput = `${header}.${payload}`
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), createPrivateKey({
    key: testOidcPrivateJwk,
    format: 'jwk',
  })).toString('base64url')
  return `${signingInput}.${signature}`
}

export default defineConfig(async ({ mode }) => {
  const migrations = await readD1Migrations('./drizzle')
  const testEnvironment = {
    ...loadEnv(mode, process.cwd(), ''),
    NUXT_SITE_TOKEN: 'SinkCool',
    NUXT_CF_ACCOUNT_ID: '',
    NUXT_CF_API_TOKEN: '',
    NUXT_REDIRECT_STATUS_CODE: '301',
  }
  const commonBindings = {
    TEST_MIGRATIONS: migrations,
    NUXT_SITE_TOKEN: 'SinkCool',
    NUXT_CF_ACCOUNT_ID: '',
    NUXT_CF_API_TOKEN: '',
    NUXT_REDIRECT_STATUS_CODE: '301',
  }
  const commonTest = {
    env: testEnvironment,
    isolate: false,
    maxWorkers: 1,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10_000,
    onUnhandledError(error: unknown) {
      return !isHandledValidationError(error)
    },
  }

  return {
    test: {
      projects: [
        {
          plugins: [
            cloudflareTest({
              wrangler: { configPath: './wrangler.test.jsonc' },
              miniflare: {
                cf: true,
                bindings: commonBindings,
              },
            }),
          ],
          test: {
            ...commonTest,
            name: 'site-token',
            include: ['tests/**/*.spec.ts'],
            exclude: ['tests/api/oidc.spec.ts'],
          },
        },
        {
          plugins: [
            cloudflareTest({
              wrangler: { configPath: './wrangler.test.jsonc' },
              miniflare: {
                cf: true,
                fetchMock: createOidcFetchMock(),
                bindings: {
                  ...commonBindings,
                  NUXT_OIDC_ISSUER: testOidcIssuer,
                  NUXT_OIDC_CLIENT_ID: 'sink-test-client',
                  NUXT_OIDC_CLIENT_SECRET: 'sink-test-client-secret',
                  NUXT_OIDC_REDIRECT_URI: 'http://localhost/api/auth/callback',
                  NUXT_OIDC_SESSION_SECRET: 'test-session-secret-with-at-least-32-characters',
                  NUXT_OIDC_ALLOW_INSECURE: 'true',
                },
              },
            }),
          ],
          test: {
            ...commonTest,
            name: 'oidc',
            include: ['tests/api/oidc.spec.ts'],
          },
        },
      ],
    },
  }
})
