import type { Link } from '../../shared/schemas/link'
import type { LinkMigrationRunResult, LinkMigrationStatus } from '../../shared/schemas/link-migration'
import { env } from 'cloudflare:workers'
import { count, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { linkMigrationRuns, links, linkTags, linkTombstones, tags } from '../../server/database/schema'
import { clearLinkMigrationState, db, deleteStoredLinks, fetch, fetchWithAuth, getD1Link, getStoredLink, postJson, putJson, setLinkStoreD1Mode } from '../utils'

const createdSlugs = new Set<string>()

function trackSlug(slug: string): string {
  createdSlugs.add(slug)
  return slug
}

function makeLink(slug = `d1-${crypto.randomUUID()}`, overrides: Partial<Link> = {}): Link {
  const now = Math.floor(Date.now() / 1000)
  return {
    id: crypto.randomUUID().slice(0, 10),
    slug: trackSlug(slug),
    url: `https://example.com/${slug}`,
    createdAt: now,
    updatedAt: now,
    tags: [],
    ...overrides,
  }
}

interface KvLinkExpirationOptions {
  metadataExpiration?: number
  nativeExpiration?: number
}

async function putKvLink(link: Link, options: KvLinkExpirationOptions = {}) {
  await env.KV.put(`link:${link.slug}`, JSON.stringify(link), {
    expiration: options.nativeExpiration,
    metadata: { expiration: options.metadataExpiration, url: link.url },
  })
}

async function insertD1Link(link: Link, effectiveExpiresAt: number | null = null) {
  await db.insert(links).values({
    slug: link.slug,
    id: link.id,
    url: link.url,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    normalizedUrl: link.url.split('?')[0],
    effectiveExpiresAt,
    comment: link.comment ?? null,
  })
}

async function runMigration(force: boolean) {
  const pages: LinkMigrationRunResult[] = []
  let cursor: string | undefined
  do {
    const response = await postJson('/api/link/migration/run', { force, cursor })
    expect(response.status).toBe(200)
    const page = await response.json() as LinkMigrationRunResult
    pages.push(page)
    cursor = page.cursor
    if (page.completed)
      break
  } while (cursor)
  return pages
}

describe('d1 link integration', () => {
  beforeEach(async () => {
    await setLinkStoreD1Mode()
  })

  afterEach(async () => {
    await deleteStoredLinks([...createdSlugs])
    createdSlugs.clear()
    await clearLinkMigrationState()
  })

  it('uses D1 for management queries and valid KV hits for redirects', async () => {
    const link = makeLink()
    const response = await postJson('/api/link/create', { slug: link.slug, url: link.url })
    expect(response.status).toBe(201)
    expect(await getD1Link(link.slug)).toMatchObject({ slug: link.slug, url: link.url })
    expect(await getStoredLink(link.slug)).toMatchObject({ slug: link.slug, url: link.url })
    const cached = await env.KV.getWithMetadata(`link:${link.slug}`)
    expect(cached.metadata).toBeNull()

    await putKvLink({ ...link, url: 'https://tampered.example/' })
    const query = await fetchWithAuth(`/api/link/query?slug=${link.slug}`)
    expect(query.status).toBe(200)
    expect(await query.json()).toMatchObject({ slug: link.slug, url: link.url })

    const redirect = await fetch(`/${link.slug}`, { redirect: 'manual' })
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('Location')).toBe('https://tampered.example/')
    expect(await getStoredLink(link.slug)).toMatchObject({ slug: link.slug, url: 'https://tampered.example/' })
  })

  it('defaults list ordering to newest', async () => {
    const tag = `order-${crypto.randomUUID().slice(0, 8)}`
    const older = makeLink(undefined, { createdAt: 10, updatedAt: 10, tags: [tag] })
    const newer = makeLink(undefined, { createdAt: 20, updatedAt: 20, tags: [tag] })
    expect((await postJson('/api/link/create', older)).status).toBe(201)
    expect((await postJson('/api/link/create', newer)).status).toBe(201)
    const response = await fetchWithAuth(`/api/link/list?tag=${tag}`)
    const data = await response.json() as { links: Link[] }
    expect(data.links.map(link => link.slug)).toEqual([newer.slug, older.slug])
  })

  it('normalizes tags and supports create, edit, query, list, search, tag counts, and export/import', async () => {
    const slug = trackSlug(`tags-${crypto.randomUUID()}`)
    const tag = `topic-${crypto.randomUUID().slice(0, 8)}`
    const response = await postJson('/api/link/create', {
      slug,
      url: `https://example.com/${slug}`,
      tags: [` ${tag.toUpperCase()} `, tag, ' Second '],
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ link: { tags: [tag, 'second'] } })
    const query = await fetchWithAuth(`/api/link/query?slug=${slug}`)
    expect(await query.json()).toMatchObject({ slug, tags: ['second', tag] })
    const filtered = await fetchWithAuth(`/api/link/list?tag=${encodeURIComponent(tag)}`)
    expect(await filtered.json()).toMatchObject({ links: [expect.objectContaining({ slug, tags: ['second', tag] })] })
    const search = await fetchWithAuth(`/api/link/search?q=${encodeURIComponent(tag.toUpperCase())}`)
    expect(await search.json()).toContainEqual(expect.objectContaining({ slug, tags: ['second', tag] }))
    const tagList = await fetchWithAuth('/api/link/tags')
    expect(await tagList.json()).toContainEqual({ name: tag, count: 1 })

    const edit = await putJson('/api/link/edit', {
      slug,
      url: `https://example.com/${slug}/edited`,
      tags: [' Replacement ', 'replacement'],
    })
    expect(edit.status).toBe(201)
    expect(await edit.json()).toMatchObject({ link: { tags: ['replacement'] } })
    await expect((await fetchWithAuth(`/api/link/list?tag=${encodeURIComponent(tag)}`)).json()).resolves.toMatchObject({ links: [] })

    const exportedResponse = await fetchWithAuth('/api/link/export')
    const exported = await exportedResponse.json() as { links: Link[] }
    const exportedLink = exported.links.find(link => link.slug === slug)
    expect(exportedLink?.tags).toEqual(['replacement'])
    expect((await postJson('/api/link/delete', { slug })).status).toBe(204)
    const imported = await postJson('/api/link/import', { version: '1.0', links: [exportedLink] })
    expect(await imported.json()).toMatchObject({ success: 1 })
    expect(await (await fetchWithAuth(`/api/link/query?slug=${slug}`)).json()).toMatchObject({ tags: ['replacement'] })

    const legacySlug = trackSlug(`legacy-import-${crypto.randomUUID()}`)
    const legacy = await postJson('/api/link/import', { version: '1.0', links: [{ slug: legacySlug, url: 'https://example.com/legacy' }] })
    expect(await legacy.json()).toMatchObject({ success: 1 })
    expect(await (await fetchWithAuth(`/api/link/query?slug=${legacySlug}`)).json()).toMatchObject({ tags: [] })
  })

  it('lists expiration statuses and reactivates an expired link without changing its id', async () => {
    const now = Math.floor(Date.now() / 1000)
    const tag = `expiry-${crypto.randomUUID().slice(0, 8)}`
    const active = makeLink(undefined, { tags: [tag] })
    const expired = makeLink(undefined, { expiration: now + 3600, tags: [tag] })
    expect((await postJson('/api/link/create', active)).status).toBe(201)
    expect((await postJson('/api/link/create', expired)).status).toBe(201)
    await db.update(links).set({ expiration: now - 1, effectiveExpiresAt: now - 1 }).where(eq(links.slug, expired.slug))
    await env.KV.delete(`link:${expired.slug}`)
    const list = async (status?: string) => {
      const suffix = status ? `&status=${status}` : ''
      const response = await fetchWithAuth(`/api/link/list?tag=${tag}${suffix}`)
      return (await response.json() as { links: Link[] }).links.map(link => link.slug)
    }
    expect(await list()).toEqual([active.slug])
    expect(await list('active')).toEqual([active.slug])
    expect(await list('expired')).toEqual([expired.slug])
    expect(new Set(await list('all'))).toEqual(new Set([active.slug, expired.slug]))
    expect((await fetch(`/${expired.slug}`, { redirect: 'manual' })).status).toBe(404)

    const queried = await (await fetchWithAuth(`/api/link/query?slug=${expired.slug}`)).json() as Link
    expect(queried.id).toBe(expired.id)
    const edit = await putJson('/api/link/edit', {
      slug: expired.slug,
      url: expired.url,
      expiration: now + 7200,
      tags: [tag],
    })
    expect(edit.status).toBe(201)
    const restored = await edit.json() as { link: Link }
    expect(restored.link.id).toBe(expired.id)
    const redirect = await fetch(`/${expired.slug}`, { redirect: 'manual' })
    expect(redirect.status).toBeGreaterThanOrEqual(300)
    expect(redirect.status).toBeLessThan(400)
    expect(redirect.headers.get('Location')).toBe(expired.url)
  })

  it('serves legacy KV redirects before migration without mutating storage', async () => {
    await clearLinkMigrationState()
    const link = makeLink(undefined, { tags: ['legacy-tag'] })
    await putKvLink(link)
    const before = await env.KV.getWithMetadata(`link:${link.slug}`)

    const redirect = await fetch(`/${link.slug}`, { redirect: 'manual' })

    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('Location')).toBe(link.url)
    expect(await getD1Link(link.slug)).toBeNull()
    expect(await env.KV.getWithMetadata(`link:${link.slug}`)).toEqual(before)
  })

  it('uses KV metadata expiration as an override and payload expiration as fallback', async () => {
    await clearLinkMigrationState()
    const now = Math.floor(Date.now() / 1000)
    const metadataActive = makeLink(undefined, { expiration: now - 60 })
    const metadataExpired = makeLink(undefined, { expiration: now + 3600 })
    const payloadActive = makeLink(undefined, { expiration: now + 3600 })
    const payloadExpired = makeLink(undefined, { expiration: now - 60 })
    await putKvLink(metadataActive, { metadataExpiration: now + 3600 })
    await putKvLink(metadataExpired, { metadataExpiration: now - 60 })
    await env.KV.put(`link:${payloadActive.slug}`, JSON.stringify(payloadActive))
    await env.KV.put(`link:${payloadExpired.slug}`, JSON.stringify(payloadExpired))

    const activeRedirect = await fetch(`/${metadataActive.slug}`, { redirect: 'manual' })
    expect(activeRedirect.status).toBe(301)
    expect(activeRedirect.headers.get('Location')).toBe(metadataActive.url)
    expect((await fetch(`/${metadataExpired.slug}`, { redirect: 'manual' })).status).toBe(404)
    expect((await fetch(`/${payloadActive.slug}`, { redirect: 'manual' })).status).toBe(301)
    expect((await fetch(`/${payloadExpired.slug}`, { redirect: 'manual' })).status).toBe(404)
    expect(await getStoredLink(metadataExpired.slug)).not.toBeNull()
    expect(await getStoredLink(payloadExpired.slug)).not.toBeNull()
  })

  it('hides partial D1 rows and locks management APIs before migration', async () => {
    await clearLinkMigrationState()
    const link = makeLink()
    await insertD1Link(link)
    await env.KV.delete(`link:${link.slug}`)

    expect((await fetch(`/${link.slug}`, { redirect: 'manual' })).status).toBe(404)
    expect(await getStoredLink(link.slug)).toBeNull()
    expect((await fetchWithAuth(`/api/link/query?slug=${link.slug}`)).status).toBe(423)
    expect((await fetchWithAuth('/api/link/list')).status).toBe(423)
    expect((await fetch(`/api/link/query?slug=${link.slug}`)).status).toBe(401)

    const status = await fetchWithAuth('/api/link/migration/status')
    expect(status.status).toBe(200)
    expect(await status.json()).toEqual({ completed: false, marker: null })
    expect((await postJson('/api/link/migration/run', { cursor: 'raw-cursor' })).status).toBe(400)
  })

  it('unlocks management APIs from a completed D1 run', async () => {
    expect((await fetchWithAuth('/api/link/list')).status).toBe(200)
    const status = await fetchWithAuth('/api/link/migration/status')
    expect(status.status).toBe(200)
    expect(await status.json()).toMatchObject({
      completed: true,
      marker: {
        version: 1,
        scanned: 0,
        inserted: 0,
        skipped: 0,
        expired: 0,
      },
    })

    const [before] = await db.select({ count: count() }).from(linkMigrationRuns)
    const run = await postJson('/api/link/migration/run', {})
    expect(await run.json()).toMatchObject({ completed: true, list_complete: true })
    const [after] = await db.select({ count: count() }).from(linkMigrationRuns)
    expect(after?.count).toBe(before?.count)
  })

  it('falls back to D1 for redirects when the completed D1 run has no KV cache', async () => {
    const link = makeLink()
    await insertD1Link(link)
    await env.KV.delete(`link:${link.slug}`)

    const redirect = await fetch(`/${link.slug}`, { redirect: 'manual' })
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('Location')).toBe(link.url)
    expect(await getStoredLink(link.slug)).toMatchObject({ slug: link.slug, url: link.url })
  })

  it('writes legacy KV links to D1 only through explicit migration', async () => {
    await clearLinkMigrationState()
    const link = makeLink(undefined, { tags: ['legacy-tag'] })
    await putKvLink(link)

    expect((await fetch(`/${link.slug}`, { redirect: 'manual' })).status).toBe(301)
    expect((await fetchWithAuth(`/api/link/query?slug=${link.slug}`)).status).toBe(423)
    expect(await getD1Link(link.slug)).toBeNull()

    await runMigration(false)

    expect(await getD1Link(link.slug)).toMatchObject({ slug: link.slug, url: link.url })
    const query = await fetchWithAuth(`/api/link/query?slug=${link.slug}`)
    expect(query.status).toBe(200)
    expect(await query.json()).toMatchObject({ tags: ['legacy-tag'] })
  })

  it('does not let a conflicting edit overwrite tags from the successful edit', async () => {
    const link = makeLink()
    expect((await postJson('/api/link/create', link)).status).toBe(201)

    const edits = [
      { slug: link.slug, url: link.url, tags: ['a-one', 'a-two'] },
      { slug: link.slug, url: link.url, tags: ['b-one', 'b-two'] },
    ]
    const responses = await Promise.all(edits.map(edit => putJson('/api/link/edit', edit)))
    expect(responses.every(response => response.status === 201 || response.status === 409)).toBe(true)
    expect(responses.some(response => response.status === 201)).toBe(true)
    const successfulTags = await Promise.all(responses.map(async (response) => {
      if (response.status !== 201)
        return null
      return ((await response.json()) as { link: Link }).link.tags
    }))
    const stored = await (await fetchWithAuth(`/api/link/query?slug=${link.slug}`)).json() as Link
    expect(successfulTags).toContainEqual(stored.tags)
    const failedIndex = responses.findIndex(response => response.status === 409)
    if (failedIndex >= 0)
      expect(stored.tags).not.toEqual(edits[failedIndex]!.tags)
  })

  it('does not apply stale KV tags when force migration skips an existing D1 link', async () => {
    await clearLinkMigrationState()
    const existingTag = `existing-${crypto.randomUUID().slice(0, 8)}`
    const staleTag = `stale-${crypto.randomUUID().slice(0, 8)}`
    const link = makeLink(undefined, { tags: [existingTag] })
    await insertD1Link(link)
    await db.batch([
      db.insert(tags).values({ name: existingTag }),
      db.insert(linkTags).values({ linkSlug: link.slug, tagName: existingTag }),
    ])
    await putKvLink({ ...link, tags: [staleTag] })

    const pages = await runMigration(true)
    expect(pages.reduce((sum, page) => sum + page.skipped, 0)).toBeGreaterThanOrEqual(1)
    const stored = await (await fetchWithAuth(`/api/link/query?slug=${link.slug}`)).json() as Link
    expect(stored.tags).toEqual([existingTag])
    expect((await db.select({ name: tags.name }).from(tags).where(eq(tags.name, staleTag)).limit(1))[0] ?? null).toBeNull()
    const tagList = await (await fetchWithAuth('/api/link/tags')).json() as { name: string, count: number }[]
    expect(tagList.some(tag => tag.name === staleTag)).toBe(false)
  })

  it('protects migration endpoints and rejects raw or forged cursors', async () => {
    await clearLinkMigrationState()
    expect((await fetch('/api/link/migration/status')).status).toBe(401)
    expect((await postJson('/api/link/migration/run', {}, false)).status).toBe(401)
    expect((await postJson('/api/link/migration/run', { cursor: 'raw-cursor' })).status).toBe(400)
    const forged = `migration:v1:${btoa(JSON.stringify({ runId: crypto.randomUUID() }))}`
    expect((await postJson('/api/link/migration/run', { cursor: forged })).status).toBe(409)
  })

  it('paginates auto and force migrations, aggregates the completed run, and skips existing D1 rows', async () => {
    await clearLinkMigrationState()
    const prefix = `paged-${crypto.randomUUID()}-`
    const links = Array.from({ length: 105 }, (_, index) => makeLink(`${prefix}${String(index).padStart(3, '0')}`))
    await Promise.all(links.map(link => putKvLink(link)))
    await insertD1Link(links[0]!)

    const pages = await runMigration(false)
    expect(pages.length).toBeGreaterThan(1)
    expect(pages[0]?.scanned).toBeLessThanOrEqual(40)
    const totals = pages.reduce((sum, page) => ({
      scanned: sum.scanned + page.scanned,
      inserted: sum.inserted + page.inserted,
      skipped: sum.skipped + page.skipped,
      expired: sum.expired + page.expired,
    }), { scanned: 0, inserted: 0, skipped: 0, expired: 0 })
    const status = await (await fetchWithAuth('/api/link/migration/status')).json() as LinkMigrationStatus
    expect(status.marker).toMatchObject(totals)
    expect(await getD1Link(links.at(-1)!.slug)).not.toBeNull()

    const forced = await runMigration(true)
    expect(forced.reduce((sum, page) => sum + page.inserted, 0)).toBe(0)
    expect(forced.reduce((sum, page) => sum + page.skipped, 0)).toBeGreaterThanOrEqual(links.length)
  }, 30_000)

  it('does not restore a tombstoned link to D1 during migration', async () => {
    const link = makeLink()
    expect((await postJson('/api/link/create', { slug: link.slug, url: link.url })).status).toBe(201)
    expect((await postJson('/api/link/delete', { slug: link.slug })).status).toBe(204)
    await putKvLink(link)
    await runMigration(true)

    const redirect = await fetch(`/${link.slug}`, { redirect: 'manual' })
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('Location')).toBe(link.url)
    expect(await getStoredLink(link.slug)).toMatchObject({ slug: link.slug })
    expect(await getD1Link(link.slug)).toBeNull()
    expect((await db.select({ slug: linkTombstones.slug }).from(linkTombstones).where(eq(linkTombstones.slug, link.slug)).limit(1))[0] ?? null).not.toBeNull()
  })

  it('counts expired KV migration entries and imports expired links', async () => {
    await clearLinkMigrationState()
    const expired = makeLink(undefined, { expiration: Math.floor(Date.now() / 1000) - 60 })
    await putKvLink(expired)
    const pages = await runMigration(true)
    expect(pages.reduce((sum, page) => sum + page.expired, 0)).toBeGreaterThanOrEqual(1)
    expect(await getD1Link(expired.slug)).toBeNull()

    const imported = makeLink(undefined, { expiration: Math.floor(Date.now() / 1000) - 60 })
    const response = await postJson('/api/link/import', { version: '1.0', links: [imported] })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: 1, failed: 0 })
    expect(await getD1Link(imported.slug)).toMatchObject({ id: imported.id, effectiveExpiresAt: imported.expiration })
    expect(await getStoredLink(imported.slug)).toBeNull()
  })

  it('exports and reimports an expired link with its identity and tags', async () => {
    const now = Math.floor(Date.now() / 1000)
    const tag = `archive-${crypto.randomUUID().slice(0, 8)}`
    const link = makeLink(undefined, { expiration: now + 3600, tags: [tag] })
    expect((await postJson('/api/link/create', link)).status).toBe(201)
    await db.update(links).set({ expiration: now - 60, effectiveExpiresAt: now - 60 }).where(eq(links.slug, link.slug))
    await env.KV.delete(`link:${link.slug}`)
    const exported = await (await fetchWithAuth('/api/link/export')).json() as { links: Link[] }
    const archived = exported.links.find(item => item.slug === link.slug)
    expect(archived).toMatchObject({ id: link.id, tags: [tag], expiration: now - 60 })
    expect((await postJson('/api/link/delete', { slug: link.slug })).status).toBe(204)
    const imported = await postJson('/api/link/import', { version: '1.0', links: [archived] })
    expect(await imported.json()).toMatchObject({ success: 1, failed: 0 })

    const expiredList = await (await fetchWithAuth(`/api/link/list?status=expired&tag=${tag}`)).json() as { links: Link[] }
    expect(expiredList.links).toContainEqual(expect.objectContaining({ slug: link.slug, id: link.id, tags: [tag] }))
    const activeList = await (await fetchWithAuth(`/api/link/list?status=active&tag=${tag}`)).json() as { links: Link[] }
    expect(activeList.links).toEqual([])
    expect((await fetch(`/${link.slug}`, { redirect: 'manual' })).status).toBe(404)
    expect(await getStoredLink(link.slug)).toBeNull()
  })

  it('preserves native KV expiration when migrating to D1', async () => {
    await clearLinkMigrationState()
    const link = makeLink()
    const nativeExpiration = Math.floor(Date.now() / 1000) + 3600
    await putKvLink(link, { nativeExpiration })

    await runMigration(true)

    expect(await getD1Link(link.slug)).toMatchObject({ effectiveExpiresAt: nativeExpiration })
  })

  it('replaces expired rows during import without overwriting active rows', async () => {
    const now = Math.floor(Date.now() / 1000)
    const expired = makeLink()
    await insertD1Link(expired, now - 1)
    const replacement = makeLink(expired.slug, { url: 'https://example.com/replacement' })

    const replacedResponse = await postJson('/api/link/import', { version: '1.0', links: [replacement] })
    expect(await replacedResponse.json()).toMatchObject({ success: 1, skipped: 0 })
    expect(await getD1Link(expired.slug)).toMatchObject({ id: replacement.id, url: replacement.url })

    const active = makeLink()
    await insertD1Link(active)
    const conflicting = makeLink(active.slug, { url: 'https://example.com/conflict' })
    const skippedResponse = await postJson('/api/link/import', { version: '1.0', links: [conflicting] })
    expect(await skippedResponse.json()).toMatchObject({ success: 0, skipped: 1 })
    expect(await getD1Link(active.slug)).toMatchObject({ id: active.id, url: active.url })
  })

  it('does not mutate tags or tombstones when the same id conflicts', async () => {
    const oldTag = `old-${crypto.randomUUID().slice(0, 8)}`
    const newTag = `new-${crypto.randomUUID().slice(0, 8)}`
    const link = makeLink(undefined, { tags: [oldTag] })
    expect((await postJson('/api/link/create', link)).status).toBe(201)
    await db.insert(linkTombstones).values({ slug: link.slug, deletedAt: link.createdAt })

    const response = await postJson('/api/link/import', { version: '1.0', links: [{ ...link, tags: [newTag] }] })

    expect(await response.json()).toMatchObject({ success: 0, skipped: 1 })
    expect((await (await fetchWithAuth(`/api/link/query?slug=${link.slug}`)).json() as Link).tags).toEqual([oldTag])
    expect((await db.select({ slug: linkTombstones.slug }).from(linkTombstones).where(eq(linkTombstones.slug, link.slug)).limit(1))[0] ?? null).not.toBeNull()
    expect((await db.select({ name: tags.name }).from(tags).where(eq(tags.name, newTag)).limit(1))[0] ?? null).toBeNull()
  })

  it('uses the mixed-direction newest index', async () => {
    const plan = await env.DB.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM links
      WHERE (effective_expires_at IS NULL OR effective_expires_at > ?)
        AND (created_at < ? OR (created_at = ? AND slug > ?))
      ORDER BY created_at DESC, slug ASC
      LIMIT 10
    `).bind(Math.floor(Date.now() / 1000), 100, 100, 'cursor-slug').all<{ detail: string }>()
    expect(plan.results.some(row => row.detail.includes('links_created_at_desc_slug_idx'))).toBe(true)
  })

  it('recreates a deleted link by JSON import and clears its tombstone', async () => {
    const link = makeLink()
    expect((await postJson('/api/link/create', { slug: link.slug, url: link.url })).status).toBe(201)
    expect((await postJson('/api/link/delete', { slug: link.slug })).status).toBe(204)

    const response = await postJson('/api/link/import', { version: '1.0', links: [link] })
    expect(await response.json()).toMatchObject({ success: 1, skipped: 0 })
    expect(await getD1Link(link.slug)).toMatchObject({ slug: link.slug, url: link.url })
    expect((await db.select({ slug: linkTombstones.slug }).from(linkTombstones).where(eq(linkTombstones.slug, link.slug)).limit(1))[0] ?? null).toBeNull()
  })

  it('removes a failed migration run without recording completion', async () => {
    await clearLinkMigrationState()
    const invalidKey = `link:invalid-${crypto.randomUUID()}`
    await env.KV.put(invalidKey, JSON.stringify({ invalid: true }))

    let cursor: string | undefined
    let result: LinkMigrationRunResult
    do {
      const response = await postJson('/api/link/migration/run', { force: true, cursor })
      result = await response.json() as LinkMigrationRunResult
      cursor = result.cursor
    } while (result.failed === 0 && cursor)

    expect(result.failed).toBeGreaterThanOrEqual(1)
    expect(result.cursor).toBeUndefined()
    expect((await db.select({ id: linkMigrationRuns.id }).from(linkMigrationRuns).limit(1))[0] ?? null).toBeNull()

    await env.KV.delete(invalidKey)
    const retry = await runMigration(true)
    expect(retry.at(-1)?.completed).toBe(true)
  })

  it('serves and force-migrates legacy KV links missing stored fields', async () => {
    await clearLinkMigrationState()
    const publicSlug = trackSlug(`legacy-public-${crypto.randomUUID()}`)
    const migrationSlug = trackSlug(`legacy-force-${crypto.randomUUID()}`)
    await env.KV.put(`link:${publicSlug}`, JSON.stringify({ url: 'https://example.com/public', tags: [] }))
    await env.KV.put(`link:${migrationSlug}`, JSON.stringify({ id: '  ', url: 'https://example.com/force', createdAt: '', updatedAt: null, tags: [] }))

    const redirect = await fetch(`/${publicSlug}`, { redirect: 'manual' })
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('Location')).toBe('https://example.com/public')
    expect(await getD1Link(publicSlug)).toBeNull()

    const pages = await runMigration(true)
    expect(pages.reduce((sum, page) => sum + page.failed, 0)).toBe(0)
    expect(await getD1Link(publicSlug)).toMatchObject({ slug: publicSlug, url: 'https://example.com/public' })
    const migrated = await getD1Link(migrationSlug)
    expect(migrated).toMatchObject({ slug: migrationSlug, url: 'https://example.com/force' })
    expect(migrated?.id).not.toBe('')
    expect(migrated?.createdAt).toEqual(expect.any(Number))
    expect(migrated?.updatedAt).toEqual(expect.any(Number))
  })

  it('keeps malformed legacy KV data when compatibility parsing fails', async () => {
    await clearLinkMigrationState()
    const slug = trackSlug(`malformed-legacy-${crypto.randomUUID()}`)
    await env.KV.put(`link:${slug}`, JSON.stringify({ url: 'not-a-url', tags: [] }))

    expect((await fetch(`/${slug}`, { redirect: 'manual' })).status).toBe(404)
    expect(await env.KV.get(`link:${slug}`)).not.toBeNull()
    const response = await postJson('/api/link/migration/run', { force: true })
    const result = await response.json() as LinkMigrationRunResult
    expect(result.failed).toBeGreaterThanOrEqual(1)
  })

  it('supports all D1 sorts and stable keyset pagination', async () => {
    const prefix = `sort-${crypto.randomUUID()}-`
    const links = [
      makeLink(`${prefix}b`, { createdAt: 20, updatedAt: 20 }),
      makeLink(`${prefix}a`, { createdAt: 10, updatedAt: 10 }),
      makeLink(`${prefix}c`, { createdAt: 20, updatedAt: 20 }),
    ]
    await Promise.all(links.map(link => insertD1Link(link)))
    const expected = {
      az: [`${prefix}a`, `${prefix}b`, `${prefix}c`],
      za: [`${prefix}c`, `${prefix}b`, `${prefix}a`],
      newest: [`${prefix}b`, `${prefix}c`, `${prefix}a`],
      oldest: [`${prefix}a`, `${prefix}b`, `${prefix}c`],
    }
    for (const [sort, order] of Object.entries(expected)) {
      const response = await fetchWithAuth(`/api/link/list?limit=1000&sort=${sort}`)
      const data = await response.json() as { links: Link[] }
      expect(data.links.filter(link => link.slug.startsWith(prefix)).map(link => link.slug)).toEqual(order)
    }

    const seen = new Set<string>()
    let cursor: string | undefined
    do {
      const response = await fetchWithAuth(`/api/link/list?limit=2&sort=az${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
      const page = await response.json() as { links: Link[], cursor?: string, list_complete: boolean }
      for (const link of page.links) {
        expect(seen.has(link.slug)).toBe(false)
        seen.add(link.slug)
      }
      cursor = page.cursor
      if (page.list_complete)
        break
    } while (cursor)
    expect(links.every(link => seen.has(link.slug))).toBe(true)

    const first = await fetchWithAuth('/api/link/list?limit=1&sort=az')
    const firstPage = await first.json() as { cursor: string }
    expect((await fetchWithAuth(`/api/link/list?limit=1&sort=za&cursor=${encodeURIComponent(firstPage.cursor)}`)).status).toBe(400)
  })

  it('requires a non-empty keyword or exact URL search selector', async () => {
    const tag = `guard-${crypto.randomUUID().slice(0, 8)}`
    const link = makeLink(undefined, { tags: [tag] })
    expect((await postJson('/api/link/create', link)).status).toBe(201)

    for (const path of [
      '/api/link/search',
      `/api/link/search?q=${encodeURIComponent('   ')}`,
      `/api/link/search?tag=${tag}&status=all`,
    ]) {
      const response = await fetchWithAuth(path)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual([])
    }
  })

  it('searches D1 case-insensitively with normalized exact URLs and limits results', async () => {
    const prefix = `Search-${crypto.randomUUID()}`
    const matches = Array.from({ length: 21 }, (_, index) => makeLink(`${prefix}-${index.toString().padStart(2, '0')}`, {
      comment: index === 0 ? 'Mixed Needle' : `mixed needle ${index}`,
    }))
    await Promise.all(matches.map(link => insertD1Link(link)))
    const query = await fetchWithAuth(`/api/link/search?q=${encodeURIComponent('mIxEd nEeDlE')}`)
    const queryData = await query.json() as Link[]
    expect(queryData).toHaveLength(20)
    expect(queryData).toContainEqual(expect.objectContaining({ slug: matches[0].slug }))
    expect(queryData.every(link => link.slug.startsWith(prefix))).toBe(true)

    const exactLink = makeLink(undefined, { url: `https://exact.example/${crypto.randomUUID()}?stored=1` })
    await insertD1Link(exactLink)
    const exact = await fetchWithAuth(`/api/link/search?url=${encodeURIComponent(exactLink.url.replace('stored=1', 'ignored=1'))}`)
    expect(await exact.json()).toEqual([expect.objectContaining({ slug: exactLink.slug })])
  })

  it('filters search results by normalized tag and expiration status', async () => {
    const now = Math.floor(Date.now() / 1000)
    const tag = `search-${crypto.randomUUID().slice(0, 8)}`
    const query = `shared-${crypto.randomUUID().slice(0, 8)}`
    const active = makeLink(undefined, { comment: query, tags: [tag] })
    const expired = makeLink(undefined, { comment: query, expiration: now + 3600, tags: [tag] })
    expect((await postJson('/api/link/create', active)).status).toBe(201)
    expect((await postJson('/api/link/create', expired)).status).toBe(201)
    await db.update(links).set({ expiration: now - 1, effectiveExpiresAt: now - 1 }).where(eq(links.slug, expired.slug))
    await env.KV.delete(`link:${expired.slug}`)
    const search = async (status?: string, requestedTag = tag.toUpperCase()) => {
      const statusQuery = status ? `&status=${status}` : ''
      const response = await fetchWithAuth(`/api/link/search?q=${query}&tag=${requestedTag}${statusQuery}`)
      return (await response.json() as Link[]).map(link => link.slug)
    }
    expect(await search()).toEqual([active.slug])
    expect(await search('active')).toEqual([active.slug])
    expect(await search('expired')).toEqual([expired.slug])
    expect(new Set(await search('all'))).toEqual(new Set([active.slug, expired.slug]))
    expect(await search('all', 'missing')).toEqual([])
  })

  it('rejects search patterns longer than 48 UTF-8 bytes', async () => {
    expect((await fetchWithAuth(`/api/link/search?q=${encodeURIComponent('a'.repeat(48))}`)).status).toBe(200)
    expect((await fetchWithAuth(`/api/link/search?q=${encodeURIComponent('%'.repeat(24))}`)).status).toBe(200)
    expect((await fetchWithAuth(`/api/link/search?q=${encodeURIComponent('%'.repeat(25))}`)).status).toBe(400)
    expect((await fetchWithAuth(`/api/link/search?q=${encodeURIComponent('界'.repeat(17))}`)).status).toBe(400)
    expect((await fetchWithAuth(`/api/link/search?q=${encodeURIComponent('İ'.repeat(16))}`)).status).toBe(200)
    expect((await fetchWithAuth(`/api/link/search?q=${encodeURIComponent('İ'.repeat(17))}`)).status).toBe(400)
  })

  it('fills KV from a D1 redirect miss without leaking internal fields', async () => {
    const active = makeLink()
    await insertD1Link(active)
    await env.KV.delete(`link:${active.slug}`)
    const redirect = await fetch(`/${active.slug}`, { redirect: 'manual' })
    expect(redirect.status).toBeGreaterThanOrEqual(300)
    const cached = await getStoredLink(active.slug)
    expect(cached).toMatchObject(active)
    expect(cached).not.toHaveProperty('normalizedUrl')
    expect(cached).not.toHaveProperty('effectiveExpiresAt')

    const expired = makeLink()
    await insertD1Link(expired, Math.floor(Date.now() / 1000) - 1)
    await env.KV.delete(`link:${expired.slug}`)
    expect((await fetch(`/${expired.slug}`, { redirect: 'manual' })).status).toBe(404)
    expect(await getStoredLink(expired.slug)).toBeNull()
  })

  it('binds a continuation cursor to the original force mode even after a completed run appears', async () => {
    await clearLinkMigrationState()
    const prefix = `mode-${crypto.randomUUID()}-`
    await Promise.all(Array.from({ length: 101 }, (_, index) => putKvLink(makeLink(`${prefix}${index}`))))
    const firstResponse = await postJson('/api/link/migration/run', { force: true })
    const first = await firstResponse.json() as LinkMigrationRunResult
    expect(first.cursor).toBeDefined()
    const now = Math.floor(Date.now() / 1000)
    await db.insert(linkMigrationRuns).values({
      id: `test-concurrent-completed-${crypto.randomUUID()}`,
      expectedCursor: null,
      scanned: 0,
      inserted: 0,
      skipped: 0,
      expired: 0,
      force: false,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    })

    expect((await postJson('/api/link/migration/run', { cursor: first.cursor, force: false })).status).toBe(400)
    expect((await postJson('/api/link/migration/run', { cursor: first.cursor, force: true })).status).toBe(200)
  }, 20_000)
})
