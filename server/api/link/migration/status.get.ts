import type { LinkMigrationStatus } from '#shared/schemas/link-migration'
import { readCompletedLinkMigrationMarker } from '../../../services/link-store/migration'

defineRouteMeta({
  openAPI: {
    description: 'Get KV to D1 link migration status',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async (event): Promise<LinkMigrationStatus> => {
  const marker = await readCompletedLinkMigrationMarker(event.context.cloudflare.env)
  return {
    completed: marker !== null,
    marker,
  }
})
