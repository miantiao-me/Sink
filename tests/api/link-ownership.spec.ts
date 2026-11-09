import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { links } from '../../server/database/schema'
import { fetchAsUser, postJsonAsUser, putJsonAsUser, TEST_ADMIN_EMAIL } from '../ownership-utils'
import { db, deleteStoredLinks, fetchWithAuth, getD1Link, postJson, putJson, setLinkStoreD1Mode } from '../utils'

const ALICE = 'alice@example.com'
const BOB = 'bob@example.com'

const createdSlugs = new Set<string>()
function trackSlug(slug: string) {
  createdSlugs.add(slug)
  return slug
}

beforeEach(async () => {
  await setLinkStoreD1Mode()
})

afterEach(async () => {
  await deleteStoredLinks([...createdSlugs])
  createdSlugs.clear()
})

async function createLinkAsUser(email: string, overrides: Record<string, unknown> = {}) {
  const slug = trackSlug(`owner-${crypto.randomUUID()}`)
  const response = await postJsonAsUser('/api/link/create', email, {
    url: 'https://example.com',
    slug,
    ...overrides,
  })
  expect(response.status).toBe(201)
  const data = await response.json() as { link: { id: string, slug: string } }
  return data.link
}

/** Inserts a legacy, pre-migration-style link directly into D1 with no owner. */
async function insertUnassignedLink() {
  const slug = trackSlug(`unassigned-${crypto.randomUUID()}`)
  const now = Math.floor(Date.now() / 1000)
  const id = `un${Math.random().toString(36).slice(2, 10)}`
  await db.insert(links).values({
    slug,
    id,
    url: 'https://example.com/unassigned',
    normalizedUrl: 'https://example.com/unassigned',
    createdAt: now,
    updatedAt: now,
  })
  return { slug, id }
}

describe('link ownership: list', () => {
  it('excludes another non-admin user\'s link', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await fetchAsUser(`/api/link/list?limit=999&status=all`, BOB)
    expect(response.status).toBe(200)
    const data = await response.json() as { links: { slug: string }[] }
    expect(data.links.some(l => l.slug === link.slug)).toBe(false)
  })

  it('includes the caller\'s own link', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await fetchAsUser(`/api/link/list?limit=999&status=all`, ALICE)
    expect(response.status).toBe(200)
    const data = await response.json() as { links: { slug: string }[] }
    expect(data.links.some(l => l.slug === link.slug)).toBe(true)
  })

  it('excludes an unassigned (pre-migration) link for a non-admin', async () => {
    const { slug } = await insertUnassignedLink()
    const response = await fetchAsUser(`/api/link/list?limit=999&status=all`, ALICE)
    expect(response.status).toBe(200)
    const data = await response.json() as { links: { slug: string }[] }
    expect(data.links.some(l => l.slug === slug)).toBe(false)
  })

  it('admin sees links from every owner plus unassigned links', async () => {
    const aliceLink = await createLinkAsUser(ALICE)
    const bobLink = await createLinkAsUser(BOB)
    const { slug: unassignedSlug } = await insertUnassignedLink()

    const response = await fetchWithAuth('/api/link/list?limit=999&status=all')
    expect(response.status).toBe(200)
    const data = await response.json() as { links: { slug: string }[] }
    const slugs = data.links.map(l => l.slug)
    expect(slugs).toContain(aliceLink.slug)
    expect(slugs).toContain(bobLink.slug)
    expect(slugs).toContain(unassignedSlug)
  })
})

describe('link ownership: query', () => {
  it('404s when a non-admin queries another user\'s link', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await fetchAsUser(`/api/link/query?slug=${link.slug}`, BOB)
    expect(response.status).toBe(404)
  })

  it('404s when a non-admin queries an unassigned link', async () => {
    const { slug } = await insertUnassignedLink()
    const response = await fetchAsUser(`/api/link/query?slug=${slug}`, ALICE)
    expect(response.status).toBe(404)
  })

  it('succeeds when a non-admin queries their own link', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await fetchAsUser(`/api/link/query?slug=${link.slug}`, ALICE)
    expect(response.status).toBe(200)
  })

  it('succeeds when admin queries any user\'s link', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await fetchWithAuth(`/api/link/query?slug=${link.slug}`)
    expect(response.status).toBe(200)
  })
})

describe('link ownership: edit', () => {
  it('404s when a non-admin edits another user\'s link', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await putJsonAsUser('/api/link/edit', BOB, { slug: link.slug, url: 'https://hijacked.example.com' })
    expect(response.status).toBe(404)

    const stored = await getD1Link(link.slug)
    expect(stored?.url).toBe('https://example.com')
  })

  it('succeeds when a non-admin edits their own link', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await putJsonAsUser('/api/link/edit', ALICE, { slug: link.slug, url: 'https://edited.example.com' })
    expect(response.status).toBe(201)
  })

  it('succeeds when admin edits any user\'s link', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await putJson('/api/link/edit', { slug: link.slug, url: 'https://admin-edited.example.com' })
    expect(response.status).toBe(201)
  })
})

describe('link ownership: delete', () => {
  it('404s when a non-admin deletes another user\'s link, and the link survives', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await postJsonAsUser('/api/link/delete', BOB, { slug: link.slug })
    expect(response.status).toBe(404)

    const stored = await getD1Link(link.slug)
    expect(stored).not.toBeNull()
  })

  it('succeeds when a non-admin deletes their own link', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await postJsonAsUser('/api/link/delete', ALICE, { slug: link.slug })
    expect(response.status).toBe(204)
  })

  it('succeeds when admin deletes any user\'s link', async () => {
    const link = await createLinkAsUser(BOB)
    const response = await postJson('/api/link/delete', { slug: link.slug })
    expect(response.status).toBe(204)
  })
})

describe('link ownership: analytics scoping', () => {
  it('allows a non-admin to query their own link id', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await fetchAsUser(`/api/stats/counters?id=${link.id}`, ALICE)
    expect(response.status).toBe(200)
  })

  it('rejects a non-admin querying another user\'s link id', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await fetchAsUser(`/api/stats/counters?id=${link.id}`, BOB)
    expect(response.status).toBe(404)
  })

  it('rejects a non-admin querying an unassigned link id', async () => {
    const { id } = await insertUnassignedLink()
    const response = await fetchAsUser(`/api/stats/counters?id=${id}`, ALICE)
    expect(response.status).toBe(404)
  })

  it('allows admin to query any user\'s link id', async () => {
    const link = await createLinkAsUser(BOB)
    const response = await fetchWithAuth(`/api/stats/counters?id=${link.id}`)
    expect(response.status).toBe(200)
  })

  it('allows an admin-emailed access-user to query any user\'s link id', async () => {
    const link = await createLinkAsUser(BOB)
    const response = await fetchAsUser(`/api/stats/counters?id=${link.id}`, TEST_ADMIN_EMAIL)
    expect(response.status).toBe(200)
  })

  it('rejects a non-admin querying another user\'s link id via logs', async () => {
    const link = await createLinkAsUser(ALICE)
    const response = await fetchAsUser(`/api/logs/events?id=${link.id}&limit=10`, BOB)
    expect(response.status).toBe(404)
  })
})
