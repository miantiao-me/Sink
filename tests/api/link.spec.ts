import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteStoredLinks, expectMaskedPassword, expectStoredHashedPassword, fetch, fetchWithAuth, getStoredLink, postJson, putJson, setLinkStoreD1Mode } from '../utils'

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
    slug: trackSlug(`test-${crypto.randomUUID()}`),
  }
}

afterEach(async () => {
  await deleteStoredLinks([...createdSlugs])
  createdSlugs.clear()
})

describe('/api/link/ai', () => {
  it('returns a fallback slug when Workers AI fails', async () => {
    const runSpy = vi.spyOn(env.AI, 'run').mockRejectedValue(new Error('Workers AI unavailable'))
    const toMarkdownSpy = vi.spyOn(env.AI, 'toMarkdown').mockRejectedValue(new Error('Markdown conversion unavailable'))

    try {
      const response = await fetchWithAuth(`/api/link/ai?url=${encodeURIComponent('https://example.com/fallback-slug')}`)
      expect(response.status).toBe(200)

      const data = await response.json() as { slug: string }
      expect(data.slug).toBe('fallback-slug')
      expect(data.slug).not.toBe('')
      expect(runSpy).toHaveBeenCalledOnce()
    }
    finally {
      runSpy.mockRestore()
      toMarkdownSpy.mockRestore()
    }
  })

  it('returns 400 when url parameter is missing', async () => {
    const response = await fetchWithAuth('/api/link/ai')
    expect(response.status).toBe(400)
  })

  it('returns 400 when url parameter is invalid', async () => {
    const response = await fetchWithAuth('/api/link/ai?url=not-a-valid-url')
    expect(response.status).toBe(400)
  })
})

describe('/api/link/og-ai', () => {
  it('returns fallback metadata when Workers AI fails', async () => {
    const runSpy = vi.spyOn(env.AI, 'run').mockRejectedValue(new Error('Workers AI unavailable'))
    const toMarkdownSpy = vi.spyOn(env.AI, 'toMarkdown').mockRejectedValue(new Error('Markdown conversion unavailable'))

    try {
      const response = await fetchWithAuth(`/api/link/og-ai?url=${encodeURIComponent('https://example.com/fallback-metadata')}`)
      expect(response.status).toBe(200)

      const data = await response.json() as { title: string, description: string }
      expect(data.title).toBe('example.com')
      expect(data.description).not.toBe('')
      expect(runSpy).toHaveBeenCalledOnce()
    }
    finally {
      runSpy.mockRestore()
      toMarkdownSpy.mockRestore()
    }
  })

  it('returns 400 when url parameter is missing', async () => {
    const response = await fetchWithAuth('/api/link/og-ai')
    expect(response.status).toBe(400)
  })

  it('returns 400 when url parameter is invalid', async () => {
    const response = await fetchWithAuth('/api/link/og-ai?url=not-a-valid-url')
    expect(response.status).toBe(400)
  })
})

