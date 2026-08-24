import type { LinkMigrationRunResult } from '#shared/schemas/link-migration'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { parseLegacyKvLink } from '#shared/schemas/link'
import { LinkMigrationRunSchema } from '#shared/schemas/link-migration'
import { linkMigrationRuns } from '../../../database/schema'
import { readCompletedLinkMigrationMarker } from '../../../services/link-store/migration'

const MIGRATION_CURSOR_PREFIX = 'migration:v1:'

type MigrationRunRow = typeof linkMigrationRuns.$inferSelect

defineRouteMeta({
  openAPI: {
    description: 'Migrate one bounded page of legacy KV links to D1',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'cursor',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Opaque migration run cursor',
      },
      {
        name: 'force',
        in: 'query',
        required: false,
        schema: { type: 'boolean', default: false },
        description: 'Rescan KV without overwriting D1 rows',
      },
    ],
    requestBody: {
      required: false,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              cursor: { type: 'string', description: 'Opaque migration run cursor' },
              force: { type: 'boolean', default: false, description: 'Rescan KV without overwriting D1 rows' },
            },
          },
        },
      },
    },
  },
})

function encodeMigrationCursor(runId: string): string {
  return `${MIGRATION_CURSOR_PREFIX}${btoa(JSON.stringify({ runId }))}`
}

function decodeMigrationCursor(cursor: string): string {
  if (!cursor.startsWith(MIGRATION_CURSOR_PREFIX))
    throw createError({ status: 400, statusText: 'Invalid migration cursor' })
  try {
    const value = JSON.parse(atob(cursor.slice(MIGRATION_CURSOR_PREFIX.length))) as { runId?: unknown }
    if (typeof value.runId !== 'string' || !value.runId)
      throw new Error('Missing migration run ID')
    return value.runId
  }
  catch {
    throw createError({ status: 400, statusText: 'Invalid migration cursor' })
  }
}

function completedResult(): LinkMigrationRunResult {
  return {
    completed: true,
    list_complete: true,
    scanned: 0,
    inserted: 0,
    skipped: 0,
    expired: 0,
    failed: 0,
    failedItems: [],
  }
}

export default eventHandler(async (event): Promise<LinkMigrationRunResult> => {
  const body = await readBody<Record<string, unknown> | null>(event)
  const input = LinkMigrationRunSchema.parse(Object.assign({}, getQuery(event), body))
  const { DB, KV } = event.context.cloudflare.env
  const db = drizzle(DB)
  const now = Math.floor(Date.now() / 1000)
  let run: MigrationRunRow | null

  if (input.cursor) {
    const runId = decodeMigrationCursor(input.cursor)
    const [selectedRun] = await db.select().from(linkMigrationRuns).where(eq(linkMigrationRuns.id, runId)).limit(1)
    run = selectedRun ?? null
    if (!run)
      throw createError({ status: 409, statusText: 'Migration run no longer exists' })
    if (input.force !== run.force)
      throw createError({ status: 400, statusText: 'Migration cursor does not match force mode' })
  }
  else {
    const completedRun = await readCompletedLinkMigrationMarker(event.context.cloudflare.env)
    if (completedRun && !input.force)
      return completedResult()

    const runId = crypto.randomUUID()
    run = {
      id: runId,
      expectedCursor: null,
      scanned: 0,
      inserted: 0,
      skipped: 0,
      expired: 0,
      force: input.force,
      status: 'running',
      createdAt: now,
      updatedAt: now,
    }
    await db.insert(linkMigrationRuns).values(run)
  }

  if (run.status === 'completed')
    return completedResult()

  const page = await KV.list({ prefix: 'link:', limit: 40, cursor: run.expectedCursor ?? undefined })
  const result: LinkMigrationRunResult = {
    completed: false,
    list_complete: false,
    cursor: encodeMigrationCursor(run.id),
    scanned: page.keys.length,
    inserted: 0,
    skipped: 0,
    expired: 0,
    failed: 0,
    failedItems: [],
  }

  for (const key of page.keys) {
    try {
      const stored = await KV.getWithMetadata(key.name, { type: 'json' })
      const parsed = parseLegacyKvLink(stored.value, key.name.slice(5))
      if (!parsed.success)
        throw new Error(parsed.error.issues.map(issue => issue.message).join('; '))

      const link = parsed.data
      link.slug = normalizeSlug(event, link.slug)
      const metadata = stored.metadata as Record<string, unknown> | null
      const metadataExpiration = typeof metadata?.expiration === 'number' ? metadata.expiration : undefined
      const effectiveExpiresAt = metadataExpiration ?? key.expiration ?? getExpiration(event, link.expiration)

      if (effectiveExpiresAt !== undefined && effectiveExpiresAt <= now) {
        result.expired++
        continue
      }

      if (await migrateKvLink(event, link, effectiveExpiresAt))
        result.inserted++
      else
        result.skipped++
    }
    catch (error) {
      result.failed++
      result.failedItems.push({
        key: key.name,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (result.failed > 0) {
    await db.delete(linkMigrationRuns).where(eq(linkMigrationRuns.id, run.id))
    delete result.cursor
    return result
  }

  const nextCursor: string | null = 'cursor' in page && typeof page.cursor === 'string' ? page.cursor : null
  const status = page.list_complete ? 'completed' : 'running'
  const cursorCondition = run.expectedCursor === null
    ? isNull(linkMigrationRuns.expectedCursor)
    : eq(linkMigrationRuns.expectedCursor, run.expectedCursor)
  const [updatedRun] = await db.update(linkMigrationRuns).set({
    expectedCursor: nextCursor,
    scanned: sql<number>`${linkMigrationRuns.scanned} + ${result.scanned}`,
    inserted: sql<number>`${linkMigrationRuns.inserted} + ${result.inserted}`,
    skipped: sql<number>`${linkMigrationRuns.skipped} + ${result.skipped}`,
    expired: sql<number>`${linkMigrationRuns.expired} + ${result.expired}`,
    status,
    updatedAt: now,
  }).where(and(
    eq(linkMigrationRuns.id, run.id),
    eq(linkMigrationRuns.status, 'running'),
    cursorCondition,
  )).returning()

  if (!updatedRun)
    throw createError({ status: 409, statusText: 'Migration page was already processed' })

  result.list_complete = page.list_complete
  if (page.list_complete) {
    result.completed = true
    delete result.cursor
  }
  return result
})
