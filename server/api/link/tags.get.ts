defineRouteMeta({
  openAPI: {
    description: 'List tags currently used by links',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async event => await listTags(event))
