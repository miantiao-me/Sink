import type { Link } from '../shared/schemas/link'
import { env, exports } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { expect } from 'vitest'
import { linkMigrationRuns, links, linkTombstones } from '../server/database/schema'
import { LINK_PASSWORD_HASH_PREFIX, LINK_PASSWORD_MASK_PREFIX } from '../shared/utils/link-password'

export const db = drizzle(env.DB)

export function fetchWithAuth(path: string, options?: RequestInit): Promise<Response> {
  const request = new Request(`http://localhost${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${import.meta.env.NUXT_SITE_TOKEN}`,
    },
  })
  return exports.default.fetch(request)
}

export function fetch(path: string, options?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(`http://localhost${path}`, options))
}

export function postJson(path: string, body: unknown, withAuth = true): Promise<Response> {
  const fn = withAuth ? fetchWithAuth : fetch
  return fn(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function putJson(path: string, body: unknown, withAuth = true): Promise<Response> {
  const fn = withAuth ? fetchWithAuth : fetch
  return fn(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function getStoredLink(slug: string) {
  return await env.KV.get<Link>(`link:${slug}`, { type: 'json' })
}

export async function getD1Link(slug: string) {
  const [link] = await db.select().from(links).where(eq(links.slug, slug)).limit(1)
  return link ?? null
}

export async function deleteStoredLink(slug: string) {
  await Promise.all([
    env.KV.delete(`link:${slug}`),
    db.delete(links).where(eq(links.slug, slug)),
    db.delete(linkTombstones).where(eq(linkTombstones.slug, slug)),
  ])
}

export async function deleteStoredLinks(slugs: string[]) {
  await Promise.all(slugs.map(slug => deleteStoredLink(slug)))
}

export async function clearLinkMigrationState() {
  await db.delete(linkMigrationRuns)
}

export async function setLinkStoreD1Mode() {
  await clearLinkMigrationState()
  const now = Math.floor(Date.now() / 1000)
  await db.insert(linkMigrationRuns).values({
    id: `test-completed-${crypto.randomUUID()}`,
    expectedCursor: null,
    scanned: 0,
    inserted: 0,
    skipped: 0,
    expired: 0,
    force: false,
    status: 'completed',
    createdAt: now,
    updatedAt: now,
  })
}

export function expectMaskedPassword(password: string | undefined, plainText: string) {
  expect(password).toBeDefined()
  expect(password?.startsWith(LINK_PASSWORD_MASK_PREFIX), password).toBe(true)
  expect(password).toContain(plainText.slice(-3))
  expect(password).not.toBe(plainText)
  expect(password?.startsWith(LINK_PASSWORD_HASH_PREFIX)).toBe(false)
}

export async function expectStoredHashedPassword(slug: string, plainText: string) {
  const storedLink = await getStoredLink(slug)
  expect(storedLink?.password?.startsWith(LINK_PASSWORD_HASH_PREFIX), storedLink?.password).toBe(true)
  expect(storedLink?.password).not.toBe(plainText)
}

// 1x1 transparent PNG for testing
export const TEST_PNG_BYTES = new Uint8Array([
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
  0x00,
  0x00,
  0x00,
  0x0D,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x06,
  0x00,
  0x00,
  0x00,
  0x1F,
  0x15,
  0xC4,
  0x89,
  0x00,
  0x00,
  0x00,
  0x0A,
  0x49,
  0x44,
  0x41,
  0x54,
  0x78,
  0x9C,
  0x63,
  0x00,
  0x01,
  0x00,
  0x00,
  0x05,
  0x00,
  0x01,
  0x0D,
  0x0A,
  0x2D,
  0xB4,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4E,
  0x44,
  0xAE,
  0x42,
  0x60,
  0x82,
])
