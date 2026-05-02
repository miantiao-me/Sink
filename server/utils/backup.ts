/// <reference path="../../worker-configuration.d.ts" />

import type { Link } from '#shared/schemas/link'
import pLimit from 'p-limit'

export interface BackupData {
  version: string
  exportedAt: string
  count: number
  links: Link[]
}

export async function backupKVToR2(env: Cloudflare.Env, isManual: boolean = false): Promise<void> {
  if (!env.R2) {
    console.info('[backup:kv] R2 binding not configured, skipping backup')
    return
  }

  const allLinks: Link[] = []
  let cursor: string | undefined

  do {
    const list = await env.KV.list({
      prefix: 'link:',
      limit: 1000,
      cursor,
    })

    const limit = pLimit(10)
    const links = await Promise.all(
      list.keys.map(key =>
        limit(async () => {
          const value = await env.KV.get(key.name, { type: 'json' })
          return value as Link | null
        }),
      ),
    )

    allLinks.push(...links.filter((link): link is Link => link !== null))
    cursor = list.list_complete ? undefined : list.cursor
  } while (cursor)

  const now = new Date()
  const backupData: BackupData = {
    version: '1.0',
    exportedAt: now.toISOString(),
    count: allLinks.length,
    links: allLinks,
  }

  const timestamp = now.toISOString().replace(/:/g, '-')
  const prefix = isManual ? 'manual-links-' : 'links-'
  const filename = `backups/${prefix}${timestamp}.json`

  await env.R2.put(filename, JSON.stringify(backupData, null, 2), {
    httpMetadata: {
      contentType: 'application/json',
    },
    customMetadata: {
      count: String(allLinks.length),
      exportedAt: backupData.exportedAt,
    },
  })

  console.info(`[backup:kv] Backup completed: ${filename}, ${allLinks.length} links`)
}