describe('/api/link/create', { concurrent: false }, () => {
  it('generates identity, slug, and timestamps by default', async () => {
    const before = Math.floor(Date.now() / 1000)
    const response = await postJson('/api/link/create', { url: 'https://example.com/generated' })
    expect(response.status).toBe(201)

    const data = await response.json() as { link: { id: string, slug: string, createdAt: number, updatedAt: number, tags: string[] } }
    trackSlug(data.link.slug)
    expect(data.link.id).toHaveLength(10)
    expect(data.link.slug).not.toBe('')
    expect(data.link.createdAt).toBeGreaterThanOrEqual(before)
    expect(data.link.updatedAt).toBeGreaterThanOrEqual(before)
    expect(data.link.tags).toEqual([])
  })

  it('creates new link with valid data', async () => {
    const payload = createLinkPayload()
    const response = await postJson('/api/link/create', payload)
    expect(response.status).toBe(201)

    const data = await response.json() as { link: typeof payload, shortLink: string }
    expect(data.link).toBeDefined()
    expect(data.link.url).toBe(payload.url)
    expect(data.link.slug).toBe(payload.slug)
    expect(data.shortLink).toContain(payload.slug)
  })

  it('returns 409 when slug already exists', async () => {
    const payload = createLinkPayload()
    await postJson('/api/link/create', payload)

    const duplicateResponse = await postJson('/api/link/create', payload)
    expect(duplicateResponse.status).toBe(409)
  })

  it('masks password in response and stores hashed password', async () => {
    const password = 'secret123'
    const payload = {
      url: 'https://example.com',
      slug: trackSlug(`create-password-${crypto.randomUUID()}`),
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
    const slug = trackSlug(`geo-lower-${crypto.randomUUID()}`)
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

describe('/api/link/upsert', { concurrent: false }, () => {
  it('creates new link with valid data', async () => {
    const payload = createLinkPayload()
    const response = await postJson('/api/link/upsert', payload)
    expect(response.status).toBe(201)
  })

  it('handles an existing link with valid data', async () => {
    const payload = createLinkPayload()
    expect((await postJson('/api/link/create', payload)).status).toBe(201)

    const response = await postJson('/api/link/upsert', { ...payload, url: 'https://updated.example.com' })
    expect(response.status).toBe(200)
  })

  it('masks password in response and stores hashed password', async () => {
    const password = 'upsert-secret123'
    const payload = {
      url: 'https://example.com',
      slug: trackSlug(`upsert-password-${crypto.randomUUID()}`),
      password,
    }

    const response = await postJson('/api/link/upsert', payload)
    expect(response.status).toBe(201)

    const data = await response.json() as { link: { password?: string } }
    expectMaskedPassword(data.link.password, password)
    await expectStoredHashedPassword(payload.slug, password)
  })
})

describe('/api/link/query', { concurrent: false }, () => {
  it('returns link data for valid slug', async () => {
    const payload = createLinkPayload()
    expect((await postJson('/api/link/create', payload)).status).toBe(201)

    const response = await fetchWithAuth(`/api/link/query?slug=${payload.slug}`)
    expect(response.status).toBe(200)

    const data = await response.json() as { url: string, slug: string }
    expect(data).toMatchObject(payload)
  })

  it('returns masked password without exposing plaintext or hash', async () => {
    const password = 'query-secret123'
    const payload = {
      url: 'https://example.com',
      slug: trackSlug(`query-password-${crypto.randomUUID()}`),
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
    const response = await fetch('/api/link/query?slug=auth-guard')
    expect(response.status).toBe(401)
  })
})

describe('/api/link/list', { concurrent: false }, () => {
  it('returns the requested deterministic link', async () => {
    const payload = { ...createLinkPayload(), tags: [`tag-${crypto.randomUUID().slice(0, 8)}`] }
    expect((await postJson('/api/link/create', payload)).status).toBe(201)

    const response = await fetchWithAuth(`/api/link/list?limit=1&sort=az&status=all&tag=${payload.tags[0]}`)
    expect(response.status).toBe(200)

    const data = await response.json() as { links: { slug: string, url: string }[], list_complete: boolean }
    expect(data.links).toHaveLength(1)
    expect(data.links[0]).toMatchObject({ slug: payload.slug, url: payload.url })
    expect(data.list_complete).toBe(true)
  })

  it('returns masked passwords without exposing plaintext or hashes', async () => {
    const password = 'list-secret123'
    const payload = {
      url: 'https://example.com',
      slug: trackSlug(`list-password-${crypto.randomUUID()}`),
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

  it('accepts the maximum limit', async () => {
    const response = await fetchWithAuth('/api/link/list?limit=1000')
    expect(response.status).toBe(200)
  })

  it('returns 400 when limit exceeds maximum', async () => {
    const response = await fetchWithAuth('/api/link/list?limit=1001')
    expect(response.status).toBe(400)
  })
})

describe('/api/link/search', { concurrent: false }, () => {
  it('returns only the matching link', async () => {
    const payload = createLinkPayload()
    expect((await postJson('/api/link/create', payload)).status).toBe(201)

    const response = await fetchWithAuth(`/api/link/search?q=${payload.slug}&status=all`)
    expect(response.status).toBe(200)

    const data = await response.json() as { slug: string, url: string }[]
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject(payload)
  })
})

describe('/api/link/edit', { concurrent: false }, () => {
  it('updates existing link with valid data', async () => {
    const payload = createLinkPayload()
    expect((await postJson('/api/link/create', payload)).status).toBe(201)

    const response = await putJson('/api/link/edit', { ...payload, url: 'https://edited.example.com' })
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
      slug: trackSlug(`edit-password-${crypto.randomUUID()}`),
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
    const payload = createLinkPayload()
    expect((await postJson('/api/link/create', payload)).status).toBe(201)

    const setResponse = await putJson('/api/link/edit', {
      ...payload,
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

    const removeResponse = await putJson('/api/link/edit', payload)
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
      slug: trackSlug(`edit-clear-geo-${crypto.randomUUID()}`),
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

  it('returns 400 when slug is missing', async () => {
    const response = await putJson('/api/link/edit', { url: 'https://example.com' })
    expect(response.status).toBe(400)
  })
})

describe('/api/link/edit unsafe', { concurrent: false }, () => {
  it('creates, queries, edits, and deletes a link with unsafe semantics', async () => {
    const unsafePayload = { url: 'https://example.com', slug: trackSlug(`unsafe-test-${crypto.randomUUID()}`) }
    const response = await postJson('/api/link/create', { ...unsafePayload, unsafe: true })
    expect(response.status).toBe(201)

    const data = await response.json() as { link: { unsafe?: boolean } }
    expect(data.link.unsafe).toBe(true)
    const queryResponse = await fetchWithAuth(`/api/link/query?slug=${unsafePayload.slug}`)
    expect(queryResponse.status).toBe(200)

    const queryData = await queryResponse.json() as { unsafe?: boolean }
    expect(queryData.unsafe).toBe(true)

    const removeResponse = await putJson('/api/link/edit', unsafePayload)
    expect(removeResponse.status).toBe(201)

    const removeData = await removeResponse.json() as { link: { unsafe?: boolean } }
    expect(removeData.link.unsafe).toBeUndefined()

    const setResponse = await putJson('/api/link/edit', { ...unsafePayload, unsafe: true })
    expect(setResponse.status).toBe(201)

    const setData = await setResponse.json() as { link: { unsafe?: boolean } }
    expect(setData.link.unsafe).toBe(true)

    const deleteResponse = await postJson('/api/link/delete', { slug: unsafePayload.slug })
    expect(deleteResponse.status).toBe(204)
  })
})

describe('/api/link/delete', { concurrent: false }, () => {
  it('deletes link with valid slug and auth', async () => {
    const payload = createLinkPayload()
    expect((await postJson('/api/link/create', payload)).status).toBe(201)

    const response = await postJson('/api/link/delete', { slug: payload.slug })
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
})
