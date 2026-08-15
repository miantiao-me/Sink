import type { BatchItem } from 'drizzle-orm/batch'
import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import type { LinkSearchItem, LinkSortBy, LinkStatus } from '#shared/types/link'
import { and, asc, count, desc, eq, exists, gt, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createError } from 'h3'
import { parseURL, stringifyParsedURL } from 'ufo'
import { links, linkTags, linkTombstones, tags } from '../../database/schema'
import { getExpiration } from '../../utils/time'

const D1_CURSOR_PREFIX = 'd1:v1:'

type LinkRow = typeof links.$inferSelect

export interface ExpectedLinkVersion {
  id: string
  updatedAt: number
}

export interface ListLinksOptions {
  limit: number
  cursor?: string
  sort?: LinkSortBy
  tag?: string
  status?: LinkStatus
}

export interface ListLinksResult {
  links: Link[]
  list_complete: boolean
  cursor?: string
}

export interface LinkFilterOptions {
  q?: string
  url?: string
  tag?: string
  status?: LinkStatus
}

export interface SearchLinksOptions extends LinkFilterOptions {
  limit?: number
}

interface D1Cursor {
  sort: LinkSortBy
  slug: string
  createdAt?: number
  tag?: string
  status: LinkStatus
}

function withoutQuery(url: string): string {
  const parsed = parseURL(url)
  return stringifyParsedURL({ ...parsed, search: '' })
}

function getDatabase(event: H3Event) {
  return drizzle(event.context.cloudflare.env.DB)
}

function activeCondition(now = Math.floor(Date.now() / 1000)) {
  return or(isNull(links.effectiveExpiresAt), gt(links.effectiveExpiresAt, now))
}

function statusCondition(status: LinkStatus, now = Math.floor(Date.now() / 1000)) {
  if (status === 'active')
    return activeCondition(now)
  if (status === 'expired')
    return and(isNotNull(links.effectiveExpiresAt), lte(links.effectiveExpiresAt, now))
  return undefined
}

function exactTagCondition(db: ReturnType<typeof getDatabase>, tag: string | undefined) {
  return tag
    ? exists(db.select({ linkSlug: linkTags.linkSlug }).from(linkTags).where(and(
        eq(linkTags.linkSlug, links.slug),
        eq(linkTags.tagName, tag),
      )))
    : undefined
}

function rowToLink(row: LinkRow): Link {
  const link: Link = {
    id: row.id,
    url: row.url,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: [],
  }
  const optionalFields = [
    'comment',
    'expiration',
    'title',
    'description',
    'image',
    'apple',
    'google',
    'cloaking',
    'redirectWithQuery',
    'password',
    'unsafe',
    'geo',
  ] as const

  for (const field of optionalFields) {
    const value = row[field]
    if (value !== null)
      Object.assign(link, { [field]: value })
  }

  return link
}

async function addTagsToLinksFromDatabase<T extends { slug: string, tags: string[] }>(db: ReturnType<typeof getDatabase>, result: T[], slugs: string[]): Promise<T[]> {
  const bySlug = new Map(result.map(link => [link.slug, link]))
  for (let offset = 0; offset < slugs.length; offset += 90) {
    const rows = await db
      .select({ slug: linkTags.linkSlug, tag: linkTags.tagName })
      .from(linkTags)
      .where(inArray(linkTags.linkSlug, slugs.slice(offset, offset + 90)))
      .orderBy(asc(linkTags.tagName))
    for (const row of rows)
      bySlug.get(row.slug)?.tags.push(row.tag)
  }
  return result
}

async function rowsToLinks(event: H3Event, rows: LinkRow[]): Promise<Link[]> {
  const result = rows.map(rowToLink)
  return await addTagsToLinksFromDatabase(getDatabase(event), result, result.map(link => link.slug))
}

export function buildD1LinkValues(event: H3Event, link: Link, effectiveExpiresAt?: number | null) {
  return {
    slug: link.slug,
    id: link.id,
    url: link.url,
    comment: link.comment ?? null,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    expiration: link.expiration ?? null,
    title: link.title ?? null,
    description: link.description ?? null,
    image: link.image ?? null,
    apple: link.apple ?? null,
    google: link.google ?? null,
    cloaking: link.cloaking ?? null,
    redirectWithQuery: link.redirectWithQuery ?? null,
    password: link.password ?? null,
    unsafe: link.unsafe ?? null,
    geo: link.geo ?? null,
    normalizedUrl: withoutQuery(link.url),
    effectiveExpiresAt: effectiveExpiresAt === undefined ? getExpiration(event, link.expiration) ?? null : effectiveExpiresAt,
  }
}

