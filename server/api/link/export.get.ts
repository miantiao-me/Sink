import type { ExportData, Link } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Export all links with pagination',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'cursor',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Pagination cursor from previous response',
      },
    ],
  },
})

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const cursor = query.cursor as string | undefined
  const kvBatchLimit = useRuntimeConfig(event).public.kvBatchLimit as string
  const limit = +kvBatchLimit

  const list = await listLinks(event, { limit, cursor })
  const links = list.links.filter((link): link is Link => link !== null)

  const exportData: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: links.length,
    links,
    cursor: list.cursor,
    list_complete: list.list_complete,
  }

  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, 'Cache-Control', 'no-store')

  return exportData
})
