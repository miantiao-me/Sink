import { generateMock } from '@anatine/zod-mock'
import { afterAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { deleteStoredLink, expectMaskedPassword, expectStoredHashedPassword, fetch, fetchWithAuth, getStoredLink, postJson, putJson } from '../utils'

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

describe('/api/link/og-ai', () => {
  it('generates AI metadata for valid URL', async () => {
    const response = await fetchWithAuth(`/api/link/og-ai?url=${encodeURIComponent('https://sink.cool')}`)

    expect([200, 501]).toContain(response.status)

    if (response.status === 200) {
      const data = await response.json() as { title: string, description: string }
      expect(data).toHaveProperty('title')
      expect(data).toHaveProperty('description')
      expect(typeof data.title).toBe('string')
      expect(typeof data.description).toBe('string')
    }
  }, 30000)

  it('returns 400 when url parameter is missing', async () => {
    const response = await fetchWithAuth('/api/link/og-ai')
    expect(response.status).toBe(400)
  })

  it('returns 400 when url parameter is invalid', async () => {
    const response = await fetchWithAuth('/api/link/og-ai?url=not-a-valid-url')
    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/og-ai')
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

  it('masks password in response and stores hashed password', async () => {
    const password = 'secret123'
    const payload = {
      url: 'https://example.com',
      slug: `create-password-${crypto.randomUUID()}`,
      password,
    }

    const response = await postJson('/api/link/create', payload)
    expect(response.status).toBe(201)

    const data = await response.json() as { link: { password?: string } }
    expectMaskedPassword(data.link.password, password)
    await expectStoredHashedPassword(payload.slug, password)
  })

  it('returns 400 when url is missing', async () => {
    const response = await postJson('/api/link/create', { slug: 'test-slug' })
    expect(response.status).toBe(400)
  })

  it('returns 400 when url is invalid', async () => {
    const response = await postJson('/api/link/create', { url: 'not-a-valid-url', slug: 'test-slug' })
    expect(response.status).toBe(400)
  })

  it('accepts lowercase geo key and returns uppercase key', async () => {
    const slug = `geo-lower-${crypto.randomUUID()}`
    const response = await postJson('/api/link/create', {
      url: 'https://example.com',
      slug,
      geo: { cn: 'https://cn.example.com' },
    })
    expect(response.status).toBe(201)

    const data = await response.json() as { link: { geo?: Record<string, string> } }
    expect(data.link.geo).toEqual({ CN: 'https://cn.example.com' })
  })

  it('returns 400 when geo key is invalid', async () => {
    const response = await postJson('/api/link/create', {
      url: 'https://example.com',
      slug: `geo-key-invalid-${crypto.randomUUID()}`,
      geo: { USA: 'https://usa.example.com' },
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 when geo url is invalid', async () => {
    const response = await postJson('/api/link/create', {
      url: 'https://example.com',
      slug: `geo-url-invalid-${crypto.randomUUID()}`,
      geo: { CN: 'not-a-valid-url' },
    })
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

  it('masks password in response and stores hashed password', async () => {
    const password = 'upsert-secret123'
    const payload = {
      url: 'https://example.com',
      slug: `upsert-password-${crypto.randomUUID()}`,
      password,
    }

    const response = await postJson('/api/link/upsert', payload)
    expect(response.status).toBe(201)

    const data = await response.json() as { link: { password?: string } }
    expectMaskedPassword(data.link.password, password)
    await expectStoredHashedPassword(payload.slug, password)
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

  it('returns masked password without exposing plaintext or hash', async () => {
    const password = 'query-secret123'
    const payload = {
      url: 'https://example.com',
      slug: `query-password-${crypto.randomUUID()}`,
      password,
    }

    const createResponse = await postJson('/api/link/create', payload)
    expect(createResponse.status).toBe(201)

    const response = await fetchWithAuth(`/api/link/query?slug=${payload.slug}`)
    expect(response.status).toBe(200)

    const data = await response.json() as { password?: string }
    expectMaskedPassword(data.password, password)
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

  it('returns masked passwords without exposing plaintext or hashes', async () => {
    const password = 'list-secret123'
    const payload = {
      url: 'https://example.com',
      slug: `list-password-${crypto.randomUUID()}`,
      password,
    }

    const createResponse = await postJson('/api/link/create', payload)
    expect(createResponse.status).toBe(201)

    const response = await fetchWithAuth('/api/link/list?limit=999')
    expect(response.status).toBe(200)

    const data = await response.json() as { links: { slug: string, password?: string }[] }
    const link = data.links.find(link => link.slug === payload.slug)
    expectMaskedPassword(link?.password, password)
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

  it('preserves, changes, and clears password with edit semantics', async () => {
    const initialPassword = 'secret123'
    const newPassword = 'changed456'
    const payload = {
      url: 'https://example.com',
      slug: `edit-password-${crypto.randomUUID()}`,
      password: initialPassword,
    }

    const createResponse = await postJson('/api/link/create', payload)
    expect(createResponse.status).toBe(201)

    const createdData = await createResponse.json() as { link: { password?: string } }
    expectMaskedPassword(createdData.link.password, initialPassword)
    const storedAfterCreate = await getStoredLink(payload.slug)
    await expectStoredHashedPassword(payload.slug, initialPassword)

    const preservePasswordResponse = await putJson('/api/link/edit', { url: payload.url, slug: payload.slug })
    expect(preservePasswordResponse.status).toBe(201)
    const preserveData = await preservePasswordResponse.json() as { link: { password?: string } }
    expectMaskedPassword(preserveData.link.password, initialPassword)
    const storedAfterPreserve = await getStoredLink(payload.slug)
    expect(storedAfterPreserve?.password).toBe(storedAfterCreate?.password)

    const changePasswordResponse = await putJson('/api/link/edit', { url: payload.url, slug: payload.slug, password: newPassword })
    expect(changePasswordResponse.status).toBe(201)
    const changeData = await changePasswordResponse.json() as { link: { password?: string } }
    expectMaskedPassword(changeData.link.password, newPassword)
    const storedAfterChange = await getStoredLink(payload.slug)
    await expectStoredHashedPassword(payload.slug, newPassword)
    expect(storedAfterChange?.password).not.toBe(storedAfterCreate?.password)

    const clearPasswordResponse = await putJson('/api/link/edit', { url: payload.url, slug: payload.slug, password: '' })
    expect(clearPasswordResponse.status).toBe(201)
    const clearData = await clearPasswordResponse.json() as { link: { password?: string } }
    expect(clearData.link.password).toBeUndefined()
    const storedAfterClear = await getStoredLink(payload.slug)
    expect(storedAfterClear?.password).toBeUndefined()
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

  it('removes geo when not provided in edit', async () => {
    const payload = {
      url: 'https://example.com',
      slug: `edit-clear-geo-${crypto.randomUUID()}`,
      geo: { CN: 'https://cn.example.com' },
    }

    const createResponse = await postJson('/api/link/create', payload)
    expect(createResponse.status).toBe(201)

    const editResponse = await putJson('/api/link/edit', { url: payload.url, slug: payload.slug })
    expect(editResponse.status).toBe(201)

    const data = await editResponse.json() as { link: { geo?: Record<string, string> } }
    expect(data.link.geo).toBeUndefined()
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
  const unsafePayload = { ...testLinkPayload, url: 'https://example.com', slug: `unsafe-test-${crypto.randomUUID()}` }

  afterAll(async () => {
    await deleteStoredLink(unsafePayload.slug)
  })

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
