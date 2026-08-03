import type { Link } from '../../shared/schemas/link'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { links } from '../../server/database/schema'
import { db, deleteStoredLinks, fetchWithAuth, postJson, setLinkStoreD1Mode } from '../utils'

interface CountFixture {
  needle: string
  tag: string
  activeTagged: Link
  activeOther: Link
  expiredTagged: Link
}

const createdSlugs = new Set<string>()
let fixture: CountFixture

function makeLink(slug: string, overrides: Partial<Link>): Link {
  const now = Math.floor(Date.now() / 1000)
  createdSlugs.add(slug)
  return {
    id: crypto.randomUUID().slice(0, 10),
    slug,
    url: `https://count.example/${slug}`,
    createdAt: now,
    updatedAt: now,
    tags: [],
    ...overrides,
  }
}

async function getCount(query: Record<string, string> = {}): Promise<number> {
  const params = new URLSearchParams(query)
  const response = await fetchWithAuth(`/api/link/count${params.size ? `?${params}` : ''}`)
  expect(response.status).toBe(200)
  return (await response.json() as { count: number }).count
}

describe('/api/link/count', { concurrent: false }, () => {
  beforeEach(async () => {
    await setLinkStoreD1Mode()
    const prefix = `count-${crypto.randomUUID()}`
    const needle = `needle-${crypto.randomUUID().slice(0, 8)}`
    const tag = `tag-${crypto.randomUUID().slice(0, 8)}`
    const activeTagged = makeLink(`${prefix}-active-tagged`, {
      url: `https://count.example/${prefix}/shared?stored=1`,
      comment: `${needle} alpha`,
      tags: [tag],
    })
    const activeOther = makeLink(`${prefix}-active-other`, {
      comment: `${needle} beta`,
    })
    const expiredTagged = makeLink(`${prefix}-expired-tagged`, {
      comment: `${needle} expired`,
      expiration: Math.floor(Date.now() / 1000) + 3600,
      tags: [tag],
    })
    fixture = { needle, tag, activeTagged, activeOther, expiredTagged }

    for (const link of [activeTagged, activeOther, expiredTagged])
      expect((await postJson('/api/link/create', link)).status).toBe(201)

    const expiredAt = Math.floor(Date.now() / 1000) - 1
    await db.update(links)
      .set({ expiration: expiredAt, effectiveExpiresAt: expiredAt })
      .where(eq(links.slug, expiredTagged.slug))
    await env.KV.delete(`link:${expiredTagged.slug}`)
  })

  afterEach(async () => {
    await deleteStoredLinks([...createdSlugs])
    createdSlugs.clear()
  })

  it('counts active, all, and expired links', async () => {
    expect(await getCount({ q: fixture.needle })).toBe(2)
    expect(await getCount({ q: fixture.needle, status: 'all' })).toBe(3)
    expect(await getCount({ q: fixture.needle, status: 'expired' })).toBe(1)
  })

  it('counts tag, keyword, URL, combined, and unmatched filters', async () => {
    expect(await getCount({ tag: fixture.tag, status: 'all' })).toBe(2)
    expect(await getCount({ q: fixture.needle })).toBe(2)
    expect(await getCount({ url: fixture.activeTagged.url.replace('stored=1', 'ignored=1'), status: 'all' })).toBe(1)
    expect(await getCount({ q: fixture.needle, tag: fixture.tag })).toBe(1)
    expect(await getCount({ q: 'missing-value', tag: fixture.tag, status: 'all' })).toBe(0)
  })

  it('matches search counts while preserving the tag-only search guard', async () => {
    const search = await fetchWithAuth(`/api/link/search?q=${fixture.needle}&status=all`)
    expect(search.status).toBe(200)
    const matches = await search.json() as Link[]
    expect(await getCount({ q: fixture.needle, status: 'all' })).toBe(matches.length)

    const guardedSearch = await fetchWithAuth(`/api/link/search?tag=${fixture.tag}&status=all`)
    expect(guardedSearch.status).toBe(200)
    expect(await guardedSearch.json()).toEqual([])
    expect(await getCount({ tag: fixture.tag, status: 'all' })).toBe(2)
  })
})
