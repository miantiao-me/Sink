import { handleMcpPost } from '../services/mcp/server'

defineRouteMeta({
  openAPI: {
    tags: ['MCP'],
    description: 'Model Context Protocol endpoint (Streamable HTTP). Accepts a single JSON-RPC 2.0 message per POST and answers with a JSON object. Implements the stateless 2026-07-28 revision and still answers the initialization-based revisions used by older clients.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['jsonrpc', 'method'],
            additionalProperties: true,
            description: '`method` is one of server/discover, tools/list, or tools/call; older clients may also send initialize and ping. A message without an `id` is a notification and is answered with 202.',
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const { status, body } = await handleMcpPost(event)

  setResponseStatus(event, status)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (body === null)
    return null

  setResponseHeader(event, 'Content-Type', 'application/json')
  return body
})
