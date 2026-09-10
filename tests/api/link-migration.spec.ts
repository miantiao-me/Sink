import type { ImportResult } from '../../shared/schemas/import'
import type { ExportData } from '../../shared/schemas/link'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LINK_PASSWORD_HASH_PREFIX, LINK_PASSWORD_MASK_PREFIX } from '../../shared/utils/link-password'
import { clearLinkMigrationState, deleteStoredLinks, expectStoredHashedPassword, fetchWithAuth, getStoredLink, postJson, setLinkStoreD1Mode } from '../utils'

const createdSlugs = new Set<string>()

beforeEach(async () => {
  await setLinkStoreD1Mode()
})

function trackSlug(slug: string) {
  createdSlugs.add(slug)
  return slug
}

function createLinkPayload() {
  return {
    url: 'https://example.com',
    slug: trackSlug(`migration-${crypto.randomUUID()}`),
  }
}

afterEach(async () => {
  await deleteStoredLinks([...createdSlugs])
  createdSlugs.clear()
  await clearLinkMigrationState()
})

describe('/api/link/export', { concurrent: false }, () => {
  it('exports links with valid auth', async () => {
    const payload = createLinkPayload()
    expect((await postJson('/api/link/create', payload)).status).toBe(201)

    const response = await fetchWithAuth('/api/link/export')
    expect(response.status).toBe(200)

    const data: ExportData = await response.json()
    expect(data.version).toBeDefined()
    expect(data.exportedAt).toBeDefined()
    expect(data.count).toBe(data.links.length)
    expect(data.links).toContainEqual(expect.objectContaining(payload))
    expect(typeof data.list_complete).toBe('boolean')
  })

  it('returns correct response headers', async () => {
    const response = await fetchWithAuth('/api/link/export')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('exports hashed password without exposing plaintext or mask', async () => {
    const password = 'export-secret123'
    const payload = {
      url: 'https://example.com',
      slug: trackSlug(`000-export-password-${crypto.randomUUID()}`),
      password,
    }

    const createResponse = await postJson('/api/link/create', payload)
    expect(createResponse.status).toBe(201)
    await expectStoredHashedPassword(payload.slug, password)

    const response = await fetchWithAuth('/api/link/export')
    expect(response.status).toBe(200)

    const data: ExportData = await response.json()
    const link = data.links.find(link => link.slug === payload.slug)
    expect(link?.password?.startsWith(LINK_PASSWORD_HASH_PREFIX), link?.password).toBe(true)
    expect(link?.password).not.toBe(password)
    expect(link?.password?.startsWith(LINK_PASSWORD_MASK_PREFIX)).toBe(false)
  })
})

describe('/api/link/import', { concurrent: false }, () => {
  it('imports links with valid data', async () => {
    const importPayload = {
      version: '1.0',
      links: [createLinkPayload()],
    }

    const response = await postJson('/api/link/import', importPayload)
    expect(response.status).toBe(200)

    const data: ImportResult = await response.json()
    expect(data).toMatchObject({
      success: 1,
      skipped: 0,
      failed: 0,
      skippedItems: [],
      failedItems: [],
    })
    expect(data.successItems).toEqual([{ index: 0, ...importPayload.links[0] }])
  })

  it('generates an id when an imported id is empty', async () => {
    const payload = { ...createLinkPayload(), id: '   ' }
    const response = await postJson('/api/link/import', { version: '1.0', links: [payload] })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: 1, failed: 0 })

    const stored = await getStoredLink(payload.slug)
    expect(stored?.id).toEqual(expect.any(String))
    expect(stored?.id).not.toBe('')
  })

  it('skips existing links during import', async () => {
    const payload = createLinkPayload()
    expect((await postJson('/api/link/create', payload)).status).toBe(201)

    const importPayload = { version: '1.0', links: [payload] }
    const response = await postJson('/api/link/import', importPayload)
    expect(response.status).toBe(200)

    const data: ImportResult = await response.json()
    expect(data).toMatchObject({
      success: 0,
      skipped: 1,
      failed: 0,
      successItems: [],
      failedItems: [],
    })
    expect(data.skippedItems).toEqual([{ index: 0, ...payload }])
  })

  it('keeps ordered partial import results', async () => {
    const existing = createLinkPayload()
    const first = createLinkPayload()
    const last = createLinkPayload()
    expect((await postJson('/api/link/create', existing)).status).toBe(201)

    const response = await postJson('/api/link/import', { version: '1.0', links: [first, existing, last] })
    const data: ImportResult = await response.json()

    expect(data).toMatchObject({ success: 2, skipped: 1, failed: 0 })
    expect(data.successItems).toEqual([{ index: 0, ...first }, { index: 2, ...last }])
    expect(data.skippedItems).toEqual([{ index: 1, ...existing }])
  })

  it('hashes plaintext password during import', async () => {
    const password = 'import-secret123'
    const payload = {
      version: '1.0',
      links: [{
        url: 'https://example.com',
        slug: trackSlug(`import-password-${crypto.randomUUID()}`),
        password,
      }],
    }

    const response = await postJson('/api/link/import', payload)
    expect(response.status).toBe(200)

    const data: ImportResult = await response.json()
    expect(data.success).toBe(1)
    await expectStoredHashedPassword(payload.links[0].slug, password)
  })

  it('keeps already hashed password during import', async () => {
    const password = 'reimport-secret123'
    const sourcePayload = {
      url: 'https://example.com',
      slug: trackSlug(`000-reimport-source-${crypto.randomUUID()}`),
      password,
    }

    const createResponse = await postJson('/api/link/create', sourcePayload)
    expect(createResponse.status).toBe(201)
    await expectStoredHashedPassword(sourcePayload.slug, password)

    const exportResponse = await fetchWithAuth('/api/link/export')
    expect(exportResponse.status).toBe(200)

    const exportData: ExportData = await exportResponse.json()
    const exportedLink = exportData.links.find(link => link.slug === sourcePayload.slug)
    const exportedPassword = exportedLink?.password
    expect(exportedPassword?.startsWith(LINK_PASSWORD_HASH_PREFIX), exportedPassword).toBe(true)
    if (!exportedPassword)
      throw new Error('Missing exported password')

    const importSlug = trackSlug(`reimport-hash-${crypto.randomUUID()}`)
    const importResponse = await postJson('/api/link/import', {
      version: '1.0',
      links: [{
        url: sourcePayload.url,
        slug: importSlug,
        password: exportedPassword,
      }],
    })
    expect(importResponse.status).toBe(200)

    const storedLink = await getStoredLink(importSlug)
    expect(storedLink?.password).toBe(exportedPassword)
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

  it('returns 400 when an imported link is missing its slug', async () => {
    const response = await postJson('/api/link/import', {
      version: '1.0',
      links: [{ url: 'https://example.com' }],
    })
    expect(response.status).toBe(400)
  })

  it('rejects imports over the server request limit', async () => {
    const links = Array.from({ length: 101 }, (_, index) => ({
      url: 'https://example.com',
      slug: `import-limit-${crypto.randomUUID()}-${index}`,
    }))

    const response = await postJson('/api/link/import', { version: '1.0', links })

    expect(response.status).toBe(400)
    expect(response.statusText).toBe('Too many links. Maximum 100 links per request.')
  })
})
