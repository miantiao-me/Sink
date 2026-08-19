import type { CounterData } from '@/types'
import { ref } from 'vue'
import { useAPI } from '@/utils/api'

interface CountersResponse {
  data?: (CounterData & { id: string })[]
}

const defaultCounters: CounterData = Object.freeze({
  visits: 0,
  visitors: 0,
  referers: 0,
})

export function useLinkCounters() {
  const countersMap = ref<Record<string, CounterData>>({})
  const counterErrorIds = ref<Set<string>>(new Set())
  const pendingIds = new Set<string>()
  const requestVersions = new Map<string, number>()
  let requestVersion = 0

  async function fetchCounters(ids: string[]) {
    const requestIds = [...new Set(ids)].filter(id => !pendingIds.has(id))
    if (!requestIds.length)
      return

    const version = ++requestVersion
    for (const id of requestIds) {
      pendingIds.add(id)
      requestVersions.set(id, version)
    }
    counterErrorIds.value = new Set(
      [...counterErrorIds.value].filter(id => !requestIds.includes(id)),
    )

    try {
      const result = await useAPI<CountersResponse>('/api/stats/counters', {
        query: { id: requestIds.join(',') },
      })

      for (const id of requestIds) {
        if (requestVersions.get(id) === version)
          countersMap.value[id] = { ...defaultCounters }
      }

      for (const item of result.data ?? []) {
        if (requestVersions.get(item.id) !== version)
          continue
        countersMap.value[item.id] = {
          visits: item.visits,
          visitors: item.visitors,
          referers: item.referers,
        }
      }
    }
    catch (error) {
      const failedIds = requestIds.filter(id => requestVersions.get(id) === version)
      if (failedIds.length) {
        console.error('Failed to fetch counters:', error)
        counterErrorIds.value = new Set([...counterErrorIds.value, ...failedIds])
      }
    }
    finally {
      for (const id of requestIds) {
        if (requestVersions.get(id) === version) {
          pendingIds.delete(id)
          requestVersions.delete(id)
        }
      }
    }
  }

  function resetCounters() {
    countersMap.value = {}
    counterErrorIds.value = new Set()
    pendingIds.clear()
    requestVersions.clear()
  }

  return {
    countersMap,
    counterErrorIds,
    fetchCounters,
    resetCounters,
  }
}
