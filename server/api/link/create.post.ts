import { LinkSchema } from '@@/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Create a new short link',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          // Need: https://github.com/nitrojs/nitro/issues/2974
          schema: {
            type: 'object',
            required: ['url'],
            properties: {
              url: {
                type: 'string',
                description: 'The URL to shorten',
              },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)

  link.slug = normalizeSlug(event, link.slug)

  const existingLink = await getLink(event, link.slug)
  if (existingLink) {
    throw createError({
      status: 409,
      statusText: 'Link already exists',
    })
  }

  await putLink(event, link)
  setResponseStatus(event, 201)
  const shortLink = buildShortLink(event, link.slug)
  return { link, shortLink }
})
