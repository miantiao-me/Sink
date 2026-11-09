import type { H3Event } from 'h3'
import type { RawBuilder } from 'kysely'
import type { Query } from '#shared/schemas/query'
import type { BlobsKey } from './access-log'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createError } from 'h3'
import { sql } from 'kysely'
import { links } from '../database/schema'
import { blobsMap } from './access-log'
import { getOwnerScope } from './ownership'

export type { Query }

function queryValues(value: string, omitEmpty = false): string[] {
  if ([...value].some((character) => {
    const code = character.charCodeAt(0)
    return code <= 0x1F || code === 0x7F
  })) {
    throw new Error('Analytics filters must not contain control characters')
  }

  const values = value.split(',')
  return omitEmpty ? values.filter(Boolean) : values
}

function inFilter(column: string, values: string[]): RawBuilder<boolean> | undefined {
  if (!values.length)
    return

  return sql<boolean>`${sql.ref(column)} in (${sql.join(values.map(value => sql.lit(value)))})`
}

async function getOwnedLinkIds(event: H3Event, email: string): Promise<string[]> {
  const db = drizzle(event.context.cloudflare.env.DB)
  const rows = await db.select({ id: links.id }).from(links).where(eq(links.ownerEmail, email))
  return rows.map(row => row.id)
}

/** A link id that can never exist, used to force "match nothing" when a non-admin owns no links. */
const UNREACHABLE_LINK_ID = '__no-owned-links__'

/**
 * Resolves `query.id` against the caller's own links before it reaches buildAnalyticsFilter.
 * Admins pass through untouched. Non-admins requesting specific ids they do not own get a 404
 * (existence is not revealed); non-admins requesting no id are auto-scoped to only their own ids.
 */
export async function scopeAnalyticsQuery(event: H3Event, query: Query): Promise<Query> {
  const scope = getOwnerScope(event)
  if (scope.admin)
    return query

  const ownedIds = await getOwnedLinkIds(event, scope.email)
  const requestedIds = query.id ? queryValues(query.id, true) : undefined

  if (requestedIds) {
    const ownedSet = new Set(ownedIds)
    if (requestedIds.some(id => !ownedSet.has(id))) {
      throw createError({ status: 404, statusText: 'Not Found' })
    }
    return query
  }

  return { ...query, id: ownedIds.length ? ownedIds.join(',') : UNREACHABLE_LINK_ID }
}

export function buildAnalyticsFilter(query: Query): RawBuilder<boolean> | undefined {
  const filters: RawBuilder<boolean>[] = []
  if (query.id) {
    const filter = inFilter('index1', queryValues(query.id, true))
    if (filter)
      filters.push(filter)
  }

  const blobKeys = Object.keys(blobsMap) as BlobsKey[]
  for (const blobKey of blobKeys) {
    const queryKey = blobsMap[blobKey] as keyof Query
    const value = query[queryKey]
    if (typeof value === 'string' && value)
      filters.push(inFilter(blobKey, queryValues(value))!)
  }

  if (query.startAt) {
    const startTimestamp = Math.floor(Number(query.startAt))
    filters.push(sql<boolean>`${sql.ref('timestamp')} >= toDateTime(${sql.lit(startTimestamp)})`)
  }

  if (query.endAt) {
    const endTimestamp = Math.floor(Number(query.endAt))
    filters.push(sql<boolean>`${sql.ref('timestamp')} <= toDateTime(${sql.lit(endTimestamp)})`)
  }

  return filters.length ? sql<boolean>`${sql.join(filters, sql` and `)}` : undefined
}
