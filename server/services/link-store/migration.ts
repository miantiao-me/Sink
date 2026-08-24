import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import type { LinkMigrationMarker } from '#shared/schemas/link-migration'
import { desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { linkMigrationRuns } from '../../database/schema'
import { buildD1LinkValues } from './d1'

export async function readCompletedLinkMigrationMarker(env: Cloudflare.Env): Promise<LinkMigrationMarker | null> {
  const [run] = await drizzle(env.DB)
    .select({
      scanned: linkMigrationRuns.scanned,
      inserted: linkMigrationRuns.inserted,
      skipped: linkMigrationRuns.skipped,
      expired: linkMigrationRuns.expired,
      updatedAt: linkMigrationRuns.updatedAt,
    })
    .from(linkMigrationRuns)
    .where(eq(linkMigrationRuns.status, 'completed'))
    .orderBy(desc(linkMigrationRuns.updatedAt), desc(linkMigrationRuns.createdAt), desc(linkMigrationRuns.id))
    .limit(1)

  if (!run)
    return null

  return {
    version: 1,
    completedAt: new Date(run.updatedAt * 1000).toISOString(),
    scanned: run.scanned,
    inserted: run.inserted,
    skipped: run.skipped,
    expired: run.expired,
  }
}

export async function insertMigratedKvLink(event: H3Event, link: Link, effectiveExpiresAt?: number): Promise<boolean> {
  const values = buildD1LinkValues(event, link, effectiveExpiresAt)
  const { DB } = event.context.cloudflare.env
  const insert = DB.prepare(`
    INSERT INTO links (
      slug, id, url, comment, created_at, updated_at, expiration, title,
      description, image, apple, google, cloaking, redirect_with_query,
      password, unsafe, geo, normalized_url, effective_expires_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM link_tombstones WHERE slug = ?)
    ON CONFLICT(slug) DO NOTHING
  `).bind(
    values.slug,
    values.id,
    values.url,
    values.comment,
    values.createdAt,
    values.updatedAt,
    values.expiration,
    values.title,
    values.description,
    values.image,
    values.apple,
    values.google,
    values.cloaking === null ? null : Number(values.cloaking),
    values.redirectWithQuery === null ? null : Number(values.redirectWithQuery),
    values.password,
    values.unsafe === null ? null : Number(values.unsafe),
    values.geo === null ? null : JSON.stringify(values.geo),
    values.normalizedUrl,
    values.effectiveExpiresAt,
    values.slug,
  )
  // Each tag statement relies on the preceding SQLite changes() result to keep the tombstone-guarded link and tags atomic.
  const tagStatements = link.tags.flatMap(tag => [
    DB.prepare(`
      INSERT INTO tags (name)
      SELECT ? WHERE changes() = 1
      ON CONFLICT(name) DO UPDATE SET name = excluded.name
    `).bind(tag),
    DB.prepare(`
      INSERT INTO link_tags (link_slug, tag_name)
      SELECT ?, ? WHERE changes() = 1
      ON CONFLICT(link_slug, tag_name) DO UPDATE SET tag_name = excluded.tag_name
    `).bind(link.slug, tag),
  ])
  const [result] = await DB.batch([insert, ...tagStatements])
  return (result?.meta.changes ?? 0) > 0
}
