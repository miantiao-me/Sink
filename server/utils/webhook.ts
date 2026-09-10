import type { Link } from '#shared/schemas/link'
import type { LinkClickedWebhook } from '#shared/schemas/webhook'
import type { H3Event } from 'h3'
import type { WebhookClickContext } from './access-log'

const WEBHOOK_TIMEOUT_MS = 10_000
const WEBHOOK_SECRET_PREFIX = 'whsec_'

type WebhookFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

interface DeliverWebhookOptions {
  url: string
  secret?: string
  payload: LinkClickedWebhook
  deliveryTimestamp?: number
  fetcher?: WebhookFetch
}

interface CreateWebhookDeliveryOptions {
  url: string
  secret?: string
  click: WebhookClickContext
  link: Pick<Link, 'id' | 'slug'>
  fetcher?: WebhookFetch
}

export class WebhookDeliveryError extends Error {
  constructor(public code: string, public status?: number) {
    super(code)
    this.name = 'WebhookDeliveryError'
  }
}

export function isWebhookConfigured(url: string): boolean {
  return Boolean(url.trim())
}

export function createLinkClickedWebhook(click: WebhookClickContext, link: Pick<Link, 'id' | 'slug'>): LinkClickedWebhook {
  const createdAt = new Date().toISOString()

  return {
    id: `evt_${crypto.randomUUID()}`,
    event: 'link.clicked',
    createdAt,
    data: {
      click: {
        id: `clk_${crypto.randomUUID()}`,
        timestamp: createdAt,
        country: click.country,
        region: click.region,
        city: click.city,
        device: click.device,
        browser: click.browser,
        os: click.os,
        referer: click.referer,
      },
      link: {
        id: link.id,
        slug: link.slug,
      },
    },
  }
}

function decodeWebhookSecret(secret: string): Uint8Array<ArrayBuffer> {
  if (!secret.startsWith(WEBHOOK_SECRET_PREFIX))
    throw new WebhookDeliveryError('invalid_secret')

  try {
    const decoded = atob(secret.slice(WEBHOOK_SECRET_PREFIX.length))
    if (decoded.length < 24 || decoded.length > 64)
      throw new Error('Invalid secret length')
    const bytes = new Uint8Array(decoded.length)
    for (let index = 0; index < decoded.length; index++)
      bytes[index] = decoded.charCodeAt(index)
    return bytes
  }
  catch {
    throw new WebhookDeliveryError('invalid_secret')
  }
}

export async function signWebhook(id: string, deliveryTimestamp: number, rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    decodeWebhookSecret(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const input = new TextEncoder().encode(`${id}.${deliveryTimestamp}.${rawBody}`)
  const signature = await crypto.subtle.sign('HMAC', key, input)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return `v1,${base64}`
}

export async function deliverWebhook(options: DeliverWebhookOptions): Promise<void> {
  const url = new URL(options.url)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new WebhookDeliveryError('invalid_url')

  const deliveryTimestamp = options.deliveryTimestamp ?? Math.floor(Date.now() / 1000)
  const rawBody = JSON.stringify(options.payload)
  const headers = new Headers({
    'Content-Type': 'application/json',
    'webhook-id': options.payload.id,
    'webhook-timestamp': String(deliveryTimestamp),
  })
  if (options.secret)
    headers.set('webhook-signature', await signWebhook(options.payload.id, deliveryTimestamp, rawBody, options.secret))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)
  try {
    const response = await (options.fetcher || fetch)(url, {
      method: 'POST',
      redirect: 'manual',
      signal: controller.signal,
      headers,
      body: rawBody,
    })

    await response.body?.cancel()
    if (!response.ok)
      throw new WebhookDeliveryError('unexpected_status', response.status)
  }
  finally {
    clearTimeout(timeout)
  }
}

export async function handleWebhookDelivery(delivery: Promise<void>): Promise<void> {
  try {
    await delivery
  }
  catch (error) {
    console.error({
      event: 'webhook.delivery.failed',
      code: error instanceof WebhookDeliveryError ? error.code : 'request_failed',
      status: error instanceof WebhookDeliveryError ? error.status : undefined,
    })
  }
}

export function createWebhookDelivery(options: CreateWebhookDeliveryOptions): Promise<void> | undefined {
  if (!isWebhookConfigured(options.url))
    return

  return deliverWebhook({
    url: options.url,
    secret: options.secret,
    payload: createLinkClickedWebhook(options.click, options.link),
    fetcher: options.fetcher,
  })
}

export function scheduleWebhookDelivery(context: Pick<ExecutionContext, 'waitUntil'>, delivery: Promise<void> | undefined): void {
  if (delivery)
    context.waitUntil(handleWebhookDelivery(delivery))
}

export function queueLinkClickedWebhook(event: H3Event, click: WebhookClickContext, link: Pick<Link, 'id' | 'slug'>): void {
  const { webhookUrl, webhookSecret } = useRuntimeConfig(event)
  const delivery = createWebhookDelivery({
    url: webhookUrl,
    secret: webhookSecret,
    click,
    link,
  })
  scheduleWebhookDelivery(event.context.cloudflare.context, delivery)
}
