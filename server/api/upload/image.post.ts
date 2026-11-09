import { nanoid, SlugSchema } from '#shared/schemas/link'
import { IMAGE_UPLOAD_KINDS, isIconType, isImageUploadKind } from '#shared/utils/image'

const slugValidator = SlugSchema

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
              kind: { type: 'string', enum: ['image', 'favicon'], default: 'image' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const R2 = requireR2Bucket(event.context.cloudflare.env)

  const formData = await readFormData(event)
  const file = formData.get('file') as File | null
  const slug = formData.get('slug') as string | null
  const kind = formData.get('kind') ?? 'image'

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

  if (!isImageUploadKind(kind)) {
    throw createError({ status: 400, statusText: 'Invalid kind. Allowed: image, favicon' })
  }

  // SVG can run scripts when opened directly from the short link host, so we never store it.
  if (file.type === 'image/svg+xml') {
    throw createError({ status: 400, statusText: 'SVG files are not supported for security reasons' })
  }

  const { types, maxSize } = IMAGE_UPLOAD_KINDS[kind]
  if (!types.includes(file.type)) {
    throw createError({ status: 400, statusText: `Invalid file type. Allowed: ${types.join(', ')}` })
  }

  if (file.size > maxSize) {
    throw createError({ status: 400, statusText: `File size exceeds ${maxSize / 1024 / 1024}MB limit` })
  }

  const ext = isIconType(file.type) ? 'ico' : file.type.split('/')[1]
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
