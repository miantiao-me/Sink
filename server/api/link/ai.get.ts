import { generateText, Output } from 'ai'
import { createWorkersAI } from 'workers-ai-provider'
import { z } from 'zod'

export default eventHandler(async (event) => {
  const url = (await getValidatedQuery(event, z.object({
    url: z.string().url(),
  }).parse)).url
  const { cloudflare } = event.context
  const { AI } = cloudflare.env

  if (AI) {
    const { aiPrompt, aiModel } = useRuntimeConfig(event)
    const { slugRegex } = useAppConfig()

    const workersai = createWorkersAI({ binding: AI })
    const { output } = await generateText({
      model: workersai(aiModel as Parameters<typeof workersai>[0]),
      output: Output.object({
        schema: z.object({
          slug: z.string().describe('The generated slug for the URL'),
        }),
      }),
      system: aiPrompt.replace('{slugRegex}', slugRegex.toString()),
      messages: [
        { role: 'user', content: 'https://www.cloudflare.com/' },
        { role: 'assistant', content: JSON.stringify({ slug: 'cloudflare' }) },

        { role: 'user', content: 'https://github.com/nuxt/' },
        { role: 'assistant', content: JSON.stringify({ slug: 'nuxt' }) },

        { role: 'user', content: 'https://sink.cool/' },
        { role: 'assistant', content: JSON.stringify({ slug: 'sink-cool' }) },

        { role: 'user', content: 'https://github.com/miantiao-me/sink' },
        { role: 'assistant', content: JSON.stringify({ slug: 'sink' }) },

        { role: 'user', content: url },
      ],
    })
    return output
  }
  else {
    throw createError({ status: 501, statusText: 'AI not enabled' })
  }
})
