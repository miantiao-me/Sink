import type { z } from 'zod'
import { LinkSchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Edit an existing short link',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['url', 'slug'],
            properties: {
              url: { type: 'string', description: 'The target URL' },
              slug: { type: 'string', description: 'The slug of the link to edit' },
              comment: { type: 'string', description: 'Optional comment' },
              expiration: { type: 'integer', description: 'Expiration timestamp (unix seconds)' },
              title: { type: 'string', description: 'Custom title for link preview' },
              description: { type: 'string', description: 'Custom description for link preview' },
              image: { type: 'string', description: 'Custom image for link preview' },
              apple: { type: 'string', description: 'Apple App Store redirect URL' },
              google: { type: 'string', description: 'Google Play Store redirect URL' },
              cloaking: { type: 'boolean', description: 'Enable link cloaking (mask destination URL)' },
              redirectWithQuery: { type: 'boolean', description: 'Append query parameters to destination URL' },
              password: { type: 'string', description: 'Password protection for the link' },
              unsafe: { type: 'boolean', description: 'Mark link as unsafe, showing a warning page before redirect' },
            },
          },
        },
      },
    },
  },
})

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

  // Auto-detect unsafe URL when URL changes and unsafe not explicitly set
  if (link.unsafe === undefined && link.url !== existingLink.url) {
    const safe = await isSafeUrl(event, link.url)
    if (!safe) {
      link.unsafe = true
    }
  }

  const newLink = {
    ...existingLink,
    ...link,
    id: existingLink.id,
    createdAt: existingLink.createdAt,
    updatedAt: Math.floor(Date.now() / 1000),
  }
  const optionalFields = [
    'comment',
    'title',
    'description',
    'image',
    'apple',
    'google',
    'cloaking',
    'redirectWithQuery',
    'password',
    'expiration',
    'unsafe',
  ] as const
  for (const field of optionalFields) {
    if (link[field] === undefined) {
      delete newLink[field]
    }
  }
  await putLink(event, newLink)
  setResponseStatus(event, 201)
  const shortLink = buildShortLink(event, newLink.slug)
  return { link: newLink, shortLink }
})
