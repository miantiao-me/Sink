import type { H3Event } from 'h3'
import type { EditLink, Link } from '#shared/schemas/link'

const editableOptionalLinkFields = [
  'comment',
  'title',
  'description',
  'image',
  'apple',
  'google',
  'cloaking',
  'redirectWithQuery',
  'expiration',
  'unsafe',
  'geo',
  'tags',
] as const satisfies readonly (keyof Link)[]

export interface LinkResponse {
  link: Link
  shortLink: string
}

/**
 * Preview instances accept reads but reject link mutations. The write
 * operations below enforce it, and the REST routes call it again up front so a
 * preview instance answers 403 without first validating the request body.
 */
export function assertLinkWritesAllowed(event: H3Event, action: string): void {
  if (useRuntimeConfig(event).public.previewMode) {
    throw createError({
      status: 403,
      statusText: `Preview mode cannot ${action} links.`,
    })
  }
}

/** An explicit `unsafe` flag from the caller wins over the safety lookup. */
async function detectUnsafeLink(event: H3Event, link: Pick<Link, 'url' | 'unsafe'>): Promise<void> {
  if (link.unsafe === undefined && !await isSafeUrl(event, link.url))
    link.unsafe = true
}

async function prepareIncomingLink(event: H3Event, link: Link): Promise<void> {
  link.slug = normalizeSlug(event, link.slug)
  await detectUnsafeLink(event, link)
}

async function hashNewLinkPassword(link: Link): Promise<void> {
  if (link.password)
    link.password = await hashLinkPassword(link.password)
}

function buildLinkResponse(event: H3Event, link: Link): LinkResponse {
  return {
    link: sanitizeLinkPassword(link),
    shortLink: buildShortLink(event, link.slug),
  }
}

function mergeEditableLink(existingLink: Link, link: EditLink): Link {
  const { password: _password, ...linkWithoutPassword } = link
  const newLink = {
    ...existingLink,
    ...linkWithoutPassword,
    id: existingLink.id,
    createdAt: existingLink.createdAt,
    updatedAt: Math.max(Math.floor(Date.now() / 1000), existingLink.updatedAt + 1),
  }

  for (const field of editableOptionalLinkFields) {
    if (link[field] === undefined)
      delete newLink[field]
  }

  return newLink
}

/** An empty password clears protection, an absent one keeps the stored hash. */
async function applyEditableLinkPassword(newLink: Link, password?: string): Promise<void> {
  if (password === '')
    delete newLink.password
  else if (password !== undefined)
    newLink.password = await hashLinkPassword(password)
  else if (newLink.password)
    newLink.password = await normalizeLinkPasswordForStorage(newLink.password)
}

export async function saveNewLink(event: H3Event, link: Link): Promise<LinkResponse> {
  await prepareIncomingLink(event, link)
  await hashNewLinkPassword(link)

  if (!await createLink(event, link))
    throw createError({ status: 409, statusText: 'Link already exists' })

  return buildLinkResponse(event, link)
}

export async function upsertLink(event: H3Event, link: Link): Promise<LinkResponse & { status: 'created' | 'existing' }> {
  await prepareIncomingLink(event, link)

  const existingLink = await getAuthoritativeLink(event, link.slug)
  if (existingLink)
    return { ...buildLinkResponse(event, existingLink), status: 'existing' }

  await hashNewLinkPassword(link)
  if (await createLink(event, link))
    return { ...buildLinkResponse(event, link), status: 'created' }

  // Another writer claimed the slug between the lookup and the insert.
  const racedLink = await getAuthoritativeLink(event, link.slug)
  if (!racedLink)
    throw createError({ status: 409, statusText: 'Link already exists' })

  return { ...buildLinkResponse(event, racedLink), status: 'existing' }
}

export async function replaceLink(event: H3Event, link: EditLink): Promise<LinkResponse> {
  assertLinkWritesAllowed(event, 'edit')
  link.slug = normalizeSlug(event, link.slug)

  const existingLink = await getAnyAuthoritativeLink(event, link.slug)
  if (!existingLink)
    throw createError({ status: 404, statusText: 'Link not found' })

  if (link.url !== existingLink.url)
    await detectUnsafeLink(event, link)

  const newLink = mergeEditableLink(existingLink, link)
  await applyEditableLinkPassword(newLink, link.password)

  if (!await updateLink(event, newLink, { id: existingLink.id, updatedAt: existingLink.updatedAt }))
    throw createError({ status: 409, statusText: 'Link was modified or replaced' })

  return buildLinkResponse(event, newLink)
}

export async function removeLink(event: H3Event, slug: string): Promise<void> {
  assertLinkWritesAllowed(event, 'delete')
  await deleteLink(event, normalizeSlug(event, slug))
}
