import { env } from 'cloudflare:workers'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { deleteStoredLinks, fetch, postJson, setLinkStoreD1Mode } from './utils'

const createdSlugs: string[] = []

beforeAll(async () => {
  await setLinkStoreD1Mode()
})

afterEach(async () => {
  env.NUXT_PUBLIC_LINK_PROXY_ENABLED = 'false'
  env.NUXT_PUBLIC_HOME_URL = ''
  await deleteStoredLinks(createdSlugs.splice(0))
})

describe('public runtime config overrides', () => {
  it('keeps the homepage and stores the proxy flag by default', async () => {
    env.NUXT_PUBLIC_LINK_PROXY_ENABLED = 'false'
    env.NUXT_PUBLIC_HOME_URL = ''

    const home = await fetch('/', { redirect: 'manual' })
    expect(home.headers.get('location')).not.toBe('https://home.example.com')

    // The flag only governs request-time delivery; writes always store it.
    const slug = `cfg-default-${crypto.randomUUID()}`
    createdSlugs.push(slug)
    const created = await postJson('/api/link/create', {
      url: 'https://example.com/proxy-default',
      slug,
      proxy: true,
    })
    expect(created.status).toBe(201)
    const data = await created.json() as { link: { proxy?: boolean } }
    expect(data.link.proxy).toBe(true)
  })

  it('redirects / when NUXT_PUBLIC_HOME_URL is set', async () => {
    env.NUXT_PUBLIC_HOME_URL = 'https://home.example.com'

    const response = await fetch('/', { redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://home.example.com')
  })
})
