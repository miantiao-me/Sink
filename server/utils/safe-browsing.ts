import type { H3Event } from 'h3'
import { ofetch } from 'ofetch'

export async function isSafeUrl(event: H3Event, url: string): Promise<boolean> {
  const { safeBrowsingDoh } = useRuntimeConfig(event)
  if (!safeBrowsingDoh)
    return true

  try {
    const { hostname } = new URL(url)
    const dohUrl = new URL(safeBrowsingDoh)
    dohUrl.searchParams.set('type', 'A')
    dohUrl.searchParams.set('name', hostname)

    const dnsResult = await ofetch<{ Answer?: Array<{ data: string }> }>(dohUrl.toString(), {
      headers: { accept: 'application/dns-json' },
      timeout: 5000,
      responseType: 'json',
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { '200-299': 3600 },
      },
    } as RequestInit)
    if (dnsResult && Array.isArray(dnsResult.Answer)) {
      const isBlocked = dnsResult.Answer.some(answer => answer.data === '0.0.0.0')
      return !isBlocked
    }
  }
  catch (e) {
    const { hostname } = new URL(url)
    console.warn('isSafeUrl check failed:', hostname, e)
  }
  return true
}
