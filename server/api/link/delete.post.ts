import { LinkSchema } from '@@/schemas/link'
import { z } from 'zod'

const DeleteSchema = z.object({
  slug: LinkSchema.shape.slug.removeDefault().min(1),
})

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot delete links.',
    })
  }

  const { slug } = await readValidatedBody(event, DeleteSchema.parse)
  await deleteLink(event, slug)
})
