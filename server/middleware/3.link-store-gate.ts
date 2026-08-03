import { readCompletedLinkMigrationMarker } from '../services/link-store/migration'

const ALLOWED_MIGRATION_PATH = /^\/api\/link\/migration\/(?:status|run)\/?$/

export default eventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname
  if (pathname !== '/api/link' && !pathname.startsWith('/api/link/'))
    return
  if (ALLOWED_MIGRATION_PATH.test(pathname))
    return
  if (await readCompletedLinkMigrationMarker(event.context.cloudflare.env))
    return

  throw createError({
    status: 423,
    statusText: 'Link migration is required',
  })
})
