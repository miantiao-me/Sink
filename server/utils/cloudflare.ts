import type { H3Event } from 'h3'
import type { Compilable } from 'kysely'

export async function useWAE(event: H3Event, query: Compilable) {
  const { cfAccountId, cfApiToken } = useRuntimeConfig(event)
  if (!cfAccountId || !cfApiToken)
    return { data: [] }

  const compiledQuery = compileAnalyticsQuery(query)

  if (import.meta.dev)
    console.info('useWAE', compiledQuery)

  try {
    return await $fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfApiToken}`,
      },
      body: compiledQuery,
      retry: 1,
      retryDelay: 100, // ms
    })
  }
  catch (error: any) {
    // Keep the upstream Analytics Engine error visible without logging the token or query.
    console.error('[analytics] SQL request failed', {
      status: error?.response?.status ?? error?.status,
      statusText: error?.response?.statusText ?? error?.statusText,
      data: error?.data ?? error?.response?._data,
    })
    throw error
  }
}
