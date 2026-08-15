import type { H3Event } from 'h3'
import type { AiChatResponse } from '../../utils/ai'
import { z } from 'zod'
import { parseAiResponse } from '../../utils/ai'

defineRouteMeta({
  openAPI: {
    description: 'Generate OpenGraph title and description using AI based on the URL',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'uri' },
        description: 'The URL to generate OpenGraph metadata for',
      },
      {
        name: 'locale',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Preferred locale for the generated metadata',
      },
    ],
  },
})

function fallbackMetadata(url: string): { title: string, description: string } {
  try {
    const { hostname } = new URL(url)

    return {
      title: hostname.replace(/^www\./, ''),
      description: `Short link for ${url}`,
    }
  }
  catch {
    return {
      title: 'Short Link',
      description: 'Check out this link on Sink.',
    }
  }
}

function resolveMetadataLocale(event: H3Event, locale?: string): string {
  const value = locale?.trim()
  if (!value) {
    return resolveRedirectLocale(event)
  }

  try {
    return Intl.getCanonicalLocales(value)[0] || resolveRedirectLocale(event)
  }
  catch {
    return resolveRedirectLocale(event)
  }
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, z.object({
    url: z.url(),
    locale: z.string().optional(),
  }).parse)
  const { url } = query
  const { cloudflare } = event.context
  const { AI } = cloudflare.env

  if (!AI) {
    throw createError({ status: 501, statusText: 'AI not enabled' })
  }

  const { aiOgPrompt, aiModel } = useRuntimeConfig(event)
  const locale = resolveMetadataLocale(event, query.locale)

  const markdown = await fetchPageMarkdown(event, url, AI)
  const userContent = markdown
    ? `URL: ${url}\n\nPage content:\n${markdown}`
    : url

  const messages = [
    { role: 'system', content: `${aiOgPrompt}\nGenerate the title and description in the language matching this locale: ${locale}.` },

    { role: 'user', content: 'https://www.cloudflare.com/' },
    { role: 'assistant', content: '{"title": "Cloudflare", "description": "Cloudflare is a global network designed to make everything you connect to the Internet secure, private, fast, and reliable."}' },

    { role: 'user', content: 'https://github.com/nuxt/' },
    { role: 'assistant', content: '{"title": "Nuxt", "description": "Nuxt is an intuitive and extensible Vue framework for creating modern web applications."}' },

    { role: 'user', content: userContent },
  ]

  let response: AiChatResponse
  try {
    // @ts-expect-error Workers AI supports model-specific chat template options at runtime.
    response = await AI.run(aiModel as keyof AiModels, {
      messages,
      chat_template_kwargs: {
        enable_thinking: false,
        thinking: false,
      },
    }) as AiChatResponse
  }
  catch (error) {
    console.warn('Workers AI metadata generation failed; using fallback.', error)
    return fallbackMetadata(url)
  }

  const fallback = fallbackMetadata(url)
  const result = parseAiResponse(response)

  const title = String(result.title ?? '').trim() || fallback.title
  const description = String(result.description ?? '').trim() || fallback.description

  return {
    title,
    description,
  }
})