export async function d1GetActiveLink(event: H3Event, slug: string): Promise<{ link: Link, effectiveExpiresAt: number | null } | null> {
  const rows = await getDatabase(event).select().from(links).where(and(eq(links.slug, slug), activeCondition())).limit(1)
  const row = rows[0]
  if (!row)
    return null
  const [link] = await rowsToLinks(event, [row])
  return link ? { link, effectiveExpiresAt: row.effectiveExpiresAt } : null
}

export async function d1GetAnyLink(event: H3Event, slug: string): Promise<Link | null> {
  const rows = await getDatabase(event).select().from(links).where(eq(links.slug, slug)).limit(1)
  return rows[0] ? (await rowsToLinks(event, rows))[0] ?? null : null
}

export async function d1GetLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  const rows = await getDatabase(event).select().from(links).where(eq(links.slug, slug)).limit(1)
  const row = rows[0]
  const link = row ? (await rowsToLinks(event, [row]))[0] ?? null : null
  return {
    link,
    metadata: row && link
      ? { expiration: row.effectiveExpiresAt ?? undefined, url: withoutQuery(link.url), comment: link.comment }
      : null,
  }
}

export async function d1HasActiveLinkVersion(event: H3Event, link: Link): Promise<boolean> {
  const rows = await getDatabase(event).select({ id: links.id }).from(links).where(and(
    eq(links.slug, link.slug),
    eq(links.id, link.id),
    eq(links.updatedAt, link.updatedAt),
    activeCondition(),
  )).limit(1)
  return rows.length > 0
}

export async function d1GetActiveLinkVersions(event: H3Event, expectedLinks: Link[]): Promise<Set<string>> {
  if (!expectedLinks.length)
    return new Set()

  const rows = await getDatabase(event).select({ slug: links.slug }).from(links).where(and(
    activeCondition(),
    or(...expectedLinks.map(link => and(eq(links.slug, link.slug), eq(links.id, link.id), eq(links.updatedAt, link.updatedAt)))),
  ))
  return new Set(rows.map(row => row.slug))
}

export async function d1CreateLink(event: H3Event, link: Link): Promise<{ created: boolean, effectiveExpiresAt: number | null }> {
  const db = getDatabase(event)
  const { statements, effectiveExpiresAt } = buildCreateLinkStatements(event, db, link)
  const [created] = await db.batch(statements)
  return { created: (created as { slug: string }[]).length > 0, effectiveExpiresAt }
}

function buildCreateLinkStatements(event: H3Event, db: ReturnType<typeof getDatabase>, link: Link): { statements: [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]], effectiveExpiresAt: number | null } {
  const now = Math.floor(Date.now() / 1000)
  const values = buildD1LinkValues(event, link)
  const effectiveExpiresAt = values.effectiveExpiresAt
  const pendingValues = { ...values, effectiveExpiresAt: 0 }
  const pendingLink = and(eq(links.slug, link.slug), eq(links.effectiveExpiresAt, 0))
  const insert = db.insert(links).values(pendingValues).onConflictDoUpdate({
    target: links.slug,
    set: pendingValues,
    setWhere: and(isNotNull(links.effectiveExpiresAt), lte(links.effectiveExpiresAt, now)),
  }).returning({ slug: links.slug })
  const clearTombstone = db.delete(linkTombstones).where(and(
    eq(linkTombstones.slug, link.slug),
    exists(db.select({ slug: links.slug }).from(links).where(pendingLink)),
  ))
  const tagInserts = link.tags.map(tag => db.insert(tags).select(
    db.select({ name: sql<string>`${tag}`.as('name') }).from(links).where(pendingLink),
  ).onConflictDoNothing())
  const clearTags = db.delete(linkTags).where(and(
    eq(linkTags.linkSlug, link.slug),
    exists(db.select({ slug: links.slug }).from(links).where(pendingLink)),
  ))
  const associationInserts = link.tags.map(tag => db.insert(linkTags).select(
    db.select({ linkSlug: links.slug, tagName: sql<string>`${tag}`.as('tag_name') })
      .from(links)
      .where(pendingLink),
  ).onConflictDoNothing())
  const finalize = db.update(links).set({ effectiveExpiresAt }).where(pendingLink)
  return {
    statements: [insert, clearTombstone, clearTags, ...tagInserts, ...associationInserts, finalize],
    effectiveExpiresAt,
  }
}

