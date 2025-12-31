import { destr } from 'destr'
import { z } from 'zod'

export default eventHandler(async (event) => {
  const url = (await getValidatedQuery(event, z.object({
    url: z.string().url(),
  }).parse)).url
  const { cloudflare } = event.context
  const { AI } = cloudflare.env

  if (AI) {
    const { aiPrompt, aiModel } = useRuntimeConfig(event)
    const { slugRegex } = useAppConfig(event)
    const messages = [
      { role: 'system', content: aiPrompt.replace('{slugRegex}', slugRegex.toString()) },

      { role: 'user', content: 'https://www.cloudflare.com/' },
      { role: 'assistant', content: '{"slug": "cloudflare"}' },

      { role: 'user', content: 'https://github.com/nuxt-hub/' },
      { role: 'assistant', content: '{"slug": "nuxt-hub"}' },

      { role: 'user', content: 'https://sink.cool/' },
      { role: 'assistant', content: '{"slug": "sink-cool"}' },

      { role: 'user', content: 'https://github.com/miantiao-me/sink' },
      { role: 'assistant', content: '{"slug": "sink"}' },

      {
        role: 'user',
        content: url,
      },
    ]
    // @ts-expect-error Workers AI is not typed
    const { response } = await hubAI().run(aiModel, { messages })
    return destr(response)
  }
  else {
    throw createError({ status: 501, statusText: 'AI not enabled' })
  }
})
