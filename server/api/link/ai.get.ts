import type { H3Event } from 'h3'
import type { AiChatResponse } from '../../utils/ai'
import { destr } from 'destr'
import { z } from 'zod'
import { stripCodeFence } from '../../utils/ai'

defineRouteMeta({
  openAPI: {
    description: 'Generate a slug using AI based on the URL',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'uri' },
        description: 'The URL to generate a slug for',
      },
    ],
  },
})

function fallbackSlug(event: H3Event, url: string): string {
  let source = 'link'

  try {
    const urlObj = new URL(url)
    const pathSegments = urlObj.pathname.split('/').filter(Boolean)
    source = pathSegments.at(-1) ?? urlObj.hostname
  }
  catch {
    source = 'link'
  }

  const sanitizedSlug = source
    .replace(/[^A-Z0-9-]/gi, '-')
    .slice(0, 50)
    .replace(/^-+|-+$/g, '') || 'link'

  return normalizeSlug(event, sanitizedSlug)
}

export default eventHandler(async (event) => {
  const url = (await getValidatedQuery(event, z.object({
    url: z.string().url(),
  }).parse)).url
  const { cloudflare } = event.context
  const { AI } = cloudflare.env

  if (!AI) {
    throw createError({ status: 501, statusText: 'AI not enabled' })
  }

  const { aiPrompt, aiModel } = useRuntimeConfig(event)
  const { slugRegex } = useAppConfig()

  const markdown = await fetchPageMarkdown(event, url, AI)
  const userContent = markdown
    ? `URL: ${url}\n\nPage content:\n${markdown}`
    : url

  const messages = [
    { role: 'system', content: aiPrompt.replace('{slugRegex}', slugRegex.toString()) },

    { role: 'user', content: 'https://www.cloudflare.com/' },
    { role: 'assistant', content: '{"slug": "cloudflare"}' },

    { role: 'user', content: 'https://github.com/nuxt/' },
    { role: 'assistant', content: '{"slug": "nuxt"}' },

    { role: 'user', content: 'https://sink.cool/' },
    { role: 'assistant', content: '{"slug": "sink-cool"}' },

    { role: 'user', content: 'https://github.com/miantiao-me/sink' },
    { role: 'assistant', content: '{"slug": "sink"}' },

    { role: 'user', content: userContent },
  ]

  const response = await AI.run(aiModel as keyof AiModels, {
    messages,
    chat_template_kwargs: {
      enable_thinking: false,
      thinking: false,
    },
  }) as AiChatResponse

  const content = response.response ?? response.choices?.[0]?.message?.content ?? ''

  if (content.trim() === '') {
    return { slug: fallbackSlug(event, url) }
  }

  const parsed = destr(stripCodeFence(content))
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { slug: fallbackSlug(event, url) }
  }

  const result = parsed as Record<string, unknown>
  const slug = String(result.slug ?? '').trim()
  if (!slug) {
    return { slug: fallbackSlug(event, url) }
  }

  return {
    slug: normalizeSlug(event, slug),
  }
})
