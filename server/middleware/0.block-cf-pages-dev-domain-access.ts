export default defineEventHandler((event) => {
  const host = getHeader(event, 'host') ?? ''
  if (host.endsWith('pages.dev')) {
    throw createError({ statusCode: 403, statusMessage: 'Access Denied' })
  }
})
