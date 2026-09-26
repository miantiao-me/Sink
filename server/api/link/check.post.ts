import { LinkCheckRequestSchema } from '#shared/schemas/link-check'

defineRouteMeta({
  openAPI: {
    description: 'Check target URLs for existing short links',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              cursor: { type: 'string', description: 'Pagination cursor from the previous response' },
              limit: { type: 'integer', default: 6, minimum: 1, maximum: 10, description: 'Maximum number of links to check' },
              timeout: { type: 'integer', default: 6, minimum: 1, maximum: 30, description: 'Timeout in seconds for each link' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const request = await readValidatedBody(event, LinkCheckRequestSchema.parse)
  return checkLinksPage(event, request)
})