export async function d1CreateLinks(event: H3Event, importedLinks: Link[]): Promise<{ created: boolean, effectiveExpiresAt: number | null }[]> {
  if (!importedLinks.length)
    return []

  const db = getDatabase(event)
  const batches = importedLinks.map(link => buildCreateLinkStatements(event, db, link))
  const insertIndexes: number[] = []
  let statementCount = 0
  const statements = batches.flatMap((batch) => {
    insertIndexes.push(statementCount)
    statementCount += batch.statements.length
    return batch.statements
  })
  const results = await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
  return batches.map((batch, index) => ({
    created: (results[insertIndexes[index]!] as { slug: string }[]).length > 0,
    effectiveExpiresAt: batch.effectiveExpiresAt,
  }))
}

export async function d1UpdateLink(event: H3Event, link: Link, expected?: ExpectedLinkVersion): Promise<{ updated: boolean, effectiveExpiresAt: number | null }> {
  const values = buildD1LinkValues(event, link)
  const db = getDatabase(event)
  const update = db.update(links).set(values).where(and(
    eq(links.slug, link.slug),
    expected ? eq(links.id, expected.id) : undefined,
    expected ? eq(links.updatedAt, expected.updatedAt) : undefined,
  )).returning({ slug: links.slug })
  const currentVersion = and(
    eq(links.slug, link.slug),
    expected ? eq(links.id, expected.id) : undefined,
    expected ? eq(links.updatedAt, expected.updatedAt) : undefined,
  )
  const clearTags = db.delete(linkTags).where(and(
    eq(linkTags.linkSlug, link.slug),
    exists(db.select({ slug: links.slug }).from(links).where(currentVersion)),
  ))
  const tagInserts = link.tags.map(tag => db.insert(tags).values({ name: tag }).onConflictDoNothing())
  const associationInserts = link.tags.map(tag => db.insert(linkTags).select(
    db.select({ linkSlug: links.slug, tagName: sql<string>`${tag}`.as('tag_name') }).from(links).where(currentVersion),
  ).onConflictDoNothing())
  const results = await db.batch([clearTags, ...tagInserts, ...associationInserts, update])
  const updated = results.at(-1) as { slug: string }[]
  return { updated: updated.length > 0, effectiveExpiresAt: values.effectiveExpiresAt }
}

export async function d1DeleteLink(event: H3Event, slug: string): Promise<void> {
  const db = getDatabase(event)
  const now = Math.floor(Date.now() / 1000)
  await db.batch([
    db.delete(links).where(eq(links.slug, slug)),
    db.insert(linkTombstones).values({ slug, deletedAt: now }).onConflictDoUpdate({
      target: linkTombstones.slug,
      set: { deletedAt: now },
    }),
  ])
}

function encodeCursor(cursor: D1Cursor): string {
  return `${D1_CURSOR_PREFIX}${btoa(JSON.stringify(cursor))}`
}

function decodeCursor(cursor: string | undefined, sort: LinkSortBy, tag: string | undefined, status: LinkStatus): D1Cursor | undefined {
  if (!cursor)
    return undefined
  if (!cursor.startsWith(D1_CURSOR_PREFIX))
    throw createError({ status: 400, statusText: 'Invalid pagination cursor' })
  try {
    const decoded = JSON.parse(atob(cursor.slice(D1_CURSOR_PREFIX.length))) as D1Cursor
    if (decoded.sort !== sort || decoded.tag !== tag || decoded.status !== status || typeof decoded.slug !== 'string')
      throw new Error('Cursor does not match sort')
    if ((sort === 'newest' || sort === 'oldest') && typeof decoded.createdAt !== 'number')
      throw new Error('Cursor is missing creation time')
    return decoded
  }
  catch {
    throw createError({ status: 400, statusText: 'Invalid pagination cursor' })
  }
}

