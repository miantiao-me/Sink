import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from '../utils'

describe('/api/stats/counters', () => {
  it('returns counters data with valid auth', async () => {
    const response = await fetchWithAuth('/api/stats/counters?slug=0')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('returns counters with time filter', async () => {
    const now = Math.floor(Date.now() / 1000)
    const response = await fetchWithAuth(`/api/stats/counters?slug=1&startAt=${now - 86400}&endAt=${now}`)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('returns data without slug filter', async () => {
    const response = await fetchWithAuth('/api/stats/counters')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/stats/counters?slug=0')

    expect(response.status).toBe(401)
  })
})

describe('/api/stats/metrics', () => {
  it('returns metrics data with valid auth and type', async () => {
    const response = await fetchWithAuth('/api/stats/metrics?slug=0&type=browser')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('returns metrics for different types', async () => {
    const types = ['browser', 'os', 'device', 'country', 'referer']

    for (const type of types) {
      const response = await fetchWithAuth(`/api/stats/metrics?slug=1&type=${type}`)
      expect(response.status).toBe(200)
    }
  })

  it('returns 400 for invalid metric type', async () => {
    const response = await fetchWithAuth('/api/stats/metrics?slug=0&type=invalid')

    expect(response.status).toBe(400)
  })

  it('returns 400 when type parameter is missing', async () => {
    const response = await fetchWithAuth('/api/stats/metrics?slug=0')

    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/stats/metrics?slug=0&type=browser')

    expect(response.status).toBe(401)
  })
})

describe('/api/stats/views', () => {
  it('returns views data with valid auth and unit', async () => {
    const response = await fetchWithAuth('/api/stats/views?slug=0&unit=day')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('returns views for different units', async () => {
    const units = ['minute', 'hour', 'day']

    for (const unit of units) {
      const response = await fetchWithAuth(`/api/stats/views?slug=1&unit=${unit}`)
      expect(response.status).toBe(200)
    }
  })

  it('supports clientTimezone parameter', async () => {
    const response = await fetchWithAuth('/api/stats/views?slug=0&unit=day&clientTimezone=Asia/Shanghai')

    expect(response.status).toBe(200)
  })

  it('returns 400 for invalid clientTimezone format', async () => {
    const response = await fetchWithAuth('/api/stats/views?slug=0&unit=day&clientTimezone=invalid<>timezone')

    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid unit', async () => {
    const response = await fetchWithAuth('/api/stats/views?slug=0&unit=invalid')

    expect(response.status).toBe(400)
  })

  it('returns 400 when unit parameter is missing', async () => {
    const response = await fetchWithAuth('/api/stats/views?slug=0')

    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/stats/views?slug=0&unit=day')

    expect(response.status).toBe(401)
  })
})
