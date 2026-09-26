import { assertLinkStoreReady } from '../services/link-store/migration'

// Only routes that read or write the link store are gated; AI helpers, the
// migration endpoints themselves, and unrelated APIs (verify, MCP, stats)
// keep working while the KV-to-D1 migration is pending.
const LINK_STORE_ROUTES = /^\/api\/link\/(?:check|count|create|delete|edit|export|import|list|query|search|tags|upsert)\/?$/

export default eventHandler(async (event) => {
  if (LINK_STORE_ROUTES.test(getRequestURL(event).pathname))
    await assertLinkStoreReady(event)
})
