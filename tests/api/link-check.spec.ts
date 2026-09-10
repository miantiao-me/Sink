import type { LinkCheckResponse } from '../../shared/types/link-check'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { links } from '../../server/database/schema'
import { db, deleteStoredLinks, postJson, setLinkStoreD1Mode } from '../utils'

beforeEach(async () => {
  await setLinkStoreD1Mode()
})

function uniqueSlug(index: number): string {
  return `link-check-${index}-${crypto.randomUUID()}`
}

async function createStoredLinks(count: number): Promise<{ slug: string, url: string }[]> {
  const links = Array.from({ length: count }, (_, index) => ({
    slug: uniqueSlug(index),
    url: `http://localhost/link-check/${index}`,
  }))
  for (const link of links)
    expect((await postJson('/api/link/create', link)).status).toBe(201)
  return links
}

describe('/api/link/check', { concurrent: false }, () => {
  it('checks authoritative links with keyset cursor pagination', async () => {
    const created = await createStoredLinks(11)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Blocked test outbound request'))

    try {
      const checked = new Map<string, string>()
      const checkedSlugs: string[] = []
      let cursor: string | undefined
      let pageCount = 0

      do {
        const response = await postJson('/api/link/check', { cursor, limit: 10, timeout: 1 })
        expect(response.status).toBe(200)
        const page = await response.json() as LinkCheckResponse
        expect(page.results.length).toBeLessThanOrEqual(10)
        for (const result of page.results) {
          expect(checked.has(result.slug)).toBe(false)
          checked.set(result.slug, result.url)
          checkedSlugs.push(result.slug)
        }
        cursor = page.cursor
        pageCount++
        if (page.list_complete)
          break
        expect(cursor).toBeTypeOf('string')
      } while (pageCount < 100)

      expect(pageCount).toBeGreaterThan(1)
      expect(checkedSlugs).toEqual([...checkedSlugs].sort((a, b) => a.localeCompare(b)))
      for (const link of created)
        expect(checked.get(link.slug)).toBe(link.url)
    }
    finally {
      fetchSpy.mockRestore()
      await deleteStoredLinks(created.map(link => link.slug))
    }
  })

  it('includes expired links and checks their stored URL', async () => {
    const [link] = await createStoredLinks(1)
    const expiredAt = Math.floor(Date.now() / 1000) - 60
    await db.update(links)
      .set({ expiration: expiredAt, effectiveExpiresAt: expiredAt })
      .where(eq(links.slug, link.slug))
    await env.KV.delete(`link:${link.slug}`)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Blocked test outbound request'))

    try {
      let cursor: string | undefined
      let result
      for (let pageCount = 0; pageCount < 100 && !result; pageCount++) {
        const response = await postJson('/api/link/check', { cursor, limit: 10, timeout: 1 })
        expect(response.status).toBe(200)
        const page = await response.json() as LinkCheckResponse
        result = page.results.find(item => item.slug === link.slug)
        if (page.list_complete)
          break
        cursor = page.cursor
      }

      expect(result).toMatchObject({
        slug: link.slug,
        url: link.url,
        status: 0,
        ok: false,
        error: 'URL is not allowed for server-side checking',
      })
    }
    finally {
      fetchSpy.mockRestore()
      await deleteStoredLinks([link.slug])
    }
  })

  it('rejects client-provided link targets and limits pages to 10', async () => {
    expect((await postJson('/api/link/check', {
      links: [{ slug: 'client-target', url: 'https://example.com' }],
    })).status).toBe(400)
    expect((await postJson('/api/link/check', { limit: 11 })).status).toBe(400)
  })
})
