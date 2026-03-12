import { LinkSchema } from '#shared/schemas/link'

const slugValidator = LinkSchema.shape.slug

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  const { R2 } = cloudflare.env
  const key = getRouterParam(event, 'key')

  if (!key) {
    throw createError({ status: 400, statusText: 'Key is required' })
  }

  // Only allow access to images/ path
  if (!key.startsWith('images/')) {
    throw createError({ status: 403, statusText: 'Access denied' })
  }

  // Validate slug in path: images/{slug}/{filename}
  const parts = key.split('/')
  if (parts.length < 3) {
    throw createError({ status: 400, statusText: 'Invalid path format' })
  }

  const slug = parts[1]
  const slugResult = slugValidator.safeParse(slug)
  if (!slugResult.success) {
    throw createError({ status: 400, statusText: 'Invalid slug format' })
  }

  const object = await R2.get(key)

  if (!object) {
    throw createError({ status: 404, statusText: 'Image not found' })
  }

  const contentType = object.httpMetadata?.contentType || 'application/octet-stream'

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  setHeader(event, 'ETag', object.etag)

  return object.body
})
