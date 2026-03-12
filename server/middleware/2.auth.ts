export default eventHandler((event) => {
  const token = getHeader(event, 'Authorization')?.replace(/^Bearer\s+/, '')
  if (event.path.startsWith('/api/') && token !== useRuntimeConfig(event).siteToken) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }
  if (token && token.length < 8) {
    throw createError({
      status: 401,
      statusText: 'Token is too short',
    })
  }
})
