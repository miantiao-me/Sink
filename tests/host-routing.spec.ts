import { env } from 'cloudflare:workers'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { links } from '../server/database/schema'
import { db, deleteStoredLink, deleteStoredLinks, fetch, fetchWithAuth, postJson, setLinkStoreD1Mode } from './utils'

// `resolveHostSurface` compares against the host of NUXT_PUBLIC_DASHBOARD_URL, so these two
// origins are the dashboard host and a short-link host of the same deployment.
const DASHBOARD_ORIGIN = 'http://dash.localhost'
const LINKS_ORIGIN = 'http://localhost'

const createdSlugs: string[] = []

beforeAll(async () => {
  await setLinkStoreD1Mode()
})

afterEach(() => {
  env.NUXT_PUBLIC_DASHBOARD_URL = ''
})

afterAll(async () => {
  env.NUXT_PUBLIC_DASHBOARD_URL = ''
  await deleteStoredLinks(createdSlugs.splice(0))
})

async function createLink(slug: string, url: string, origin?: string): Promise<Response> {
  createdSlugs.push(slug)
  return postJson('/api/link/create', { url, slug }, true, origin)
}

// We write this link to storage because the API rejects the slug. `shared/schemas/link.ts` reads
// the reserved slug once at module load, so it does not follow changes to the variable in a test.
async function storeDashboardLink(url: string) {
  createdSlugs.push('dashboard')
  await deleteStoredLink('dashboard')
  const now = Math.floor(Date.now() / 1000)
  await db.insert(links).values({
    slug: 'dashboard',
    id: crypto.randomUUID().slice(0, 8),
    url,
    createdAt: now,
    updatedAt: now,
    normalizedUrl: url,
  })
}

describe('with a dashboard host configured', () => {
  beforeEach(() => {
    env.NUXT_PUBLIC_DASHBOARD_URL = DASHBOARD_ORIGIN
  })

  it('serves the dashboard from the root of that host', async () => {
    const response = await fetch('/', { redirect: 'manual', origin: DASHBOARD_ORIGIN })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/links')
  })

  it('resolves a stored `dashboard` link on a short-link host', async () => {
    await storeDashboardLink('https://example.com/reclaimed')

    for (const path of ['/dashboard', '/dashboard/']) {
      const response = await fetch(path, { redirect: 'manual', origin: LINKS_ORIGIN })
      expect(response.status, path).toBe(301)
      expect(response.headers.get('location'), path).toBe('https://example.com/reclaimed')
    }
  })

  it('does not resolve links on the dashboard host', async () => {
    const created = await createLink('host-scoped', 'https://example.com/host-scoped', DASHBOARD_ORIGIN)
    expect(created.status).toBe(201)

    const onLinksHost = await fetch('/host-scoped', { redirect: 'manual', origin: LINKS_ORIGIN })
    expect(onLinksHost.status).toBe(301)

    const onDashboardHost = await fetch('/host-scoped', { redirect: 'manual', origin: DASHBOARD_ORIGIN })
    expect(onDashboardHost.headers.get('location')).toBeNull()
    expect(onDashboardHost.status).not.toBe(301)
  })

  it('serves the API on the dashboard host only', async () => {
    const onDashboardHost = await fetchWithAuth('/api/verify', { origin: DASHBOARD_ORIGIN })
    expect(onDashboardHost.status).toBe(200)

    // A valid site token must not be enough: the host decides before auth does.
    const onLinksHost = await fetchWithAuth('/api/verify', { origin: LINKS_ORIGIN })
    expect(onLinksHost.status).toBe(404)
  })

  it('serves the OpenAPI documents on the dashboard host only', async () => {
    const onDashboardHost = await fetch('/_docs/openapi.json', { origin: DASHBOARD_ORIGIN })
    expect(onDashboardHost.status).toBe(200)

    const onLinksHost = await fetch('/_docs/openapi.json', { origin: LINKS_ORIGIN })
    expect(onLinksHost.status).toBe(404)
  })
})

describe('with no dashboard host configured', () => {
  it('serves the dashboard under /dashboard on the same host', async () => {
    for (const path of ['/dashboard', '/dashboard/']) {
      const response = await fetch(path, { redirect: 'manual' })
      expect(response.status, path).toBe(302)
      expect(response.headers.get('location'), path).toBe('/dashboard/links')
    }

    // The homepage keeps `/`, and short links keep resolving.
    const home = await fetch('/', { redirect: 'manual' })
    expect(home.status).toBe(200)
  })

  it('keeps short links working and the API on the same host', async () => {
    const slug = `single-host-${crypto.randomUUID()}`
    const created = await createLink(slug, 'https://example.com/single-host')
    expect(created.status).toBe(201)

    const redirect = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('location')).toBe('https://example.com/single-host')

    const verify = await fetchWithAuth('/api/verify')
    expect(verify.status).toBe(200)
  })

  it('rejects a new link that would take the /dashboard prefix', async () => {
    const created = await postJson('/api/link/create', { url: 'https://example.com/steal', slug: 'dashboard' })
    expect(created.status).toBe(400)
  })

  // The slug is reserved for new links, but one created while a dashboard host was configured
  // can still be stored. It must lose to the dashboard rather than shadow it.
  it('disables a stored `dashboard` link instead of resolving it', async () => {
    await storeDashboardLink('https://example.com/reclaimed')

    for (const path of ['/dashboard', '/dashboard/', '/Dashboard']) {
      const response = await fetch(path, { redirect: 'manual' })
      expect(response.status, path).toBe(302)
      expect(response.headers.get('location'), path).toBe('/dashboard/links')
    }
  })
})
