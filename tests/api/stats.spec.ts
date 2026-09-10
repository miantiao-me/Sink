import { describe, expect, it } from 'vitest'
import { fetchWithAuth } from '../utils'

describe('/api/stats/counters', () => {
  it('returns counters data with valid auth', async () => {
    const response = await fetchWithAuth('/api/stats/counters?slug=0')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })
})

describe('/api/stats/metrics', () => {
  it('returns metrics data with valid auth and type', async () => {
    const response = await fetchWithAuth('/api/stats/metrics?slug=0&type=browser')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it.each(['os', 'device', 'country', 'referer'])('accepts the %s metric type', async (type) => {
    const response = await fetchWithAuth(`/api/stats/metrics?slug=0&type=${type}`)
    expect(response.status).toBe(200)
  })

  it('returns 400 for invalid metric type', async () => {
    const response = await fetchWithAuth('/api/stats/metrics?slug=0&type=invalid')

    expect(response.status).toBe(400)
  })

  it('returns 400 when type parameter is missing', async () => {
    const response = await fetchWithAuth('/api/stats/metrics?slug=0')

    expect(response.status).toBe(400)
  })
})

describe('/api/stats/views', () => {
  it('returns views data with valid auth and unit', async () => {
    const response = await fetchWithAuth('/api/stats/views?slug=0&unit=day')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it.each(['minute', 'hour'])('accepts the %s view unit', async (unit) => {
    const response = await fetchWithAuth(`/api/stats/views?slug=0&unit=${unit}`)
    expect(response.status).toBe(200)
  })

  it('accepts an offset-style timezone', async () => {
    const response = await fetchWithAuth('/api/stats/views?slug=0&unit=day&clientTimezone=Etc/GMT-8')
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
})

describe('/api/stats/heatmap', () => {
  it('supports clientTimezone parameter', async () => {
    const response = await fetchWithAuth('/api/stats/heatmap?clientTimezone=Asia/Shanghai')

    expect(response.status).toBe(200)
  })

  it('accepts an offset-style timezone', async () => {
    const response = await fetchWithAuth('/api/stats/heatmap?clientTimezone=Etc/GMT-8')
    expect(response.status).toBe(200)
  })

  it('returns 400 for invalid clientTimezone format', async () => {
    const response = await fetchWithAuth('/api/stats/heatmap?clientTimezone=invalid<>timezone')

    expect(response.status).toBe(400)
  })
})

describe('/api/stats/export', () => {
  it('returns CSV with valid auth', async () => {
    const response = await fetchWithAuth('/api/stats/export')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/csv')

    const csv = await response.text()
    expect(csv.replace(/^\uFEFF/, '').split('\n')[0]).toBe('slug,url,viewer,views,referer')
  })

  it('returns 400 for invalid time range', async () => {
    const now = Math.floor(Date.now() / 1000)
    const response = await fetchWithAuth(`/api/stats/export?startAt=${now}&endAt=${now - 86400}`)

    expect(response.status).toBe(400)
  })
})
