import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from '../utils'

describe('/api/location', () => {
  it('returns location data with valid auth', async () => {
    const response = await fetchWithAuth('/api/location')

    expect(response.status).toBe(200)

    // TODO: request.cf mock
    // const data = await response.json()
    // expect(data.latitude).toBeTypeOf('string')
    // expect(data.longitude).toBeTypeOf('string')
    // expect(Number(data.latitude)).not.toBeNaN()
    // expect(Number(data.longitude)).not.toBeNaN()
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/location')

    expect(response.status).toBe(401)
  })
})
