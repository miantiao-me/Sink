defineRouteMeta({
  openAPI: {
    description: 'Verify the current authentication method',
    responses: {
      200: {
        description: 'The authentication credentials are valid',
      },
      default: {
        description: 'The authentication credentials are invalid',
      },
    },
  },
})

export default eventHandler((event) => {
  const authMethod: unknown = event.context.authMethod
  if (authMethod !== 'site-token' && authMethod !== 'cloudflare-access') {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  const { cfAccessTeamDomain, cfAccessAud } = useRuntimeConfig(event)

  return {
    name: 'Sink',
    url: 'https://sink.cool',
    authMethod,
    accessEnabled: isCloudflareAccessConfigured(cfAccessTeamDomain, cfAccessAud),
  }
})
