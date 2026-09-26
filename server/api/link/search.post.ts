import { ExactUrlSearchSchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Search links by an exact target URL without placing the URL in the request query string',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': {} },
    },
  },
})

export default eventHandler(async (event) => {
  const query = await readValidatedBody(event, ExactUrlSearchSchema.parse)
  return await searchLinks(event, query)
})
