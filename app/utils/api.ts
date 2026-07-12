import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import { defu } from 'defu'
import { useAuthToken } from '@/composables/useAuthToken'

type APIOptions = Omit<NitroFetchOptions<NitroFetchRequest>, 'headers'> & {
  headers?: Record<string, string>
}

export function useAPI<T = unknown>(api: string, options?: APIOptions): Promise<T> {
  const { getToken, removeToken } = useAuthToken()

  const mergedOptions = defu(options || {}, {
    headers: {
      'Authorization': `Bearer ${getToken() || ''}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  }) as NitroFetchOptions<NitroFetchRequest>

  return $fetch<T>(api, mergedOptions).catch((error) => {
    if (error?.status === 401) {
      removeToken()
      if (import.meta.client && window.location.pathname !== '/dashboard/login')
        window.location.assign('/dashboard/login')
    }
    return Promise.reject(error)
  }) as Promise<T>
}
