import type { Ref } from 'vue'
import type { LogEvent } from '../../shared/types/events'
import type { DashboardSlugFilters } from '../utils/dashboard-query'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { inject, onScopeDispose, shallowRef, toRef, watch } from 'vue'
import { appendPendingEvents, selectReplayEvents } from '../utils/realtime-log-queue'

const INITIAL_REPLAY_LIMIT = 20
const MAX_VISIBLE_LOGS = 100
const MAX_PENDING_LOGS = 100
const MAX_KNOWN_LOGS = 1000
const REPLAY_INTERVAL = 1000

interface RealtimeLogSources {
  timeName: Readonly<Ref<string>>
  timeRange: Readonly<Ref<{ startAt: number, endAt: number }>>
  filters: Readonly<Ref<DashboardSlugFilters>>
}

interface RealtimeLogRequest {
  signal: AbortSignal
  query: DashboardSlugFilters & {
    limit: number
    startAt: number
    endAt: number
  }
}

interface UseRealtimeLogsOptions {
  sources?: RealtimeLogSources
  isPaused?: Ref<boolean>
  visibility?: Readonly<Ref<DocumentVisibilityState>>
  loadEvents?: (request: RealtimeLogRequest) => Promise<readonly LogEvent[] | null | undefined>
  replayEvent?: (event: LogEvent) => void
}

export function useRealtimeLogs(options: UseRealtimeLogsOptions = {}) {
  const realtimeStore = options.sources ? undefined : useDashboardRealtimeStore()
  const sources = options.sources ?? {
    timeName: toRef(realtimeStore!, 'timeName'),
    timeRange: toRef(realtimeStore!, 'timeRange'),
    filters: toRef(realtimeStore!, 'filters'),
  }
  const isPaused = options.isPaused ?? inject(REALTIME_PAUSED_KEY, shallowRef(false))
  const visibility = options.visibility ?? useDocumentVisibility()
  const loadEvents = options.loadEvents ?? (request => useAPI<LogEvent[]>('/api/logs/events', {
    signal: request.signal,
    query: request.query,
  }))
  const replayEvent = options.replayEvent ?? useTrafficEventBus().emit

  const logs = shallowRef<LogEvent[]>([])
  const loading = shallowRef(false)
  const error = shallowRef(false)
  const retryKey = shallowRef(0)
  const hasSnapshot = shallowRef(false)
  const knownIds = new Set<string>()
  let knownIdQueue: string[] = []
  let pendingLogs: LogEvent[] = []
  let fetchController: AbortController | null = null
  let fetchRunning = false
  let fetchQueued = false
  let fetchVersion = 0
  let disposed = false

  const { pause, resume } = useIntervalFn(playNext, REPLAY_INTERVAL, { immediate: false })

  function playNext() {
    if (visibility.value !== 'visible' || isPaused.value) {
      pause()
      return
    }

    const event = pendingLogs.shift()
    if (!event) {
      pause()
      return
    }

    logs.value = [event, ...logs.value.filter(log => log.id !== event.id)].slice(0, MAX_VISIBLE_LOGS)
    replayEvent(event)

    if (!pendingLogs.length)
      pause()
  }

  function enqueueEvents(events: readonly LogEvent[]) {
    pendingLogs = appendPendingEvents(pendingLogs, events, MAX_PENDING_LOGS)
    if (!pendingLogs.length || visibility.value !== 'visible' || isPaused.value)
      return

    if (!logs.value.length)
      playNext()
    if (pendingLogs.length)
      resume()
  }

  function rememberEvents(events: readonly LogEvent[]) {
    for (const event of events) {
      if (knownIds.has(event.id))
        continue
      knownIds.add(event.id)
      knownIdQueue.push(event.id)
    }

    while (knownIdQueue.length > MAX_KNOWN_LOGS) {
      const id = knownIdQueue.shift()
      if (id)
        knownIds.delete(id)
    }
  }

  function resetReplay() {
    pause()
    logs.value = []
    pendingLogs = []
    hasSnapshot.value = false
    knownIds.clear()
    knownIdQueue = []
    fetchVersion++
    fetchController?.abort()
  }

  function resumeReplay(trimPending = false) {
    if (trimPending)
      pendingLogs = pendingLogs.slice(-INITIAL_REPLAY_LIMIT)
    if (visibility.value !== 'visible' || isPaused.value || !pendingLogs.length)
      return
    resume()
  }

  watch([
    sources.timeName,
    () => sources.filters.value.slug,
  ], resetReplay)

  watch(visibility, (state) => {
    if (state !== 'visible' || isPaused.value) {
      pause()
      return
    }
    resumeReplay(true)
  })

  watch(isPaused, (paused) => {
    if (paused) {
      pause()
      fetchVersion++
      fetchController?.abort()
      loading.value = false
      return
    }
    resumeReplay()
  })

  async function refresh() {
    if (isPaused.value || disposed)
      return

    if (fetchRunning) {
      fetchQueued = true
      return
    }

    if (sources.timeRange.value.startAt === 0)
      return

    fetchRunning = true
    try {
      for (;;) {
        if (disposed || isPaused.value)
          break

        fetchQueued = false
        const version = fetchVersion
        const controller = new AbortController()
        fetchController = controller
        loading.value = true
        error.value = false

        try {
          const { startAt, endAt } = sources.timeRange.value
          const data = await loadEvents({
            signal: controller.signal,
            query: {
              ...sources.filters.value,
              limit: 100,
              startAt,
              endAt,
            },
          })
          if (!controller.signal.aborted && version === fetchVersion) {
            const currentRange = sources.timeRange.value
            const nextLogs = (data ?? []).filter(event =>
              event.timestamp >= currentRange.startAt && event.timestamp <= currentRange.endAt,
            )
            const replayEvents = selectReplayEvents(
              nextLogs,
              hasSnapshot.value ? knownIds : undefined,
              INITIAL_REPLAY_LIMIT,
            )
            rememberEvents(nextLogs)
            hasSnapshot.value = true
            enqueueEvents(replayEvents)
          }
        }
        catch {
          if (!controller.signal.aborted && version === fetchVersion)
            error.value = true
        }
        finally {
          if (fetchController === controller)
            fetchController = null
          if (version === fetchVersion)
            loading.value = false
        }

        if (!fetchQueued)
          break
      }
    }
    finally {
      fetchRunning = false
    }
  }

  watch([
    sources.timeName,
    () => sources.timeRange.value.startAt,
    () => sources.timeRange.value.endAt,
    () => sources.filters.value.slug,
    isPaused,
    retryKey,
  ], () => {
    void refresh()
  }, { immediate: true })

  function retry() {
    retryKey.value++
  }

  function dispose() {
    disposed = true
    fetchQueued = false
    fetchVersion++
    fetchController?.abort()
    pause()
  }

  onScopeDispose(dispose)

  return {
    logs,
    loading,
    error,
    hasSnapshot,
    isPaused,
    refresh,
    retry,
  }
}
