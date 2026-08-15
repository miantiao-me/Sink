import type { LinkCheckConfig, LinkCheckResponse, LinkCheckResult } from '@/types'
import { computed, ref, shallowRef } from 'vue'
import { useAPI } from '@/utils/api'

type LinkCheckRunResult = 'completed' | 'empty' | 'stopped'
interface LinkCountResponse {
  count: number
}

export function useLinkCheck() {
  const results = ref<LinkCheckResult[]>([])
  const totalCount = shallowRef(0)
  const loadingLinks = shallowRef(false)
  const checking = shallowRef(false)
  const stopRequested = shallowRef(false)
  const wasStopped = shallowRef(false)
  const nextCursor = shallowRef<string | null | undefined>(null)
  const hasLinks = computed(() => totalCount.value > 0)
  const links = computed(() => results.value)

  async function loadLinks() {
    loadingLinks.value = true
    totalCount.value = 0

    try {
      const { count } = await useAPI<LinkCountResponse>('/api/link/count', {
        query: { status: 'all' },
      })
      totalCount.value = count
      results.value = []
      nextCursor.value = null
      wasStopped.value = false
    }
    finally {
      loadingLinks.value = false
    }
  }

  async function startCheck(config: LinkCheckConfig): Promise<LinkCheckRunResult> {
    if (checking.value)
      return 'empty'

    if (!totalCount.value)
      await loadLinks()

    if (!totalCount.value)
      return 'empty'

    checking.value = true
    stopRequested.value = false
    wasStopped.value = false
    results.value = []
    nextCursor.value = null

    try {
      const seenSlugs = new Set<string>()
      while (!stopRequested.value) {
        const response: LinkCheckResponse = await useAPI<LinkCheckResponse>('/api/link/check', {
          method: 'POST',
          body: {
            cursor: nextCursor.value ?? undefined,
            limit: config.batchSize,
            timeout: config.timeout,
          },
        })
        for (const result of response.results) {
          if (seenSlugs.has(result.slug))
            continue
          seenSlugs.add(result.slug)
          results.value.push(result)
        }

        if (response.list_complete) {
          nextCursor.value = undefined
          totalCount.value = results.value.length
          break
        }
        if (!response.cursor)
          throw new Error('Incomplete link check response is missing a cursor')
        nextCursor.value = response.cursor
      }

      wasStopped.value = stopRequested.value
      return wasStopped.value ? 'stopped' : 'completed'
    }
    finally {
      checking.value = false
      stopRequested.value = false
    }
  }

  function stopCheck() {
    stopRequested.value = true
  }

  function clearResults() {
    results.value = []
    wasStopped.value = false
  }

  return {
    links,
    hasLinks,
    totalCount,
    results,
    loadingLinks,
    checking,
    wasStopped,
    loadLinks,
    startCheck,
    stopCheck,
    clearResults,
  }
}
