import { CreateLinkSchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Create a short link, or return the existing one when the slug is taken',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': {} },
    },
  },
})

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, CreateLinkSchema.parse)
  const response = await upsertLink(event, link)

  if (response.status === 'created')
    setResponseStatus(event, 201)
  return response
})
