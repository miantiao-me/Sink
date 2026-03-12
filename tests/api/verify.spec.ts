import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from '../utils'

interface VerifyResponse {
  name: string
  url: string
}

describe('/api/verify', () => {
  it('returns user data with valid auth', async () => {
    const response = await fetchWithAuth('/api/verify')
    expect(response.status).toBe(200)

    const data = await response.json() as VerifyResponse
    expect(data).toHaveProperty('name')
    expect(data).toHaveProperty('url')
    expect(data.name).toBeTypeOf('string')
    expect(data.url).toBeTypeOf('string')
  })

  it('returns correct response structure', async () => {
    const response = await fetchWithAuth('/api/verify')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')

    const data = await response.json() as VerifyResponse
    expect(data.name).toBe('Sink')
    expect(data.url).toBe('https://sink.cool')
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/verify')
    expect(response.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const response = await fetch('/api/verify', {
      headers: { Authorization: 'Bearer invalid-token-12345' },
    })
    expect(response.status).toBe(401)
  })
})
