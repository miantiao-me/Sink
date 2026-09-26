import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
})

describe('fetchPublicConfig', () => {
  it('dedupes concurrent calls and caches the resolved config', async () => {
    const fetchMock = vi.fn(async () => ({ homeRedirect: true }))
    vi.stubGlobal('$fetch', fetchMock)
    const { fetchPublicConfig } = await import('../../app/utils/public-config')

    const first = fetchPublicConfig()
    const second = fetchPublicConfig()
    expect(second).toBe(first)
    await expect(first).resolves.toEqual({ homeRedirect: true })

    await fetchPublicConfig()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/_config')
  })

  it('allows retrying after a failed fetch', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ homeRedirect: false })
    vi.stubGlobal('$fetch', fetchMock)
    const { fetchPublicConfig } = await import('../../app/utils/public-config')

    await expect(fetchPublicConfig()).rejects.toThrow('network')
    await expect(fetchPublicConfig()).resolves.toEqual({ homeRedirect: false })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('resolves linkProxyEnabled through isLinkProxyEnabled', async () => {
    vi.stubGlobal('$fetch', vi.fn(async () => ({ homeRedirect: false, linkProxyEnabled: true })))
    const { fetchPublicConfig, isLinkProxyEnabled } = await import('../../app/utils/public-config')

    expect(isLinkProxyEnabled(await fetchPublicConfig())).toBe(true)
  })
})

describe('isLinkProxyEnabled', () => {
  it('stays disabled until the backend explicitly enables it', async () => {
    const { isLinkProxyEnabled } = await import('../../app/utils/public-config')

    expect(isLinkProxyEnabled(undefined)).toBe(false)
    expect(isLinkProxyEnabled({ homeRedirect: false })).toBe(false)
    expect(isLinkProxyEnabled({ homeRedirect: false, linkProxyEnabled: false })).toBe(false)
    expect(isLinkProxyEnabled({ homeRedirect: false, linkProxyEnabled: true })).toBe(true)
  })
})
