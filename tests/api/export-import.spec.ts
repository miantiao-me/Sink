import type { ImportResult } from '../../shared/schemas/import'
import type { ExportData } from '../../shared/schemas/link'
import { generateMock } from '@anatine/zod-mock'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { fetch, fetchWithAuth, postJson } from '../utils'

const linkSchema = z.object({
  url: z.string().url(),
  slug: z.string().min(1).max(50),
})

const testLinkPayload = generateMock(linkSchema)

describe.sequential('/api/link/export', () => {
  it('exports links with valid auth', async () => {
    await postJson('/api/link/create', testLinkPayload)

    const response = await fetchWithAuth('/api/link/export')
    expect(response.status).toBe(200)

    const data: ExportData = await response.json()
    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('exportedAt')
    expect(data).toHaveProperty('count')
    expect(data).toHaveProperty('links')
    expect(data).toHaveProperty('list_complete')
    expect(data.links).toBeInstanceOf(Array)
  })

  it('supports cursor pagination', async () => {
    const response = await fetchWithAuth('/api/link/export?cursor=test')
    expect(response.status).toBe(200)

    const data: ExportData = await response.json()
    expect(data).toHaveProperty('links')
  })

  it('returns correct response headers', async () => {
    const response = await fetchWithAuth('/api/link/export')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/export')
    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/import', () => {
  it('imports links with valid data', async () => {
    const importPayload = {
      version: '1.0',
      links: [generateMock(linkSchema)],
    }

    const response = await postJson('/api/link/import', importPayload)
    expect(response.status).toBe(200)

    const data: ImportResult = await response.json()
    expect(data).toHaveProperty('success')
    expect(data).toHaveProperty('skipped')
    expect(data).toHaveProperty('failed')
    expect(data).toHaveProperty('successItems')
    expect(data).toHaveProperty('skippedItems')
    expect(data).toHaveProperty('failedItems')
    expect(data.success).toBeGreaterThanOrEqual(0)
  })

  it('skips existing links during import', async () => {
    const importPayload = { version: '1.0', links: [testLinkPayload] }
    const response = await postJson('/api/link/import', importPayload)
    expect(response.status).toBe(200)

    const data: ImportResult = await response.json()
    expect(data.skipped).toBeGreaterThanOrEqual(0)
  })

  it('returns 400 for invalid import data', async () => {
    const response = await postJson('/api/link/import', { invalid: 'data' })
    expect(response.status).toBe(400)
  })

  it('returns 400 for empty links array', async () => {
    const response = await postJson('/api/link/import', { version: '1.0', links: [] })
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid url in links', async () => {
    const response = await postJson('/api/link/import', {
      version: '1.0',
      links: [{ url: 'not-a-valid-url', slug: 'test-slug' }],
    })
    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await postJson('/api/link/import', {}, false)
    expect(response.status).toBe(401)
  })
})
