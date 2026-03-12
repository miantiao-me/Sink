import { SELF } from 'cloudflare:test'

export function fetchWithAuth(path: string, options?: RequestInit): Promise<Response> {
  return SELF.fetch(`http://localhost${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${import.meta.env.NUXT_SITE_TOKEN}`,
    },
  })
}

export function fetch(path: string, options?: RequestInit): Promise<Response> {
  return SELF.fetch(`http://localhost${path}`, options)
}

export function postJson(path: string, body: unknown, withAuth = true): Promise<Response> {
  const fn = withAuth ? fetchWithAuth : fetch
  return fn(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function putJson(path: string, body: unknown, withAuth = true): Promise<Response> {
  const fn = withAuth ? fetchWithAuth : fetch
  return fn(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// 1x1 transparent PNG for testing
export const TEST_PNG_BYTES = new Uint8Array([
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
  0x00,
  0x00,
  0x00,
  0x0D,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x06,
  0x00,
  0x00,
  0x00,
  0x1F,
  0x15,
  0xC4,
  0x89,
  0x00,
  0x00,
  0x00,
  0x0A,
  0x49,
  0x44,
  0x41,
  0x54,
  0x78,
  0x9C,
  0x63,
  0x00,
  0x01,
  0x00,
  0x00,
  0x05,
  0x00,
  0x01,
  0x0D,
  0x0A,
  0x2D,
  0xB4,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4E,
  0x44,
  0xAE,
  0x42,
  0x60,
  0x82,
])
