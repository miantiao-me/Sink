import { CreateLinkSchema } from '#shared/schemas/link'

// Nitro's defineRouteMeta extractor only supports static literals; request body
// schemas are injected into /_docs/openapi.json by server/plugins/openapi.ts.
defineRouteMeta({
  openAPI: {
    $global: {
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Use NUXT_SITE_TOKEN as the bearer token',
          },
        },
      },
    },
    description: 'Create a new short link',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': {} },
    },
  },
})

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, CreateLinkSchema.parse)
  const response = await saveNewLink(event, link)

  setResponseStatus(event, 201)
  return response
})
