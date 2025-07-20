import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from '../utils'

describe('/api/verify', () => {
  it('returns user data with valid auth', async () => {
    const response = await fetchWithAuth('/api/verify')
    const data = await response.json()

    expect(data.name).toBeTypeOf('string')
    expect(data.url).toBeTypeOf('string')
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/verify')

    expect(response.status).toBe(401)
  })
})
