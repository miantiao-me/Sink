import { createPinia, defineStore, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { useDashboardLinksSearchStore } from '../../app/composables/useDashboardLinksSearchStore'

const { useAPIMock } = vi.hoisted(() => ({
  useAPIMock: vi.fn(async () => []),
}))

vi.mock('#imports', () => ({ defineStore }))
vi.mock('@/utils/api', () => ({ useAPI: useAPIMock }))

describe('dashboard links search store', () => {
  const linksStore = reactive({
    status: 'active',
    tag: undefined as string | undefined,
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    linksStore.tag = undefined
    useAPIMock.mockClear()
    vi.stubGlobal('useDashboardLinksStore', () => linksStore)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('omits an unselected tag and includes a selected tag', async () => {
    const store = useDashboardLinksSearchStore()

    await store.searchLinks('needle')
    expect(useAPIMock).toHaveBeenLastCalledWith('/api/link/search', {
      query: {
        q: 'needle',
        limit: 20,
        status: 'active',
      },
    })

    linksStore.tag = 'product'
    await store.searchLinks('needle')
    expect(useAPIMock).toHaveBeenLastCalledWith('/api/link/search', {
      query: {
        q: 'needle',
        limit: 20,
        status: 'active',
        tag: 'product',
      },
    })
  })

  it('does not request an empty query', async () => {
    const store = useDashboardLinksSearchStore()

    await store.searchLinks('   ')

    expect(useAPIMock).not.toHaveBeenCalled()
    expect(store.requestStatus).toBe('idle')
  })

  it('distinguishes idle, loading, successful empty, and error states', async () => {
    const store = useDashboardLinksSearchStore()
    let resolveSearch: ((value: []) => void) | undefined
    useAPIMock.mockImplementationOnce(() => new Promise<[]>((resolve) => {
      resolveSearch = resolve
    }))

    const pendingSearch = store.searchLinks('needle')
    expect(store.requestStatus).toBe('loading')
    expect(store.loading).toBe(true)

    resolveSearch?.([])
    await pendingSearch
    expect(store.requestStatus).toBe('success')
    expect(store.loading).toBe(false)
    expect(store.links).toEqual([])

    useAPIMock.mockRejectedValueOnce(new Error('Unavailable'))
    await store.searchLinks('other')
    expect(store.requestStatus).toBe('error')
    expect(store.error).toBe('Unavailable')

    store.invalidateSearch()
    expect(store.requestStatus).toBe('idle')
    expect(store.error).toBeNull()
  })
})
