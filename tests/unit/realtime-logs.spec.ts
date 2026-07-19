import type { LogEvent } from '../../shared/types/events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useRealtimeLogs } from '../../app/composables/useRealtimeLogs'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

interface LoadRequest {
  signal: AbortSignal
  query: {
    slug?: string
    limit: number
    startAt: number
    endAt: number
  }
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function event(id: string | number, timestamp = 50): LogEvent {
  return {
    id: String(id),
    slug: `slug-${id}`,
    timestamp,
  }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

function createHarness(loadEvents: (request: LoadRequest) => Promise<readonly LogEvent[] | null | undefined>) {
  const scope = effectScope()
  const timeName = ref('last-1h')
  const timeRange = ref({ startAt: 1, endAt: 100 })
  const filters = ref({})
  const isPaused = ref(false)
  const visibility = ref<DocumentVisibilityState>('visible')
  const replayed: LogEvent[] = []
  const state = scope.run(() => useRealtimeLogs({
    sources: { timeName, timeRange, filters },
    isPaused,
    visibility,
    loadEvents,
    replayEvent: value => replayed.push(value),
  }))!

  return {
    scope,
    state,
    timeName,
    timeRange,
    filters,
    isPaused,
    visibility,
    replayed,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useRealtimeLogs', () => {
  it('replays the initial snapshot in chronological order', async () => {
    vi.useFakeTimers()
    const harness = createHarness(async () => [event(5), event(4), event(3), event(2), event(1)])

    await flushPromises()
    expect(harness.replayed.map(item => item.id)).toEqual(['1'])

    await vi.advanceTimersByTimeAsync(4000)
    expect(harness.replayed.map(item => item.id)).toEqual(['1', '2', '3', '4', '5'])
    expect(harness.state.logs.value.map(item => item.id)).toEqual(['5', '4', '3', '2', '1'])
    harness.scope.stop()
  })

  it('deduplicates snapshots and enforces initial, known, and visible limits', async () => {
    vi.useFakeTimers()
    let snapshot = [event('a')]
    const harness = createHarness(async () => snapshot)

    await flushPromises()
    snapshot = [event('b'), event('a')]
    await harness.state.refresh()
    await vi.advanceTimersByTimeAsync(1000)
    await harness.state.refresh()
    await vi.advanceTimersByTimeAsync(1000)
    expect(harness.replayed.map(item => item.id)).toEqual(['a', 'b'])

    harness.filters.value = { slug: 'limit-test' }
    snapshot = Array.from({ length: 1001 }, (_, index) => event(1001 - index))
    await nextTick()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(19_000)
    expect(harness.replayed.slice(-20).map(item => item.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => String(982 + index)),
    )

    snapshot = [event(1001)]
    await harness.state.refresh()
    await vi.advanceTimersByTimeAsync(1000)
    expect(harness.replayed.filter(item => item.id === '1001')).toHaveLength(2)

    snapshot = Array.from({ length: 150 }, (_, index) => event(2000 - index))
    await harness.state.refresh()
    await vi.advanceTimersByTimeAsync(100_000)
    expect(harness.state.logs.value).toHaveLength(100)
    harness.scope.stop()
  })

  it('does not abort a running request when the range changes and coalesces one refresh with the latest range', async () => {
    vi.useFakeTimers()
    const first = deferred<LogEvent[]>()
    const second = deferred<LogEvent[]>()
    const requests: LoadRequest[] = []
    const loadEvents = vi.fn((request: LoadRequest) => {
      requests.push(request)
      return requests.length === 1 ? first.promise : second.promise
    })
    const harness = createHarness(loadEvents)

    harness.timeRange.value = { startAt: 20, endAt: 80 }
    await nextTick()
    expect(requests[0]?.signal.aborted).toBe(false)
    expect(loadEvents).toHaveBeenCalledTimes(1)

    harness.timeRange.value = { startAt: 30, endAt: 70 }
    await nextTick()
    expect(requests[0]?.signal.aborted).toBe(false)
    expect(loadEvents).toHaveBeenCalledTimes(1)

    first.resolve([event('outside', 20), event('inside', 50)])
    await flushPromises()
    expect(loadEvents).toHaveBeenCalledTimes(2)
    expect(requests[1]?.query).toMatchObject({ startAt: 30, endAt: 70 })
    expect(harness.replayed.map(item => item.id)).toEqual(['inside'])

    second.resolve([])
    await flushPromises()
    expect(loadEvents).toHaveBeenCalledTimes(2)
    harness.scope.stop()
  })

  it.each(['slug', 'timeName'] as const)('aborts and discards a stale response when %s changes before running a new request', async (source) => {
    vi.useFakeTimers()
    const first = deferred<LogEvent[]>()
    const second = deferred<LogEvent[]>()
    const requests: LoadRequest[] = []
    const loadEvents = vi.fn((request: LoadRequest) => {
      requests.push(request)
      return requests.length === 1 ? first.promise : second.promise
    })
    const harness = createHarness(loadEvents)

    if (source === 'slug')
      harness.filters.value = { slug: 'new-slug' }
    else
      harness.timeName.value = 'last-24h'
    await nextTick()
    expect(requests[0]?.signal.aborted).toBe(true)

    first.resolve([event('stale')])
    await flushPromises()
    expect(loadEvents).toHaveBeenCalledTimes(2)

    second.resolve([event('fresh')])
    await flushPromises()
    expect(harness.replayed.map(item => item.id)).toEqual(['fresh'])
    harness.scope.stop()
  })

  it('runs one request at a time and coalesces concurrent refreshes', async () => {
    const first = deferred<LogEvent[]>()
    const second = deferred<LogEvent[]>()
    const loadEvents = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const harness = createHarness(loadEvents)

    void harness.state.refresh()
    void harness.state.refresh()
    expect(loadEvents).toHaveBeenCalledTimes(1)

    first.resolve([event(1)])
    await flushPromises()
    expect(loadEvents).toHaveBeenCalledTimes(2)

    second.resolve([event(2), event(1)])
    await flushPromises()
    expect(loadEvents).toHaveBeenCalledTimes(2)
    harness.scope.stop()
  })

  it('pauses replay while hidden, then resumes with the latest 20 pending events', async () => {
    vi.useFakeTimers()
    let snapshot = [event(1)]
    const harness = createHarness(async () => snapshot)

    await flushPromises()
    harness.visibility.value = 'hidden'
    await nextTick()
    snapshot = Array.from({ length: 30 }, (_, index) => event(30 - index))
    await harness.state.refresh()
    await vi.advanceTimersByTimeAsync(5000)
    expect(harness.replayed.map(item => item.id)).toEqual(['1'])

    harness.visibility.value = 'visible'
    await nextTick()
    await vi.advanceTimersByTimeAsync(1000)
    expect(harness.replayed.map(item => item.id)).toEqual(['1', '11'])
    harness.scope.stop()
  })

  it('resumes all pending replay events after pausing without a visibility change', async () => {
    vi.useFakeTimers()
    let snapshot = [event(1)]
    let pendingRequest: Deferred<LogEvent[]> | undefined
    const requests: LoadRequest[] = []
    const harness = createHarness(async (request) => {
      requests.push(request)
      if (pendingRequest)
        return pendingRequest.promise
      return snapshot
    })

    await flushPromises()
    snapshot = Array.from({ length: 30 }, (_, index) => event(30 - index))
    await harness.state.refresh()
    harness.isPaused.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)
    expect(harness.replayed.map(item => item.id)).toEqual(['1'])

    harness.isPaused.value = false
    await nextTick()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(harness.replayed.map(item => item.id)).toEqual(['1', '2'])

    pendingRequest = deferred<LogEvent[]>()
    void harness.state.refresh()
    await flushPromises()
    harness.isPaused.value = true
    await nextTick()
    expect(requests.at(-1)?.signal.aborted).toBe(true)
    pendingRequest.resolve([event(31)])
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    expect(harness.replayed.map(item => item.id)).toEqual(['1', '2'])
    harness.scope.stop()
  })

  it('aborts requests and stops replay when its scope is disposed', async () => {
    vi.useFakeTimers()
    const response = deferred<LogEvent[]>()
    let signal: AbortSignal | undefined
    const harness = createHarness((request) => {
      signal = request.signal
      return response.promise
    })

    harness.scope.stop()
    expect(signal?.aborted).toBe(true)
    response.resolve([event(1)])
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    expect(harness.replayed).toEqual([])
  })
})
