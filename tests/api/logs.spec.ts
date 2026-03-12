import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from '../utils'

describe('/api/logs/events', () => {
  it('returns events data with valid auth', async () => {
    const response = await fetchWithAuth('/api/logs/events?slug=0')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('returns events with time filter', async () => {
    const now = Math.floor(Date.now() / 1000)
    const response = await fetchWithAuth(`/api/logs/events?slug=1&startAt=${now - 86400}&endAt=${now}`)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('supports limit parameter', async () => {
    const response = await fetchWithAuth('/api/logs/events?slug=0&limit=10')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('returns data without slug filter', async () => {
    const response = await fetchWithAuth('/api/logs/events')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/logs/events?slug=0')

    expect(response.status).toBe(401)
  })
})

describe('/api/logs/locations', () => {
  it('returns locations data with valid auth', async () => {
    const response = await fetchWithAuth('/api/logs/locations?slug=0')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('returns locations with time filter', async () => {
    const now = Math.floor(Date.now() / 1000)
    const response = await fetchWithAuth(`/api/logs/locations?slug=1&startAt=${now - 86400}&endAt=${now}`)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('supports limit parameter', async () => {
    const response = await fetchWithAuth('/api/logs/locations?slug=0&limit=10')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('returns data without slug filter', async () => {
    const response = await fetchWithAuth('/api/logs/locations')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/logs/locations?slug=0')

    expect(response.status).toBe(401)
  })
})
