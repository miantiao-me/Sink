import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth, TEST_PNG_BYTES } from '../utils'

describe('/api/upload/image', () => {
  it('uploads and serves a PNG with immutable cache metadata', async () => {
    const formData = new FormData()
    const file = new File([TEST_PNG_BYTES], 'test.png', { type: 'image/png' })
    const slug = `upload-${crypto.randomUUID()}`
    formData.append('file', file)
    formData.append('slug', slug)

    let key: string | undefined
    try {
      const response = await fetchWithAuth('/api/upload/image', {
        method: 'POST',
        body: formData,
      })
      expect(response.status).toBe(200)

      const data = await response.json() as { url: string, key: string }
      key = data.key
      expect(data.url).toBe(`/_assets/${data.key}`)
      expect(data.key).toMatch(new RegExp(`^images/${slug}/[a-z0-9]+\\.png$`))

      const assetResponse = await fetch(data.url)
      expect(assetResponse.status).toBe(200)
      expect(new Uint8Array(await assetResponse.arrayBuffer())).toEqual(TEST_PNG_BYTES)
      expect(assetResponse.headers.get('Content-Type')).toBe('image/png')
      expect(assetResponse.headers.get('ETag')).toBeTruthy()
      expect(assetResponse.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    }
    finally {
      if (key)
        await env.R2.delete(key)
    }
  })

  it('rejects asset paths outside images', async () => {
    const response = await fetch('/_assets/documents/test.txt')
    expect(response.status).toBe(403)
  })

  it('returns 400 when file is missing', async () => {
    const formData = new FormData()
    formData.append('slug', 'test-slug')

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 when slug is missing', async () => {
    const formData = new FormData()
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    formData.append('file', file)

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid file type', async () => {
    const formData = new FormData()
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    formData.append('file', file)
    formData.append('slug', 'test-slug')

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for file exceeding 5MB limit', async () => {
    const formData = new FormData()
    const largeContent = new Uint8Array(5 * 1024 * 1024 + 1)
    const file = new File([largeContent], 'large.png', { type: 'image/png' })
    formData.append('file', file)
    formData.append('slug', 'test-slug')

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid slug format', async () => {
    const formData = new FormData()
    const file = new File([TEST_PNG_BYTES], 'test.png', { type: 'image/png' })
    formData.append('file', file)
    formData.append('slug', 'invalid<>slug/path')

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })
})
