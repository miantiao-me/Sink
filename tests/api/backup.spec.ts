import type { BackupData } from '../../server/utils/backup'
import type { Link } from '../../shared/schemas/link'
import { env, exports } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { links, linkTags, tags } from '../../server/database/schema'
import { createBackupJsonStream, uploadBackupParts } from '../../server/utils/backup-json-stream'
import { clearLinkMigrationState, db, deleteStoredLinks, postJson, setLinkStoreD1Mode } from '../utils'

function getManualBackupDate(key: string) {
  const match = key.match(/^backups\/manual-links-(.+)\.json$/)
  if (!match)
    return undefined

  return new Date(match[1].replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3'))
}

async function runScheduledBackup() {
  const pending: Promise<unknown>[] = []
  const context = {
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise)
    },
    passThroughOnException() {},
    props: {},
  } as unknown as ExecutionContext
  await exports.default.scheduled?.({
    scheduledTime: Date.now(),
    cron: '0 0 * * *',
    noRetry() {},
  }, env, context)
  await Promise.all(pending)
}

describe('/api/backup', { concurrent: false }, () => {
  it('returns 401 without auth', async () => {
    const response = await postJson('/api/backup', {}, false)
    expect(response.status).toBe(401)
  })

  it('skips scheduled backups and locks manual backups before migration', async () => {
    await clearLinkMigrationState()
    const before = new Set((await env.R2.list({ prefix: 'backups/' })).objects.map(object => object.key))

    try {
      await runScheduledBackup()
      expect((await postJson('/api/backup', {})).status).toBe(423)
      const after = new Set((await env.R2.list({ prefix: 'backups/' })).objects.map(object => object.key))
      expect(after).toEqual(before)
    }
    finally {
      await clearLinkMigrationState()
    }
  })

  it('backs up all authoritative D1 links to R2', async () => {
    const now = Math.floor(Date.now() / 1000)
    const slugs = {
      active: `backup-active-${crypto.randomUUID()}`,
      expired: `backup-expired-${crypto.randomUUID()}`,
      legacy: `backup-legacy-${crypto.randomUUID()}`,
    }
    const tag = `backup-tag-${crypto.randomUUID()}`
    const pagePrefix = `backup-page-${crypto.randomUUID()}-`
    const pageSlugs = Array.from({ length: 105 }, (_, index) => `${pagePrefix}${String(index).padStart(3, '0')}`)
    const existingObjects = new Set((await env.R2.list({ prefix: 'backups/manual-links-' })).objects.map(object => object.key))
    let backupKey: string | undefined

    try {
      await setLinkStoreD1Mode()
      await db.batch([
        db.insert(links).values({ slug: slugs.active, id: crypto.randomUUID(), url: 'https://example.com/active', createdAt: now, updatedAt: now, normalizedUrl: 'https://example.com/active', effectiveExpiresAt: null }),
        db.insert(links).values({ slug: slugs.expired, id: crypto.randomUUID(), url: 'https://example.com/expired', createdAt: now, updatedAt: now, normalizedUrl: 'https://example.com/expired', effectiveExpiresAt: now - 60 }),
        db.insert(tags).values({ name: tag }),
        db.insert(linkTags).values({ linkSlug: slugs.active, tagName: tag }),
      ])
      for (let offset = 0; offset < pageSlugs.length; offset += 10) {
        await db.insert(links).values(pageSlugs.slice(offset, offset + 10).map(slug => ({
          slug,
          id: crypto.randomUUID(),
          url: `https://example.com/${slug}`,
          createdAt: now,
          updatedAt: now,
          normalizedUrl: `https://example.com/${slug}`,
          effectiveExpiresAt: null,
        })))
      }
      const legacyLink = (slug: string, url: string, tags: string[] = []): Link => ({
        id: crypto.randomUUID().slice(0, 10),
        slug,
        url,
        createdAt: now,
        updatedAt: now,
        tags,
      })
      await Promise.all([
        env.KV.put(`link:${slugs.active}`, JSON.stringify(legacyLink(slugs.active, 'https://stale.example.com'))),
        env.KV.put(`link:${slugs.legacy}`, JSON.stringify(legacyLink(slugs.legacy, 'https://example.com/legacy'))),
      ])

      const backupResponse = await postJson('/api/backup', {})
      expect(backupResponse.status).toBe(200)
      expect(await backupResponse.json()).toEqual({ success: true, message: 'Backup completed successfully' })

      const list = await env.R2.list({ prefix: 'backups/manual-links-' })
      backupKey = list.objects
        .filter(object => !existingObjects.has(object.key) && getManualBackupDate(object.key))
        .toSorted((a, b) => a.key.localeCompare(b.key))
        .at(-1)
        ?.key
      expect(backupKey).toBeDefined()

      const backupObject = backupKey ? await env.R2.get(backupKey) : null
      const backupData = await backupObject?.json() as BackupData | undefined
      expect(backupData?.count).toBe(backupData?.links.length)
      expect(backupObject?.customMetadata?.count).toBe(String(backupData?.count))
      expect(backupObject?.customMetadata?.exportedAt).toBe(backupData?.exportedAt)
      expect(backupObject?.httpMetadata?.contentType).toBe('application/json')
      expect(backupData?.links).toEqual(expect.arrayContaining([
        expect.objectContaining({ slug: slugs.active, url: 'https://example.com/active', tags: [tag] }),
        expect.objectContaining({ slug: slugs.expired, expiration: now - 60 }),
      ] satisfies Partial<Link>[]))
      expect(backupData?.links.filter(link => link.slug.startsWith(pagePrefix)).map(link => link.slug)).toEqual(pageSlugs)
      expect(backupData?.links.some(link => link.slug === slugs.legacy)).toBe(false)
    }
    finally {
      if (backupKey)
        await env.R2.delete(backupKey)
      await deleteStoredLinks([...Object.values(slugs), ...pageSlugs])
      await db.delete(tags).where(eq(tags.name, tag))
      await clearLinkMigrationState()
    }
  })

  it('streams links in one pass and writes the actual count', async () => {
    const now = Math.floor(Date.now() / 1000)
    const link: Link = {
      id: crypto.randomUUID().slice(0, 10),
      slug: `count-mismatch-${crypto.randomUUID()}`,
      url: 'https://example.com/count-mismatch',
      createdAt: now,
      updatedAt: now,
      tags: [],
    }
    let iterations = 0
    async function* links() {
      iterations++
      yield link
    }

    const backup = createBackupJsonStream(links(), {
      version: '1.0',
      exportedAt: new Date().toISOString(),
    })

    const data = JSON.parse(await new Response(backup.stream).text()) as BackupData
    await expect(backup.count).resolves.toBe(1)
    expect(iterations).toBe(1)
    expect(data.count).toBe(data.links.length)
    expect(data.links).toEqual([link])
  })

  it('creates exact 5 MiB non-final parts from irregular chunks', async () => {
    const partSize = 5 * 1024 * 1024
    const chunks = [
      new Uint8Array(partSize - 11),
      new Uint8Array(partSize + 29),
      new Uint8Array(105),
    ]
    const uploadedSizes: number[] = []
    const upload = {
      async uploadPart(partNumber: number, value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream) {
        if (!(value instanceof Uint8Array))
          throw new TypeError('Expected a byte array part')
        uploadedSizes.push(value.byteLength)
        return { partNumber, etag: `part-${partNumber}` }
      },
    } as R2MultipartUpload
    let index = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks[index++]
        if (chunk)
          controller.enqueue(chunk)
        else
          controller.close()
      },
    })

    await expect(uploadBackupParts(upload, stream)).resolves.toHaveLength(3)
    expect(uploadedSizes).toEqual([partSize, partSize, 123])
    expect(uploadedSizes.slice(0, -1).every(size => size === partSize)).toBe(true)
  })

  it('cancels the backup stream when a multipart upload fails', async () => {
    const now = Math.floor(Date.now() / 1000)
    let iteratorReturned = false
    async function* links() {
      try {
        yield {
          id: crypto.randomUUID().slice(0, 10),
          slug: `upload-failure-${crypto.randomUUID()}`,
          url: 'https://example.com/upload-failure',
          comment: 'x'.repeat(6 * 1024 * 1024),
          createdAt: now,
          updatedAt: now,
          tags: [],
        } satisfies Link
      }
      finally {
        iteratorReturned = true
      }
    }
    const backup = createBackupJsonStream(links(), {
      version: '1.0',
      exportedAt: new Date().toISOString(),
    })
    const countError = backup.count.catch(error => error)
    const upload = {
      async uploadPart() {
        throw new Error('upload failed')
      },
    } as R2MultipartUpload

    await expect(uploadBackupParts(upload, backup.stream)).rejects.toThrow('upload failed')
    expect(iteratorReturned).toBe(true)
    await expect(countError).resolves.toEqual(expect.objectContaining({ message: 'upload failed' }))
  })
})
