import { LinkSchema, nanoid } from '#shared/schemas/link'
import { IMAGE_ALLOWED_TYPES, IMAGE_MAX_SIZE } from '@/utils/image'

const slugValidator = LinkSchema.shape.slug

defineRouteMeta({
  openAPI: {
    description: 'Upload an image to R2 storage',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file', 'slug'],
            properties: {
              file: { type: 'string', format: 'binary' },
              slug: { type: 'string' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  const { R2 } = cloudflare.env

  const formData = await readFormData(event)
  const file = formData.get('file') as File | null
  const slug = formData.get('slug') as string | null

  if (!file) {
    throw createError({ status: 400, statusText: 'File is required' })
  }

  if (!slug) {
    throw createError({ status: 400, statusText: 'Slug is required' })
  }

  const slugResult = slugValidator.safeParse(slug)
  if (!slugResult.success) {
    throw createError({ status: 400, statusText: 'Invalid slug format' })
  }

  if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
    throw createError({ status: 400, statusText: 'Invalid file type. Allowed: jpeg, png, webp, gif' })
  }

  if (file.size > IMAGE_MAX_SIZE) {
    throw createError({ status: 400, statusText: 'File size exceeds 5MB limit' })
  }

  const ext = file.type.split('/')[1]
  const key = `images/${slug}/${nanoid(10)()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  await R2.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  })

  const imageUrl = `/_assets/${key}`
  return { url: imageUrl, key }
})
