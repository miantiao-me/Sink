import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import { defu } from 'defu'

type APIOptions = Omit<NitroFetchOptions<NitroFetchRequest>, 'headers'> & {
  headers?: Record<string, string>
}

export function useAPI<T = unknown>(api: string, options?: APIOptions): Promise<T> {
  const mergedOptions = defu(options || {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('SinkSiteToken') || ''}`,
    },
  }) as NitroFetchOptions<NitroFetchRequest>

  return $fetch<T>(api, mergedOptions).catch((error) => {
    if (error?.status === 401) {
      localStorage.removeItem('SinkSiteToken')
      navigateTo('/dashboard/login')
    }
    return Promise.reject(error)
  }) as Promise<T>
}
