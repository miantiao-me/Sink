import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import { navigateTo } from '#imports'
import { defu } from 'defu'
import { useAuthToken } from '@/composables/useAuthToken'

type APIOptions = Omit<NitroFetchOptions<NitroFetchRequest>, 'headers'> & {
  headers?: Record<string, string>
}

export function useAPI<T = unknown>(api: string, options?: APIOptions): Promise<T> {
  const { getToken, removeToken } = useAuthToken()

  const mergedOptions = defu(options || {}, {
    headers: {
      Authorization: `Bearer ${getToken() || ''}`,
    },
  }) as NitroFetchOptions<NitroFetchRequest>

  return $fetch<T>(api, mergedOptions).catch((error) => {
    if (error?.status === 401) {
      removeToken()
      navigateTo('/dashboard/login')
    }
    return Promise.reject(error)
  }) as Promise<T>
}
