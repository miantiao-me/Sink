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

  const { caseSensitive } = useRuntimeConfig(event)

  if (!caseSensitive) {
    link.slug = link.slug.toLowerCase()
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const existingLink = await KV.get(`link:${link.slug}`)
  if (existingLink) {
    throw createError({
      status: 409, // Conflict
      statusText: 'Link already exists',
    })
  }

  else {
    const expiration = getExpiration(event, link.expiration)

    await KV.put(`link:${link.slug}`, JSON.stringify(link), {
      expiration,
      metadata: {
        expiration,
        url: link.url,
        comment: link.comment,
        tags: link.tags,
      },
    })
    setResponseStatus(event, 201)
    const shortLink = `${getRequestProtocol(event)}://${getRequestHost(event)}/${link.slug}`
    return { link, shortLink }
  }
})
