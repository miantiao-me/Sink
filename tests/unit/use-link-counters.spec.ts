import type { CounterData } from '../../app/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLinkCounters } from '../../app/composables/useLinkCounters'

const { useAPIMock } = vi.hoisted(() => ({
  useAPIMock: vi.fn(),
}))

vi.mock('@/utils/api', () => ({ useAPI: useAPIMock }))

interface CountersResponse {
  data: (CounterData & { id: string })[]
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('useLinkCounters', () => {
  beforeEach(() => {
    useAPIMock.mockReset()
  })

  it('does not request the same pending ID twice', async () => {
    const request = createDeferred<CountersResponse>()
    useAPIMock.mockReturnValue(request.promise)
    const { fetchCounters } = useLinkCounters()

    const firstFetch = fetchCounters(['first', 'first'])
    await fetchCounters(['first'])

    expect(useAPIMock).toHaveBeenCalledTimes(1)
    expect(useAPIMock).toHaveBeenCalledWith('/api/stats/counters', {
      query: { id: 'first' },
    })

    request.resolve({ data: [] })
    await firstFetch
  })

  it('does not write a stale response after reset', async () => {
    const request = createDeferred<CountersResponse>()
    useAPIMock.mockReturnValue(request.promise)
    const { countersMap, fetchCounters, resetCounters } = useLinkCounters()

    const fetching = fetchCounters(['first'])
    resetCounters()
    request.resolve({
      data: [{ id: 'first', visits: 3, visitors: 2, referers: 1 }],
    })
    await fetching

    expect(countersMap.value).toEqual({})
  })

  it('writes zero counters when the response has no matching data', async () => {
    useAPIMock.mockResolvedValue({ data: [] })
    const { countersMap, fetchCounters } = useLinkCounters()

    await fetchCounters(['first'])

    expect(countersMap.value.first).toEqual({
      visits: 0,
      visitors: 0,
      referers: 0,
    })
  })

  it('marks failed IDs and clears the failure when retrying', async () => {
    const error = new Error('Request failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    useAPIMock
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        data: [{ id: 'first', visits: 3, visitors: 2, referers: 1 }],
      })
    const { countersMap, counterErrorIds, fetchCounters } = useLinkCounters()

    await fetchCounters(['first'])
    expect(counterErrorIds.value.has('first')).toBe(true)
    expect(consoleError).toHaveBeenCalledWith('Failed to fetch counters:', error)

    await fetchCounters(['first'])
    expect(counterErrorIds.value.has('first')).toBe(false)
    expect(countersMap.value.first).toEqual({ visits: 3, visitors: 2, referers: 1 })

    consoleError.mockRestore()
  })
})
