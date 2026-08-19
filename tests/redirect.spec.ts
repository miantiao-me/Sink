import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deleteStoredLinks, fetch, postJson, setLinkStoreD1Mode } from './utils'

type CfRequestInit = RequestInit & { cf?: { country?: string } }

const createdSlugs: string[] = []

beforeAll(async () => {
  await setLinkStoreD1Mode()
})

afterAll(async () => {
  await deleteStoredLinks(createdSlugs)
})

describe('/', () => {
  it('redirects CriOS user agent to apple URL', async () => {
    const slug = `crios-apple-${crypto.randomUUID()}`
    const apple = 'https://apps.apple.com/app/sink-test'

    const createResponse = await postJson('/api/link/create', {
      url: 'https://example.com',
      slug,
      apple,
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)
    const createData = await createResponse.json() as { link: { apple?: string } }
    expect(createData.link.apple).toBe(apple)

    const response = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147 Version/11.1.1 Safari/605.1.15',
      },
    })

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe(apple)
  })

  it('merges request query parameters into a target that already has a query', async () => {
    const slug = `redirect-query-${crypto.randomUUID()}`
    const targetUrl = 'https://example.com/landing?source=original&shared=target'

    const createResponse = await postJson('/api/link/create', {
      url: targetUrl,
      slug,
      redirectWithQuery: true,
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const response = await fetch(`/${slug}?campaign=summer&shared=request`, { redirect: 'manual' })

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('https://example.com/landing?source=original&shared=request&campaign=summer')
  })

  it('returns OG HTML to social bots while redirecting regular browsers', async () => {
    const slug = `social-og-${crypto.randomUUID()}`
    const targetUrl = 'https://example.com/social-target'

    const createResponse = await postJson('/api/link/create', {
      url: targetUrl,
      slug,
      title: 'Social preview title',
      description: 'Social preview description',
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const botResponse = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Twitterbot/1.0' },
    })
    const html = await botResponse.text()
    expect(botResponse.status).toBe(200)
    expect(botResponse.headers.get('Content-Type')).toContain('text/html')
    expect(html).toContain('<meta property="og:title" content="Social preview title">')
    expect(html).toContain('<meta property="og:description" content="Social preview description">')
    expect(html).toContain(`content="1;url=${targetUrl}"`)

    const browserResponse = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    expect(browserResponse.status).toBe(301)
    expect(browserResponse.headers.get('Location')).toBe(targetUrl)
  })

  it('redirects to geo URL when cf.country matches', async () => {
    const slug = `geo-cn-${crypto.randomUUID()}`
    const cnUrl = 'https://cn.example.com/landing'

    const createResponse = await postJson('/api/link/create', {
      url: 'https://example.com/default',
      slug,
      geo: { CN: cnUrl },
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const options: CfRequestInit = { redirect: 'manual', cf: { country: 'CN' } }
    const response = await fetch(`/${slug}`, options as RequestInit)

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe(cnUrl)
  })

  it('redirects to default URL when cf.country does not match', async () => {
    const slug = `geo-default-${crypto.randomUUID()}`
    const defaultUrl = 'https://example.com/default'

    const createResponse = await postJson('/api/link/create', {
      url: defaultUrl,
      slug,
      geo: { CN: 'https://cn.example.com/landing' },
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const options: CfRequestInit = { redirect: 'manual', cf: { country: 'US' } }
    const response = await fetch(`/${slug}`, options as RequestInit)

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe(defaultUrl)
  })

  it('shows geo URL in unsafe warning', async () => {
    const slug = `unsafe-geo-${crypto.randomUUID()}`
    const cnUrl = 'https://cn.example.com/unsafe'

    const createResponse = await postJson('/api/link/create', {
      url: 'https://example.com/default',
      slug,
      unsafe: true,
      geo: { CN: cnUrl },
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const options: CfRequestInit = { redirect: 'manual', cf: { country: 'CN' } }
    const response = await fetch(`/${slug}`, options as RequestInit)
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain(cnUrl)
  })

  it('adds viewport meta to cloaked links for mobile browsers (fixes #301)', async () => {
    const slug = `cloaking-viewport-${crypto.randomUUID()}`
    const targetUrl = 'https://example.com/mobile-target'

    const createResponse = await postJson('/api/link/create', {
      url: targetUrl,
      slug,
      cloaking: true,
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const response = await fetch(`/${slug}`, { redirect: 'manual' })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('<meta name="viewport" content="width=device-width,initial-scale=1">')
    expect(html).toContain(`<iframe src="${targetUrl}"`)
    expect(html).toContain('allow-top-navigation-by-user-activation')
    expect(html).toContain('allow-downloads')
    expect(html).toContain('allow-modals')
  })

  it('prefers device redirect over geo redirect', async () => {
    const slug = `device-over-geo-${crypto.randomUUID()}`
    const apple = 'https://apps.apple.com/app/sink-test-priority'

    const createResponse = await postJson('/api/link/create', {
      url: 'https://example.com/default',
      slug,
      apple,
      geo: { CN: 'https://cn.example.com/landing' },
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const options: CfRequestInit = {
      redirect: 'manual',
      cf: { country: 'CN' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147 Version/11.1.1 Mobile/15E148 Safari/604.1',
      },
    }
    const response = await fetch(`/${slug}`, options as RequestInit)

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe(apple)
  })
})

describe('password protected redirect', { concurrent: false }, () => {
  it('shows password page without password, rejects wrong password, and redirects with correct password', async () => {
    const password = 'redirect-secret123'
    const payload = {
      url: 'https://example.com/redirect-target',
      slug: `redirect-password-${crypto.randomUUID()}`,
      password,
    }

    const createResponse = await postJson('/api/link/create', payload)
    expect(createResponse.status).toBe(201)
    createdSlugs.push(payload.slug)

    const passwordPageResponse = await fetch(`/${payload.slug}`, { redirect: 'manual' })
    expect(passwordPageResponse.status).toBe(200)
    expect(await passwordPageResponse.text()).toContain('Password Required')

    const wrongPasswordResponse = await fetch(`/${payload.slug}`, {
      redirect: 'manual',
      headers: { 'x-link-password': 'wrong-password' },
    })
    expect(wrongPasswordResponse.status).toBe(403)

    const correctPasswordResponse = await fetch(`/${payload.slug}`, {
      redirect: 'manual',
      headers: { 'x-link-password': password },
    })
    expect(correctPasswordResponse.status).toBeGreaterThanOrEqual(300)
    expect(correctPasswordResponse.status).toBeLessThan(400)
    expect(correctPasswordResponse.headers.get('location')).toBe(payload.url)
  })

  it('carries a valid password through unsafe confirmation and redirects after confirmation', async () => {
    const slug = `password-unsafe-${crypto.randomUUID()}`
    const password = 'unsafe-secret123'
    const targetUrl = 'https://example.com/confirmed-target'
    const createResponse = await postJson('/api/link/create', {
      url: targetUrl,
      slug,
      password,
      unsafe: true,
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const passwordResponse = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(passwordResponse.status).toBe(200)
    expect(await passwordResponse.text()).toContain('Password Required')

    const warningResponse = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password }),
    })
    const warningHtml = await warningResponse.text()
    expect(warningResponse.status).toBe(200)
    expect(warningHtml).toContain('Potentially Unsafe Link')
    expect(warningHtml).toContain(`<input type="hidden" name="password" value="${password}">`)
    expect(warningHtml).toContain('<input type="hidden" name="confirm" value="true">')

    const confirmedResponse = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password, confirm: 'true' }),
    })
    expect(confirmedResponse.status).toBe(301)
    expect(confirmedResponse.headers.get('Location')).toBe(targetUrl)
  })
})