export async function d1ListLinks(event: H3Event, options: ListLinksOptions): Promise<ListLinksResult> {
  const db = getDatabase(event)
  const sort = options.sort ?? 'newest'
  const status = options.status ?? 'active'
  const cursor = decodeCursor(options.cursor, sort, options.tag, status)
  let cursorCondition
  let order

  if (sort === 'az') {
    cursorCondition = cursor ? gt(links.slug, cursor.slug) : undefined
    order = [asc(links.slug)]
  }
  else if (sort === 'za') {
    cursorCondition = cursor ? lt(links.slug, cursor.slug) : undefined
    order = [desc(links.slug)]
  }
  else if (sort === 'newest') {
    cursorCondition = cursor ? or(lt(links.createdAt, cursor.createdAt!), and(eq(links.createdAt, cursor.createdAt!), gt(links.slug, cursor.slug))) : undefined
    order = [desc(links.createdAt), asc(links.slug)]
  }
  else {
    cursorCondition = cursor ? or(gt(links.createdAt, cursor.createdAt!), and(eq(links.createdAt, cursor.createdAt!), gt(links.slug, cursor.slug))) : undefined
    order = [asc(links.createdAt), asc(links.slug)]
  }

  const tagCondition = exactTagCondition(db, options.tag)
  const rows = await db.select().from(links).where(and(statusCondition(status), tagCondition, cursorCondition)).orderBy(...order).limit(options.limit + 1)
  const hasMore = rows.length > options.limit
  const page = hasMore ? rows.slice(0, options.limit) : rows
  const last = page.at(-1)
  return {
    links: await rowsToLinks(event, page),
    list_complete: !hasMore,
    cursor: hasMore && last ? encodeCursor({ sort, slug: last.slug, createdAt: last.createdAt, tag: options.tag, status }) : undefined,
  }
}

export async function* d1IterateAllLinks(env: Cloudflare.Env): AsyncIterable<Link> {
  const db = drizzle(env.DB)
  let lastSlug: string | undefined

  do {
    const rows = await db
      .select()
      .from(links)
      .where(lastSlug ? gt(links.slug, lastSlug) : undefined)
      .orderBy(asc(links.slug))
      .limit(100)
    if (!rows.length)
      break

    const pageLinks = rows.map((row) => {
      const link = rowToLink(row)
      if (link.expiration === undefined && row.effectiveExpiresAt !== null)
        link.expiration = row.effectiveExpiresAt
      return link
    })
    await addTagsToLinksFromDatabase(db, pageLinks, pageLinks.map(link => link.slug))
    for (const link of pageLinks)
      yield link

    lastSlug = rows.at(-1)?.slug
    if (rows.length < 100)
      break
  } while (lastSlug)
}

function linkFilterCondition(db: ReturnType<typeof getDatabase>, options: LinkFilterOptions) {
  const status = options.status ?? 'active'
  const conditions = [statusCondition(status)]
  if (options.tag)
    conditions.push(exactTagCondition(db, options.tag))
  if (options.url)
    conditions.push(eq(links.normalizedUrl, withoutQuery(options.url)))
  if (options.q) {
    const pattern = `%${options.q.toLowerCase().replace(/[!%_]/g, '!$&')}%`
    conditions.push(or(
      sql`lower(${links.slug}) like ${pattern} escape '!'`,
      sql`lower(${links.url}) like ${pattern} escape '!'`,
      sql`lower(coalesce(${links.comment}, '')) like ${pattern} escape '!'`,
      sql`exists (select 1 from ${linkTags} where ${linkTags.linkSlug} = ${links.slug} and lower(${linkTags.tagName}) like ${pattern} escape '!')`,
    )!)
  }

  return and(...conditions)
}

export async function d1SearchLinks(event: H3Event, options: SearchLinksOptions): Promise<LinkSearchItem[]> {
  const db = getDatabase(event)
  let query = db.select({ slug: links.slug, url: links.normalizedUrl, comment: links.comment }).from(links).where(linkFilterCondition(db, options)).orderBy(asc(links.slug)).$dynamic()
  if (options.limit)
    query = query.limit(options.limit)
  const rows = await query
  const result = rows.map(row => ({ slug: row.slug, url: row.url, tags: [] as string[], ...(row.comment === null ? {} : { comment: row.comment }) }))
  return await addTagsToLinksFromDatabase(db, result, result.map(link => link.slug))
}

export async function d1CountLinks(event: H3Event, options: LinkFilterOptions): Promise<number> {
  const db = getDatabase(event)
  const [result] = await db.select({ count: count() }).from(links).where(linkFilterCondition(db, options))
  return result?.count ?? 0
}

export async function d1ListTags(event: H3Event): Promise<{ name: string, count: number }[]> {
  return await getDatabase(event)
    .select({ name: tags.name, count: count(linkTags.linkSlug) })
    .from(tags)
    .innerJoin(linkTags, eq(linkTags.tagName, tags.name))
    .groupBy(tags.name)
    .orderBy(asc(tags.name))
}
