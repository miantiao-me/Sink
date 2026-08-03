import type {
  LinkMigrationFailedItem,
  LinkMigrationMarker,
  LinkMigrationRunResult,
  LinkMigrationStatus,
} from '#shared/schemas/link-migration'
import { storeToRefs } from 'pinia'
import { defineStore } from '#imports'

interface LinkMigrationTotals {
  scanned: number
  inserted: number
  skipped: number
  expired: number
  failed: number
}

function createTotals(): LinkMigrationTotals {
  return {
    scanned: 0,
    inserted: 0,
    skipped: 0,
    expired: 0,
    failed: 0,
  }
}

const useLinkMigrationStore = defineStore('link-migration', () => {
  const completed = shallowRef(false)
  const checked = shallowRef(false)
  const running = shallowRef(false)
  const error = shallowRef<string | null>(null)
  const marker = shallowRef<LinkMigrationMarker | null>(null)
  const totals = ref<LinkMigrationTotals>(createTotals())
  const failedItems = ref<LinkMigrationFailedItem[]>([])

  let activeRun: Promise<boolean> | null = null

  function resetCurrentRun() {
    error.value = null
    totals.value = createTotals()
    failedItems.value = []
  }

  function addPage(result: LinkMigrationRunResult) {
    totals.value = {
      scanned: totals.value.scanned + result.scanned,
      inserted: totals.value.inserted + result.inserted,
      skipped: totals.value.skipped + result.skipped,
      expired: totals.value.expired + result.expired,
      failed: totals.value.failed + result.failed,
    }
    failedItems.value = [...failedItems.value, ...result.failedItems]
  }

  function setError(cause: unknown) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }

  async function fetchStatus(): Promise<LinkMigrationStatus | null> {
    try {
      const status = await useAPI<LinkMigrationStatus>('/api/link/migration/status')
      completed.value = status.completed
      marker.value = status.marker
      error.value = null
      return status
    }
    catch (cause) {
      setError(cause)
      return null
    }
    finally {
      checked.value = true
    }
  }

  async function runPages(force: boolean): Promise<boolean> {
    let cursor: string | undefined

    while (true) {
      const result = await useAPI<LinkMigrationRunResult>('/api/link/migration/run', {
        method: 'POST',
        body: {
          cursor,
          force,
        },
      })
      addPage(result)

      if (result.failed > 0) {
        const firstFailure = result.failedItems[0]
        error.value = firstFailure
          ? `${firstFailure.key}: ${firstFailure.reason}`
          : 'Link migration failed'
        return false
      }

      if (result.completed || result.list_complete) {
        if (result.completed) {
          completed.value = true
          await fetchStatus()
        }
        return result.completed
      }

      if (!result.cursor) {
        error.value = 'Link migration stopped before receiving the next cursor'
        return false
      }

      cursor = result.cursor
    }
  }

  function start(action: () => Promise<boolean>): Promise<boolean> {
    if (activeRun)
      return activeRun

    running.value = true
    const promise = action()
      .catch((cause) => {
        setError(cause)
        return false
      })
      .finally(() => {
        running.value = false
        checked.value = true
        activeRun = null
      })
    activeRun = promise
    return promise
  }

  function autoMigration(): Promise<boolean> {
    return start(async () => {
      resetCurrentRun()
      const status = await fetchStatus()
      if (!status)
        return false
      if (status.completed)
        return true
      return await runPages(false)
    })
  }

  function forceMigration(): Promise<boolean> {
    return start(async () => {
      resetCurrentRun()
      return await runPages(true)
    })
  }

  function refreshStatus(): Promise<boolean> {
    return start(async () => Boolean(await fetchStatus()))
  }

  return {
    completed,
    checked,
    running,
    error,
    marker,
    totals,
    failedItems,
    refreshStatus,
    autoMigration,
    forceMigration,
  }
})

export function useLinkMigration() {
  const store = useLinkMigrationStore()
  const state = storeToRefs(store)

  return {
    completed: readonly(state.completed),
    checked: readonly(state.checked),
    running: readonly(state.running),
    error: readonly(state.error),
    marker: readonly(state.marker),
    totals: readonly(state.totals),
    failedItems: readonly(state.failedItems),
    refreshStatus: store.refreshStatus,
    autoMigration: store.autoMigration,
    forceMigration: store.forceMigration,
  }
}
