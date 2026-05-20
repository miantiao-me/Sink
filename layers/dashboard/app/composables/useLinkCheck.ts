import type { LinkCheckConfig, LinkCheckResponse, LinkCheckResult, LinkCheckTarget } from '@/types'
import { toErrorMessage } from '#shared/utils/error'
import { ref } from 'vue'
import { useAPI } from '@/utils/api'

type LinkCheckRunResult = 'completed' | 'empty' | 'stopped'

export function useLinkCheck() {
  const links = ref<LinkCheckTarget[]>([])
  const results = ref<LinkCheckResult[]>([])
  const loadingLinks = ref(false)
  const checking = ref(false)
  const stopRequested = ref(false)
  const wasStopped = ref(false)

  async function loadLinks() {
    loadingLinks.value = true
    try {
      links.value = await useAPI<LinkCheckTarget[]>('/api/link/search')
      results.value = []
      wasStopped.value = false
    }
    finally {
      loadingLinks.value = false
    }
  }

  function buildFailedResults(batch: LinkCheckTarget[], error: unknown): LinkCheckResult[] {
    const checkedAt = new Date().toISOString()
    const message = toErrorMessage(error)

    return batch.map(link => ({
      ...link,
      status: 0,
      ok: false,
      duration: 0,
      checkedAt,
      error: message,
    }))
  }

  async function startCheck(config: LinkCheckConfig): Promise<LinkCheckRunResult> {
    if (checking.value)
      return 'empty'

    if (!links.value.length)
      await loadLinks()

    if (!links.value.length)
      return 'empty'

    checking.value = true
    stopRequested.value = false
    wasStopped.value = false
    results.value = []

    try {
      for (let index = 0; index < links.value.length; index += config.batchSize) {
        if (stopRequested.value)
          break

        const batch = links.value.slice(index, index + config.batchSize)
        try {
          const response = await useAPI<LinkCheckResponse>('/api/link/check', {
            method: 'POST',
            body: {
              links: batch,
              timeout: config.timeout,
            },
          })
          results.value.push(...response.results)
        }
        catch (error) {
          console.error(error)
          results.value.push(...buildFailedResults(batch, error))
        }
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
