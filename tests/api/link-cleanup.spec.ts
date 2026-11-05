import { env } from 'cloudflare:workers'
import { eq, inArray } from 'drizzle-orm'
import { chunk } from 'es-toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { links, linkTags, linkTombstones, tags } from '../../server/database/schema'
import { cleanupExpiredLinks } from '../../server/utils/link-cleanup'
import { clearLinkMigrationState, db, deleteStoredLinks, getD1Link, runScheduledTasks, setLinkStoreD1Mode } from '../utils'

const now = 1800000000
const day = 86400
let slugs: string[] = []
let tag: string | undefined

async function seed(expirations: (number | null)[]) {
  const rows = expirations.map(effectiveExpiresAt => ({
    slug: `cleanup-${crypto.randomUUID()}`,
    id: crypto.randomUUID(),
    url: 'https://example.com',
    normalizedUrl: 'https://example.com',
    createdAt: now - 60 * day,
    updatedAt: now,
    expiration: now - 60 * day,
    effectiveExpiresAt,
  }))
  slugs.push(...rows.map(row => row.slug))
  for (const row of rows)
    await db.insert(links).values(row)
  return rows.map(row => row.slug)
}

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteStoredLinks(slugs)
  slugs = []
  if (tag)
    await db.delete(tags).where(eq(tags.name, tag))
  tag = undefined
  await clearLinkMigrationState()
})

describe('expired link cleanup', () => {
  it.each([undefined, null, '', ' ', '-1', '1.5', 'invalid', 'Infinity', true, '9007199254740991'])('does not delete links for disabled or invalid retention %s', async (value) => {
    await setLinkStoreD1Mode()
    const [slug] = await seed([now - 60 * day])
    expect(await cleanupExpiredLinks(env, value)).toBe(0)
    expect(await getD1Link(slug!)).not.toBeNull()
  })

  it('skips cleanup before migration completes', async () => {
    await clearLinkMigrationState()
    const [slug] = await seed([now - 60 * day])
    expect(await cleanupExpiredLinks(env, '0')).toBe(0)
    expect(await getD1Link(slug!)).not.toBeNull()
  })

  it('deletes across batches at the retention boundary and cascades tag associations', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000)
    await setLinkStoreD1Mode()
    const expired = await seed(Array.from({ length: 101 }).fill(now - 30 * day))
    const kept = await seed([now - 30 * day + 1, now - 1, now + day, null])
    tag = `cleanup-tag-${crypto.randomUUID()}`
    await db.insert(tags).values({ name: tag })
    await db.insert(linkTags).values([
      { linkSlug: expired[0]!, tagName: tag },
      { linkSlug: kept[0]!, tagName: tag },
    ])

    expect(await cleanupExpiredLinks(env, '30')).toBe(101)
    for (const batch of chunk(expired, 90)) {
      expect(await db.select().from(links).where(inArray(links.slug, batch))).toHaveLength(0)
      expect(await db.select().from(linkTombstones).where(inArray(linkTombstones.slug, batch))).toHaveLength(batch.length)
    }
    expect(await db.select().from(links).where(inArray(links.slug, kept))).toHaveLength(4)
    expect(await db.select().from(linkTags).where(eq(linkTags.tagName, tag))).toEqual([
      { linkSlug: kept[0], tagName: tag },
    ])
    expect(await cleanupExpiredLinks(env, '30')).toBe(0)
  })

  it('uses runtime bindings for scheduled cleanup', async () => {
    await setLinkStoreD1Mode()
    const [slug] = await seed([1])
    const bindings = env as Cloudflare.Env & Record<string, unknown>
    const original = bindings.NUXT_EXPIRED_LINK_RETENTION_DAYS
    const backups = new Set((await env.R2.list({ prefix: 'backups/' })).objects.map(object => object.key))

    try {
      for (const retention of ['', '0']) {
        bindings.NUXT_EXPIRED_LINK_RETENTION_DAYS = retention
        await runScheduledTasks()
        expect(await getD1Link(slug!)).toEqual(retention === '' ? expect.objectContaining({ slug }) : null)
      }
    }
    finally {
      if (original === undefined)
        delete bindings.NUXT_EXPIRED_LINK_RETENTION_DAYS
      else
        bindings.NUXT_EXPIRED_LINK_RETENTION_DAYS = original
      for (const object of (await env.R2.list({ prefix: 'backups/' })).objects) {
        if (!backups.has(object.key))
          await env.R2.delete(object.key)
      }
    }
  })

  it('allows zero days without deleting active or permanent links', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000)
    await setLinkStoreD1Mode()
    const [expired, ...kept] = await seed([now, now + 1, null])
    expect(await cleanupExpiredLinks(env, 0)).toBe(1)
    expect(await getD1Link(expired!)).toBeNull()
    expect(await db.select().from(links).where(inArray(links.slug, kept))).toHaveLength(2)
  })
})
