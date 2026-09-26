import { env } from 'cloudflare:workers'
import { afterEach, describe, expect, it } from 'vitest'
import { fetch } from './utils'

afterEach(() => {
  delete env.NUXT_LINK_PROXY_ENABLED
  delete env.NUXT_HOME_URL
})

describe('/_config', () => {
  it('reports link proxying disabled by default and marks the response no-store', async () => {
    const response = await fetch('/_config')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')

    const data = await response.json() as { homeRedirect: boolean, linkProxyEnabled: boolean }
    expect(data.linkProxyEnabled).toBe(false)
    expect(data.homeRedirect).toBe(false)
  })

  it('reflects NUXT_LINK_PROXY_ENABLED and NUXT_HOME_URL when set', async () => {
    env.NUXT_LINK_PROXY_ENABLED = 'true'
    env.NUXT_HOME_URL = 'https://home.example.com'

    const response = await fetch('/_config')
    expect(response.headers.get('cache-control')).toBe('no-store')

    const data = await response.json() as { homeRedirect: boolean, linkProxyEnabled: boolean }
    expect(data.linkProxyEnabled).toBe(true)
    expect(data.homeRedirect).toBe(true)
  })
})
