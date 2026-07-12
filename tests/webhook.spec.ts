import type { LinkClickedWebhook } from '../shared/schemas/webhook'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createLinkClickedWebhook,
  createWebhookDelivery,
  deliverWebhook,
  handleWebhookDelivery,
  isWebhookConfigured,
  scheduleWebhookDelivery,
  signWebhook,
} from '../server/utils/webhook'
import { LinkClickedWebhookSchema } from '../shared/schemas/webhook'

const secret = 'whsec_MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY='

const click = {
  country: 'US',
  region: 'California',
  city: 'San Francisco',
  device: 'mobile',
  browser: 'Mobile Safari',
  os: 'iOS',
  referer: 'example.com',
}

function createPayload(): LinkClickedWebhook {
  return {
    id: 'evt_test',
    event: 'link.clicked',
    createdAt: '2026-07-11T12:00:00.000Z',
    data: {
      click: {
        id: 'clk_test',
        timestamp: '2026-07-11T12:00:00.000Z',
        country: 'US',
        region: 'California',
        city: 'San Francisco',
        device: 'iPhone',
        browser: 'Mobile Safari',
        os: 'iOS',
        referer: 'example.com',
      },
      link: {
        id: 'link_test',
        slug: 'test',
      },
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('link clicked webhook payload', () => {
  it('creates a schema-valid payload without sensitive fields', () => {
    const payload = createLinkClickedWebhook(click, { id: 'link_test', slug: 'test' })

    expect(LinkClickedWebhookSchema.parse(payload)).toEqual(payload)
    expect(payload.id).toMatch(/^evt_[^.]+$/)
    expect(payload.data.click.id).toMatch(/^clk_[^.]+$/)
    expect(payload.data.click.timestamp).toBe(payload.createdAt)
    expect(payload.data.click.device).toBe('mobile')
    expect(payload).not.toHaveProperty('ip')
    expect(payload.data.click).not.toHaveProperty('ip')
    expect(payload.data.click).not.toHaveProperty('latitude')
    expect(payload.data.click).not.toHaveProperty('longitude')
    expect(payload.data.click).not.toHaveProperty('ua')
    expect(payload.data.click).not.toHaveProperty('query')
    expect(payload.data.link).not.toHaveProperty('password')
    expect(payload.data.link).not.toHaveProperty('url')
    expect(payload.data.link).toEqual({ id: 'link_test', slug: 'test' })
  })

  it('rejects extra sensitive fields', () => {
    const payload = createPayload()
    expect(() => LinkClickedWebhookSchema.parse({ ...payload, ip: '192.0.2.1' })).toThrow()
    expect(() => LinkClickedWebhookSchema.parse({
      ...payload,
      data: {
        ...payload.data,
        link: { ...payload.data.link, url: 'https://example.com' },
      },
    })).toThrow()
  })

  it('requires non-empty link identifiers', () => {
    const payload = createPayload()
    expect(() => LinkClickedWebhookSchema.parse({
      ...payload,
      data: { ...payload.data, link: { id: '', slug: '' } },
    })).toThrow()
  })
})

describe('standard webhook delivery', () => {
  it('matches a fixed HMAC-SHA256 signature vector', async () => {
    const signature = await signWebhook('evt_test', 1_700_000_000, '{"hello":"world"}', secret)
    expect(signature).toBe('v1,zbepGFaw3CoyW6kZTr419oJi4XIEPboIqPX1vXGLWlI=')
  })

  it('rejects short and invalid secrets', async () => {
    await expect(signWebhook('evt_test', 1_700_000_000, '{}', 'whsec_c2hvcnQ=')).rejects.toMatchObject({ code: 'invalid_secret' })
    await expect(signWebhook('evt_test', 1_700_000_000, '{}', 'whsec_not-base64!')).rejects.toMatchObject({ code: 'invalid_secret' })
  })

  it('uses one raw body for the headers, signature, and request with manual redirects', async () => {
    const payload = createPayload()
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const rawBody = String(init?.body)
      const headers = new Headers(init?.headers)
      expect(rawBody).toBe(JSON.stringify(payload))
      expect(headers.get('content-type')).toBe('application/json')
      expect(headers.get('webhook-id')).toBe(payload.id)
      expect(headers.get('webhook-timestamp')).toBe('1700000000')
      expect(headers.get('webhook-signature')).toBe(await signWebhook(payload.id, 1_700_000_000, rawBody, secret))
      expect(headers.has('dub-signature')).toBe(false)
      expect(init?.redirect).toBe('manual')
      expect(init?.method).toBe('POST')
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      return new Response(null, { status: 204 })
    })

    await expect(deliverWebhook({
      url: 'https://webhook.example.com/events',
      secret,
      payload,
      deliveryTimestamp: 1_700_000_000,
      fetcher,
    })).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('sends an unsigned webhook when only the URL is configured', async () => {
    const payload = createPayload()
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(init?.body).toBe(JSON.stringify(payload))
      expect(headers.get('webhook-id')).toBe(payload.id)
      expect(headers.get('webhook-timestamp')).toBe('1700000000')
      expect(headers.has('webhook-signature')).toBe(false)
      expect(headers.has('dub-signature')).toBe(false)
      return new Response(null, { status: 204 })
    })

    await expect(deliverWebhook({
      url: 'https://webhook.example.com/events',
      payload,
      deliveryTimestamp: 1_700_000_000,
      fetcher,
    })).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('rejects non-2xx responses', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 302 }))
    await expect(deliverWebhook({
      url: 'https://webhook.example.com/events',
      secret,
      payload: createPayload(),
      fetcher,
    })).rejects.toMatchObject({ code: 'unexpected_status', status: 302 })
  })

  it('enables delivery from the URL and allows only HTTP URLs', async () => {
    expect(isWebhookConfigured('https://example.com')).toBe(true)
    expect(isWebhookConfigured('')).toBe(false)
    expect(isWebhookConfigured('   ')).toBe(false)

    const fetcher = vi.fn(async () => new Response(null, { status: 204 }))
    await expect(deliverWebhook({
      url: 'ftp://example.com/events',
      secret,
      payload: createPayload(),
      fetcher,
    })).rejects.toMatchObject({ code: 'invalid_url' })
    await expect(deliverWebhook({
      url: 'https://user:password@webhook.example.com/events',
      secret,
      payload: createPayload(),
      fetcher,
    })).rejects.toMatchObject({ code: 'invalid_url' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('does nothing when the URL is empty', () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }))
    const delivery = createWebhookDelivery({
      url: '',
      secret: '',
      click,
      link: { id: 'link_test', slug: 'test' },
      fetcher,
    })

    expect(delivery).toBeUndefined()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('does not downgrade an invalid non-empty secret to unsigned delivery', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }))
    const delivery = createWebhookDelivery({
      url: 'https://webhook.example.com/events',
      secret: 'invalid-secret',
      click,
      link: { id: 'link_test', slug: 'test' },
      fetcher,
    })
    if (!delivery)
      throw new Error('Expected configured webhook delivery')

    await expect(delivery).rejects.toMatchObject({ code: 'invalid_secret' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('contains delivery failures inside the background boundary', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handleWebhookDelivery(Promise.reject(new Error('network failure')))).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith({
      event: 'webhook.delivery.failed',
      code: 'request_failed',
      status: undefined,
    })
  })

  it('schedules a caught fetch failure without throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetcher = vi.fn(async () => {
      throw new Error('network failure')
    })
    const delivery = createWebhookDelivery({
      url: 'https://webhook.example.com/events',
      secret,
      click,
      link: { id: 'link_test', slug: 'test' },
      fetcher,
    })
    if (!delivery)
      throw new Error('Expected configured webhook delivery')

    let backgroundPromise: Promise<unknown> | undefined
    const context: Pick<ExecutionContext, 'waitUntil'> = {
      waitUntil(promise) {
        backgroundPromise = promise
      },
    }

    expect(() => scheduleWebhookDelivery(context, delivery)).not.toThrow()
    if (!backgroundPromise)
      throw new Error('Expected a background promise')
    await expect(backgroundPromise).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledOnce()
    expect(consoleError).toHaveBeenCalledWith({
      event: 'webhook.delivery.failed',
      code: 'request_failed',
      status: undefined,
    })
  })
})
