import { asc, inArray, lte, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { links, linkTombstones } from '../../database/schema'

const BATCH_SIZE = 100

export async function d1DeleteExpiredLinks(env: Cloudflare.Env, cutoff: number): Promise<number> {
  const db = drizzle(env.DB)
  const deletedAt = Math.floor(Date.now() / 1000)
  const candidates = db.select({ slug: links.slug }).from(links).where(lte(links.effectiveExpiresAt, cutoff)).orderBy(asc(links.slug)).limit(BATCH_SIZE)
  let deleted = 0
  while (true) {
    // Keep migration tombstones and deletion atomic, including concurrent renewals.
    const [, result] = await db.batch([
      db.insert(linkTombstones).select(
        db.select({ slug: links.slug, deletedAt: sql<number>`${deletedAt}`.as('deleted_at') })
          .from(links).where(inArray(links.slug, candidates)),
      ).onConflictDoUpdate({ target: linkTombstones.slug, set: { deletedAt } }),
      db.delete(links).where(inArray(links.slug, candidates)).returning({ slug: links.slug }),
    ])
    deleted += result.length
    if (result.length < BATCH_SIZE)
      return deleted
  }
}
