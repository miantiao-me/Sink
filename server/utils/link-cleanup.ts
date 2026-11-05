import { d1DeleteExpiredLinks } from '../services/link-store/cleanup'
import { readCompletedLinkMigrationMarker } from '../services/link-store/migration'

export async function cleanupExpiredLinks(env: Cloudflare.Env, retentionDays: unknown): Promise<number> {
  if (retentionDays === undefined || retentionDays === null || retentionDays === '')
    return 0

  const value = String(retentionDays).trim()
  const days = Number(value)
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(days * 86400)) {
    console.warn('[link-cleanup] NUXT_EXPIRED_LINK_RETENTION_DAYS must be a non-negative integer; skipping cleanup')
    return 0
  }

  if (!await readCompletedLinkMigrationMarker(env))
    return 0

  const deleted = await d1DeleteExpiredLinks(env, Math.floor(Date.now() / 1000) - days * 86400)
  console.info(`[link-cleanup] Deleted ${deleted} expired links`)
  return deleted
}
