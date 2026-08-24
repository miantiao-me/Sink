import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from '../utils'

describe('/api/logs/events', () => {
  it('returns events data with valid auth', async () => {
    const response = await fetchWithAuth('/api/logs/events?slug=0&limit=10')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toBeInstanceOf(Array)
    expect(data.length).toBeLessThanOrEqual(10)
  })

  it('returns events with time filter', async () => {
    const now = Math.floor(Date.now() / 1000)
    const response = await fetchWithAuth(`/api/logs/events?slug=1&startAt=${now - 86400}&endAt=${now}&limit=10`)

    expect(response.status).toBe(200)
    expect(await response.json()).toBeInstanceOf(Array)
  })

  it('returns data without slug filter', async () => {
    const response = await fetchWithAuth('/api/logs/events?limit=10')

    expect(response.status).toBe(200)
    expect(await response.json()).toBeInstanceOf(Array)
  })

  it.each(['0', '9007199254740991'])('rejects invalid limit %s', async (limit) => {
    const response = await fetchWithAuth(`/api/logs/events?limit=${limit}`)

    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/logs/events?limit=10')

    expect(response.status).toBe(401)
  })
})

describe('/api/logs/locations', () => {
  it('returns locations data with valid auth', async () => {
    const response = await fetchWithAuth('/api/logs/locations?slug=0&limit=10')

    expect(response.status).toBe(200)

    const data = await response.json() as { data: unknown[] }
    expect(data).toHaveProperty('data')
    expect(data.data.length).toBeLessThanOrEqual(10)
  })

  it('returns locations with time filter', async () => {
    const now = Math.floor(Date.now() / 1000)
    const response = await fetchWithAuth(`/api/logs/locations?slug=1&startAt=${now - 86400}&endAt=${now}&limit=10`)

    expect(response.status).toBe(200)
    const data = await response.json() as { data: unknown[] }
    expect(data.data.length).toBeLessThanOrEqual(10)
  })

  it('returns data without slug filter', async () => {
    const response = await fetchWithAuth('/api/logs/locations?limit=10')

    expect(response.status).toBe(200)
    const data = await response.json() as { data: unknown[] }
    expect(data.data.length).toBeLessThanOrEqual(10)
  })

  it('rejects an invalid limit', async () => {
    const response = await fetchWithAuth('/api/logs/locations?limit=0')

    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/logs/locations?limit=10')

    expect(response.status).toBe(401)
  })
})
