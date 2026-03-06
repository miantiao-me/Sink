import { generateMock } from '@anatine/zod-mock'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { fetch, fetchWithAuth, postJson, putJson } from '../utils'

const linkSchema = z.object({
  url: z.string().url(),
  slug: z.string().min(1).max(50),
})

const testLinkPayload = generateMock(linkSchema)

describe('/api/link/ai', () => {
  it('generates AI slug for valid URL', async () => {
    const response = await fetchWithAuth(`/api/link/ai?url=${encodeURIComponent('https://sink.cool')}`)

    // AI binding may not be enabled (501) or request may timeout
    expect([200, 501]).toContain(response.status)

    if (response.status === 200) {
      const data = await response.json() as { slug: string }
      expect(data).toHaveProperty('slug')
      expect(typeof data.slug).toBe('string')
    }
  }, 30000)

  it('returns 400 when url parameter is missing', async () => {
    const response = await fetchWithAuth('/api/link/ai')
    expect(response.status).toBe(400)
  })

  it('returns 400 when url parameter is invalid', async () => {
    const response = await fetchWithAuth('/api/link/ai?url=not-a-valid-url')
    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/ai')
    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/create', () => {
  it('creates new link with valid data', async () => {
    const response = await postJson('/api/link/create', testLinkPayload)
    expect(response.status).toBe(201)

    const data = await response.json() as { link: typeof testLinkPayload, shortLink: string }
    expect(data.link).toBeDefined()
    expect(data.link.url).toBe(testLinkPayload.url)
    expect(data.link.slug).toBe(testLinkPayload.slug)
    expect(data.shortLink).toContain(testLinkPayload.slug)
  })

  it('returns 409 when slug already exists', async () => {
    const payload = generateMock(linkSchema)
    await postJson('/api/link/create', payload)

    const duplicateResponse = await postJson('/api/link/create', payload)
    expect(duplicateResponse.status).toBe(409)
  })

  it('returns 400 when url is missing', async () => {
    const response = await postJson('/api/link/create', { slug: 'test-slug' })
    expect(response.status).toBe(400)
  })

  it('returns 400 when url is invalid', async () => {
    const response = await postJson('/api/link/create', { url: 'not-a-valid-url', slug: 'test-slug' })
    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await postJson('/api/link/create', {}, false)
    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/upsert', () => {
  it('creates new link with valid data', async () => {
    const payload = generateMock(linkSchema)
    const response = await postJson('/api/link/upsert', payload)
    expect(response.status).toBe(201)
  })

  it('updates existing link with valid data', async () => {
    const response = await postJson('/api/link/upsert', testLinkPayload)
    expect(response.status).toBe(200)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await postJson('/api/link/upsert', {}, false)
    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/query', () => {
  it('returns link data for valid slug', async () => {
    const response = await fetchWithAuth(`/api/link/query?slug=${testLinkPayload.slug}`)
    expect(response.status).toBe(200)

    const data = await response.json() as { url: string, slug: string }
    expect(data).toHaveProperty('url')
    expect(data).toHaveProperty('slug')
  })

  it('returns 404 when slug does not exist', async () => {
    const response = await fetchWithAuth('/api/link/query?slug=non-existent-slug-12345')
    expect(response.status).toBe(404)
  })

  it('returns 400 when slug parameter is missing', async () => {
    const response = await fetchWithAuth('/api/link/query')
    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch(`/api/link/query?slug=${testLinkPayload.slug}`)
    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/list', () => {
  it('returns paginated link list with valid auth', async () => {
    const response = await fetchWithAuth('/api/link/list')
    expect(response.status).toBe(200)

    const data = await response.json() as { links: unknown[], list_complete: boolean }
    expect(data).toHaveProperty('links')
    expect(data).toHaveProperty('list_complete')
    expect(data.links).toBeInstanceOf(Array)
  })

  it('supports limit parameter', async () => {
    const response = await fetchWithAuth('/api/link/list?limit=5')
    expect(response.status).toBe(200)

    const data = await response.json() as { links: unknown[] }
    expect(data.links.length).toBeLessThanOrEqual(5)
  })

  it('returns 400 when limit exceeds maximum', async () => {
    const response = await fetchWithAuth('/api/link/list?limit=2000')
    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/list')
    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/search', () => {
  it('returns link array with valid auth', async () => {
    const response = await fetchWithAuth('/api/link/search')
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/search')
    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/edit', () => {
  it('updates existing link with valid data', async () => {
    const response = await putJson('/api/link/edit', testLinkPayload)
    expect(response.status).toBe(201)

    const data = await response.json() as { link: unknown, shortLink: string }
    expect(data).toHaveProperty('link')
    expect(data).toHaveProperty('shortLink')
  })

  it('removes password when not provided in edit', async () => {
    const slug = testLinkPayload.slug

    // Set a password on the link
    const setPasswordResponse = await putJson('/api/link/edit', { ...testLinkPayload, password: 'secret123' })
    expect(setPasswordResponse.status).toBe(201)
    const setData = await setPasswordResponse.json() as { link: { password?: string } }
    expect(setData.link.password).toBe('secret123')

    // Edit the link without providing a password (user cleared the field)
    const removePasswordResponse = await putJson('/api/link/edit', { url: testLinkPayload.url, slug })
    expect(removePasswordResponse.status).toBe(201)
    const removeData = await removePasswordResponse.json() as { link: { password?: string } }
    expect(removeData.link.password).toBeUndefined()
  })

  it('removes optional fields when not provided in edit', async () => {
    const slug = testLinkPayload.slug

    // Set optional fields
    const setResponse = await putJson('/api/link/edit', {
      ...testLinkPayload,
      comment: 'test comment',
      title: 'test title',
      cloaking: true,
      redirectWithQuery: true,
    })
    expect(setResponse.status).toBe(201)
    const setData = await setResponse.json() as { link: { comment?: string, title?: string, cloaking?: boolean, redirectWithQuery?: boolean } }
    expect(setData.link.comment).toBe('test comment')
    expect(setData.link.title).toBe('test title')
    expect(setData.link.cloaking).toBe(true)
    expect(setData.link.redirectWithQuery).toBe(true)

    // Edit without optional fields (user cleared them)
    const removeResponse = await putJson('/api/link/edit', { url: testLinkPayload.url, slug })
    expect(removeResponse.status).toBe(201)
    const removeData = await removeResponse.json() as { link: { comment?: string, title?: string, cloaking?: boolean, redirectWithQuery?: boolean } }
    expect(removeData.link.comment).toBeUndefined()
    expect(removeData.link.title).toBeUndefined()
    expect(removeData.link.cloaking).toBeUndefined()
    expect(removeData.link.redirectWithQuery).toBeUndefined()
  })

  it('returns 404 when editing non-existent link', async () => {
    const payload = { url: 'https://example.com', slug: 'non-existent-slug-for-edit-12345' }
    const response = await putJson('/api/link/edit', payload)
    expect(response.status).toBe(404)
  })

  it('returns 400 when body is invalid', async () => {
    const response = await putJson('/api/link/edit', { url: 'invalid-url' })
    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await putJson('/api/link/edit', {}, false)
    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/edit unsafe', () => {
  const unsafePayload = { ...testLinkPayload, url: 'https://example.com', slug: 'unsafe-test-link' }

  it('creates link with unsafe flag', async () => {
    const response = await postJson('/api/link/create', { ...unsafePayload, unsafe: true })
    expect(response.status).toBe(201)

    const data = await response.json() as { link: { unsafe?: boolean } }
    expect(data.link.unsafe).toBe(true)
  })

  it('queries link with unsafe flag', async () => {
    const response = await fetchWithAuth(`/api/link/query?slug=${unsafePayload.slug}`)
    expect(response.status).toBe(200)

    const data = await response.json() as { unsafe?: boolean }
    expect(data.unsafe).toBe(true)
  })

  it('removes unsafe flag when not provided in edit', async () => {
    const response = await putJson('/api/link/edit', { url: unsafePayload.url, slug: unsafePayload.slug })
    expect(response.status).toBe(201)

    const data = await response.json() as { link: { unsafe?: boolean } }
    expect(data.link.unsafe).toBeUndefined()
  })

  it('sets unsafe flag via edit', async () => {
    const response = await putJson('/api/link/edit', { ...unsafePayload, unsafe: true })
    expect(response.status).toBe(201)

    const data = await response.json() as { link: { unsafe?: boolean } }
    expect(data.link.unsafe).toBe(true)
  })

  it('deletes unsafe test link', async () => {
    const response = await postJson('/api/link/delete', { slug: unsafePayload.slug })
    expect(response.status).toBe(204)
  })
})

describe.sequential('/api/link/delete', () => {
  it('deletes link with valid slug and auth', async () => {
    const response = await postJson('/api/link/delete', { slug: testLinkPayload.slug })
    expect(response.status).toBe(204)
  })

  it('returns 400 when slug is missing', async () => {
    const response = await postJson('/api/link/delete', {})
    expect(response.status).toBe(400)
  })

  it('returns 400 when slug is empty', async () => {
    const response = await postJson('/api/link/delete', { slug: '' })
    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await postJson('/api/link/delete', {}, false)
    expect(response.status).toBe(401)
  })
})
