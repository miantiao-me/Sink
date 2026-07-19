import type { H3Event } from 'h3'
import { getHeader } from 'h3'

const MAX_RESPONSE_BYTES = 256 * 1024
const MAX_MARKDOWN_LENGTH = 4096

async function readLimitedBody(response: Response): Promise<string | null> {
  const reader = response.body?.getReader()
  if (!reader)
    return null

  const decoder = new TextDecoder()
  let body = ''
  let bytesRead = 0

  while (bytesRead < MAX_RESPONSE_BYTES) {
    const { done, value } = await reader.read()
    if (done) {
      body += decoder.decode()
      return body || null
    }

    const chunk = value.subarray(0, MAX_RESPONSE_BYTES - bytesRead)
    bytesRead += chunk.byteLength
    body += decoder.decode(chunk, { stream: true })

    if (bytesRead === MAX_RESPONSE_BYTES) {
      // Cancel at the byte cap to bound memory and upstream transfer.
      await reader.cancel()
      body += decoder.decode()
      return body || null
    }
  }

  return body || null
}

export async function fetchPageMarkdown(event: H3Event, url: string, AI: Ai): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const target = new URL(url)
    if (target.protocol !== 'http:' && target.protocol !== 'https:')
      return null

    const headers = new Headers({
      Accept: 'text/markdown, text/html;q=0.9, */*;q=0.8',
    })
    const acceptLanguage = getHeader(event, 'accept-language')
    if (acceptLanguage)
      headers.set('Accept-Language', acceptLanguage)

    const response = await fetch(target, { headers, signal: controller.signal })
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`)

    const contentType = response.headers.get('content-type') || ''
    const body = await readLimitedBody(response)
    if (!body) {
      return null
    }

    if (contentType.includes('text/markdown')) {
      return body.slice(0, MAX_MARKDOWN_LENGTH)
    }

    if (contentType.includes('text/html')) {
      try {
        const result = await AI.toMarkdown({
          name: 'page.html',
          blob: new Blob([body], { type: 'text/html' }),
        })
        if (result.format === 'markdown' && result.data) {
          return result.data.slice(0, MAX_MARKDOWN_LENGTH)
        }
      }
      catch (err) {
        console.warn(`[markdown] AI.toMarkdown() failed for ${url}:`, err)
      }
    }
  }
  catch (err) {
    console.warn(`[markdown] Failed to fetch ${url}:`, err)
  }
  finally {
    clearTimeout(timeout)
  }

  return null
}
