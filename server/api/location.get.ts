defineRouteMeta({
  openAPI: {
    description: 'Get the location of the user',
    responses: {
      200: {
        description: 'The location of the user',
      },
    },
  },
})

export default eventHandler((event) => {
  const { cloudflare } = event.context
  const { request: { cf } } = cloudflare
  return {
    latitude: cf?.latitude,
    longitude: cf?.longitude,
  }
})
