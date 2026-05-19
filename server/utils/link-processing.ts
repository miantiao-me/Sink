import type { Link } from '#shared/schemas/link'
import type { H3Event } from 'h3'

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
] as const satisfies readonly (keyof Link)[]

interface LinkResponse {
  link: Link
  shortLink: string
}

export async function prepareIncomingLink(event: H3Event, link: Link): Promise<void> {
  link.slug = normalizeSlug(event, link.slug)
  await detectUnsafeLink(event, link)
}

export async function detectUnsafeLink(event: H3Event, link: Pick<Link, 'url' | 'unsafe'>): Promise<void> {
  if (link.unsafe !== undefined)
    return

  const safe = await isSafeUrl(event, link.url)
  if (!safe)
    link.unsafe = true
}

export async function hashLinkPasswordForCreate(link: Link): Promise<void> {
  if (link.password)
    link.password = await hashLinkPassword(link.password)
}

export function buildLinkResponse(event: H3Event, link: Link): LinkResponse {
  return {
    link: sanitizeLinkPassword(link),
    shortLink: buildShortLink(event, link.slug),
  }
}

export function mergeEditableLink(existingLink: Link, link: Link): Link {
  const { password: _password, ...linkWithoutPassword } = link
  const newLink = {
    ...existingLink,
    ...linkWithoutPassword,
    id: existingLink.id,
    createdAt: existingLink.createdAt,
    updatedAt: Math.floor(Date.now() / 1000),
  }

  cleanupOptionalLinkFields(newLink, link)

  return newLink
}

export async function applyEditableLinkPassword(newLink: Link, password?: string): Promise<void> {
  if (password === '') {
    delete newLink.password
  }
  else if (password !== undefined) {
    newLink.password = await hashLinkPassword(password)
  }
  else if (newLink.password) {
    newLink.password = await normalizeLinkPasswordForStorage(newLink.password)
  }
}

function cleanupOptionalLinkFields(newLink: Link, link: Link): void {
  for (const field of editableOptionalLinkFields) {
    if (link[field] === undefined)
      delete newLink[field]
  }
}
