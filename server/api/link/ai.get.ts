import { destr } from 'destr'
import { z } from 'zod'

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

interface AiChatResponse {
  response?: string
  choices?: { message?: { content?: string } }[]
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

  const response = await AI.run(aiModel as keyof AiModels, { messages }) as AiChatResponse

  let content = response.response ?? response.choices?.[0]?.message?.content ?? ''
  // Strip markdown code block wrapper (e.g. ```json\n{...}\n```)
  const codeBlockMatch = content.match(/```\w*\n([^`]+)```/)
  if (codeBlockMatch?.[1]) {
    content = codeBlockMatch[1].trim()
  }

  return destr(content)
})
