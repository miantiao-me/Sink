import type { H3Event } from 'h3'
import type { Link } from '../../shared/schemas/link'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { putLinkCache, readLegacyKvLink } from '../../server/services/link-store/kv'

// The real schema module reads useAppConfig() and useRuntimeConfig() while it
// loads, which only exist inside the Nuxt build. None of the paths below reach
// the parser, so the stub is never called.
vi.mock('#shared/schemas/link', () => ({
  parseLegacyKvLink: vi.fn(),
}))

function stubEvent(env: Partial<Cloudflare.Env>): H3Event {
  return { context: { cloudflare: { env } } } as unknown as H3Event
}

const link: Link = {
  id: 'cache-id',
  slug: 'cache-slug',
  url: 'https://example.com',
  createdAt: 1,
  updatedAt: 1,
  tags: [],
}

describe('link cache degradation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads as a cache miss when the KV binding is absent', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(readLegacyKvLink(stubEvent({}), link.slug)).resolves.toEqual({ link: null, metadata: null })
    expect(consoleError).toHaveBeenCalledWith({ event: 'link_cache.binding.missing', operation: 'read', slug: link.slug })
  })

  it('reads as a cache miss when KV throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const KV = { getWithMetadata: vi.fn().mockRejectedValue(new Error('kv unavailable')) } as unknown as KVNamespace

    await expect(readLegacyKvLink(stubEvent({ KV }), link.slug)).resolves.toEqual({ link: null, metadata: null })
    expect(consoleError).toHaveBeenCalledWith(expect.objectContaining({ operation: 'read', slug: link.slug }))
  })

  it('reports a failed cache write when the KV binding is absent', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(putLinkCache(stubEvent({}), link, null)).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith({ event: 'link_cache.binding.missing', operation: 'put', slug: link.slug })
  })
})
