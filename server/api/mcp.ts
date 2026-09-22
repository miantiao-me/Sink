import { handleMcpRequest } from '../services/mcp/server'

defineRouteMeta({
  openAPI: {
    tags: ['MCP'],
    description: 'Model Context Protocol endpoint (Streamable HTTP, stateless) served by the official @modelcontextprotocol/server SDK v2. Accepts standard MCP messages such as initialize, tools/list, tools/call, and ping. A message without an `id` is a notification and is answered with 202.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['jsonrpc', 'method'],
            additionalProperties: true,
            description: '`method` is one of initialize, notifications/initialized, tools/list, tools/call, or ping.',
          },
        },
      },
    },
  },
})

// H3 sends a returned web Response through untouched, so the SDK response is
// passed back directly with only a no-store hint added.
export default eventHandler(async (event) => {
  if (event.method !== 'POST') {
    setResponseHeader(event, 'Allow', 'POST')
    throw createError({ status: 405, statusText: 'Method Not Allowed' })
  }

  const response = await handleMcpRequest(event)
  response.headers.set('Cache-Control', 'no-store')
  return response
})
