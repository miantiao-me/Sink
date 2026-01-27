import type { z } from 'zod'
import { LinkSchema } from '@@/schemas/link'

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot edit links.',
    })
  }
  const link = await readValidatedBody(event, LinkSchema.parse)

  const existingLink: z.infer<typeof LinkSchema> | null = await getLink(event, link.slug)
  if (!existingLink) {
    throw createError({
      status: 404,
      statusText: 'Link not found',
    })
  }

  const newLink = {
    ...existingLink,
    ...link,
    id: existingLink.id,
    createdAt: existingLink.createdAt,
    updatedAt: Math.floor(Date.now() / 1000),
  }
  await putLink(event, newLink)
  setResponseStatus(event, 201)
  const shortLink = buildShortLink(event, newLink.slug)
  return { link: newLink, shortLink }
})
