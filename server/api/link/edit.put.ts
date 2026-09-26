import { EditLinkSchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Edit an existing short link',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': {} },
    },
  },
})

export default eventHandler(async (event) => {
  assertLinkWritesAllowed(event, 'edit')
  const link = await readValidatedBody(event, EditLinkSchema.parse)
  const response = await replaceLink(event, link)

  setResponseStatus(event, 201)
  return response
})
