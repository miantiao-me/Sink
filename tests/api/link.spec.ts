import { generateMock } from '@anatine/zod-mock'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { fetch, fetchWithAuth } from '../utils'

const testLinkPayload = generateMock(z.object({
  url: z.string().url(),
  slug: z.string().min(1).max(50),
}))

describe('/api/link/ai', () => {
  // it('generates AI Slug for valid URL', async () => {
  //   const response = await fetchWithAuth(`/api/link/ai?url=${encodeURIComponent('https://sink.cool')}`)

  //   expect(response.status).toBe(200)

  //   const data = await response.json()
  //   console.log(data)
  // })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/ai')

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/create', () => {
  it('creates new link with valid data', async () => {
    const response = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify(testLinkPayload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.link).toBeDefined()
    expect(data.link.url).toBe(testLinkPayload.url)
    expect(data.link.slug).toBe(testLinkPayload.slug)
    expect(data.shortLink).toContain(testLinkPayload.slug)
  })

  it('returns 409 when slug already exists', async () => {
    const payload = generateMock(z.object({
      url: z.string().url(),
      slug: z.string().min(1).max(50),
    }))

    await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const duplicateResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(duplicateResponse.status).toBe(409)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/upsert', () => {
  it('creates new link with valid data', async () => {
    const payload = generateMock(z.object({
      url: z.string().url(),
      slug: z.string().min(1).max(50),
    }))

    const response = await fetchWithAuth('/api/link/upsert', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(201)
  })

  it('updates existing link with valid data', async () => {
    const response = await fetchWithAuth('/api/link/upsert', {
      method: 'POST',
      body: JSON.stringify(testLinkPayload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/upsert', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/query', () => {
  it('returns link data for valid slug', async () => {
    const response = await fetchWithAuth(`/api/link/query?slug=${testLinkPayload.slug}`)

    expect(response.status).toBe(200)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch(`/api/link/query?slug=${testLinkPayload.slug}`)

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/list', () => {
  it('returns paginated link list with valid auth', async () => {
    const response = await fetchWithAuth('/api/link/list')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('links')
    expect(data.links).toBeInstanceOf(Array)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/list')

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/search', () => {
  it('returns link array with valid auth', async () => {
    const response = await fetchWithAuth('/api/link/search')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/search')

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/edit', () => {
  it('updates existing link with valid data', async () => {
    const response = await fetchWithAuth('/api/link/edit', {
      method: 'PUT',
      body: JSON.stringify(testLinkPayload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(201)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/edit', {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/delete', () => {
  it('deletes link with valid slug and auth', async () => {
    const response = await fetchWithAuth('/api/link/delete', {
      method: 'POST',
      body: JSON.stringify({ slug: testLinkPayload.slug }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(204)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/delete', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })
})
