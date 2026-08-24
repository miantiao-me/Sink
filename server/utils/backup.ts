/// <reference path="../../worker-configuration.d.ts" />

import type { Link } from '#shared/schemas/link'
import { readCompletedLinkMigrationMarker } from '../services/link-store/migration'
import { createBackupJsonStream, uploadBackupParts } from './backup-json-stream'
import { iterateAllAuthoritativeLinks } from './link-store'

export interface BackupData {
  version: string
  exportedAt: string
  count: number
  links: Link[]
}

export type BackupResult
  = | { completed: true, filename: string, count: number }
    | { completed: false, reason: 'migration-incomplete' | 'r2-not-configured' }

async function runCleanup(action: string, cleanup: () => Promise<unknown>): Promise<void> {
  try {
    await cleanup()
  }
  catch (error) {
    console.warn(`[backup] Failed to ${action}`, error)
  }
}

export async function backupLinksToR2(env: Cloudflare.Env, isManual: boolean = false): Promise<BackupResult> {
  if (!await readCompletedLinkMigrationMarker(env)) {
    console.info('[backup] Link migration is incomplete, skipping backup')
    return { completed: false, reason: 'migration-incomplete' }
  }

  if (!env.R2) {
    console.info('[backup] R2 binding not configured, skipping backup')
    return { completed: false, reason: 'r2-not-configured' }
  }

  const now = new Date()
  const backupMetadata = {
    version: '1.0',
    exportedAt: now.toISOString(),
  }

  const timestamp = now.toISOString().replace(/:/g, '-')
  const prefix = isManual ? 'manual-links-' : 'links-'
  const filename = `backups/${prefix}${timestamp}.json`

  const backup = createBackupJsonStream(iterateAllAuthoritativeLinks(env), backupMetadata)
  const stagingKey = `${filename}.pending-${crypto.randomUUID()}`
  const upload = await env.R2.createMultipartUpload(stagingKey, {
    httpMetadata: { contentType: 'application/json' },
  })
  let count: number
  let uploadCompleted = false
  try {
    const parts = await uploadBackupParts(upload, backup.stream)
    count = await backup.count
    await upload.complete(parts)
    uploadCompleted = true

    const staged = await env.R2.get(stagingKey)
    if (!staged)
      throw new Error('Staged backup object is missing')
    await env.R2.put(filename, staged.body, {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        count: String(count),
        exportedAt: backupMetadata.exportedAt,
      },
    })
  }
  catch (error) {
    if (!uploadCompleted)
      await runCleanup('abort multipart upload', () => upload.abort())
    await runCleanup('delete staging object', () => env.R2.delete(stagingKey))
    throw error
  }
  await runCleanup('delete staging object', () => env.R2.delete(stagingKey))

  console.info(`[backup] Backup completed: ${filename}, ${count} links`)
  return { completed: true, filename, count }
}
