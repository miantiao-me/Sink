import { CreateLinkSchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Create or update a short link (upsert)',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['url'],
            properties: {
              url: { type: 'string', description: 'The target URL' },
              slug: { type: 'string', description: 'Custom slug (auto-generated if not provided)' },
              comment: { type: 'string', description: 'Optional comment' },
              expiration: { type: 'integer', description: 'Expiration timestamp (unix seconds)' },
              title: { type: 'string', description: 'Custom title for link preview' },
              description: { type: 'string', description: 'Custom description for link preview' },
              image: { type: 'string', description: 'Custom image for link preview' },
              apple: { type: 'string', description: 'Apple App Store redirect URL' },
              google: { type: 'string', description: 'Google Play Store redirect URL' },
              unsafe: { type: 'boolean', description: 'Mark link as unsafe, showing a warning page before redirect' },
              geo: { type: 'object', additionalProperties: { type: 'string' }, description: 'Geo-routing rules (country code to URL)' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Up to 10 normalized link tags, each 1-32 characters' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, CreateLinkSchema.parse)

  await prepareIncomingLink(event, link)

  const existingLink = await getAuthoritativeLink(event, link.slug)
  if (existingLink) {
    return { ...buildLinkResponse(event, existingLink), status: 'existing' }
  }

  await hashLinkPasswordForCreate(link)

  if (!await createLink(event, link)) {
    const racedLink = await getAuthoritativeLink(event, link.slug)
    if (racedLink)
      return { ...buildLinkResponse(event, racedLink), status: 'existing' }
    throw createError({ status: 409, statusText: 'Link already exists' })
  }
  setResponseStatus(event, 201)
  return { ...buildLinkResponse(event, link), status: 'created' }
})
