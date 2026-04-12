import type { H3Event } from 'h3'
import { ofetch } from 'ofetch'

export async function fetchPageMarkdown(event: H3Event, url: string, AI: Ai): Promise<string | null> {
  const reqHeaders = Object.fromEntries(
    Object.entries(getHeaders(event)).filter(([_, v]) => v !== undefined),
  ) as Record<string, string>

  try {
    const response = await ofetch.raw(url, {
      headers: {
        ...reqHeaders,
        Accept: 'text/markdown, text/html;q=0.9, */*;q=0.8',
      },
      timeout: 5000,
      responseType: 'text',
    })

    const contentType = response.headers.get('content-type') || ''
    const body = response._data as string

    if (!body) {
      return null
    }

    // Markdown for Agents: site returns markdown directly
    if (contentType.includes('text/markdown')) {
      return body.slice(0, 4096)
    }

    // Fallback: convert HTML to markdown via AI.toMarkdown()
    if (contentType.includes('text/html')) {
      try {
        const result = await AI.toMarkdown({
          name: 'page.html',
          blob: new Blob([body], { type: 'text/html' }),
        })
        if (result.format === 'markdown' && result.data) {
          return result.data.slice(0, 4096)
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

  return null
}
