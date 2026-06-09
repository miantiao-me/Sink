import type { Link, LinkSearchItem, LinkUpdateType } from '@/types'
import { defineStore } from '#imports'
import { ref } from 'vue'
import { useAPI } from '@/utils/api'

export const useDashboardLinksSearchStore = defineStore('dashboard-links-search', () => {
  const links = ref<LinkSearchItem[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  let loadPromise: Promise<LinkSearchItem[]> | null = null

  function isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return Boolean(parsedUrl.protocol)
    }
    catch {
      return false
    }
  }

  function withoutUrlQuery(url: string): string | undefined {
    const trimmedUrl = url.trim()
    if (!trimmedUrl || !isValidUrl(trimmedUrl))
      return undefined

    const hashIndex = trimmedUrl.indexOf('#')
    const queryIndex = trimmedUrl.indexOf('?')
    if (queryIndex === -1 || (hashIndex !== -1 && hashIndex < queryIndex))
      return trimmedUrl

    return `${trimmedUrl.slice(0, queryIndex)}${hashIndex === -1 ? '' : trimmedUrl.slice(hashIndex)}`
  }

  async function loadLinks(): Promise<LinkSearchItem[]> {
    if (loaded.value)
      return links.value

    if (loadPromise)
      return loadPromise

    loading.value = true
    const promise = useAPI<LinkSearchItem[]>('/api/link/search')
      .then((data) => {
        links.value = data
        loaded.value = true
        return data
      })
      .catch((error) => {
        console.error(error)
        return links.value
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })
    loadPromise = promise

    return promise
  }

  function syncLink(link: Link, type: LinkUpdateType) {
    if (type === 'delete') {
      links.value = links.value.filter(item => item.slug !== link.slug)
      return
    }

    const nextLink: LinkSearchItem = {
      slug: link.slug,
      url: withoutUrlQuery(link.url) ?? link.url,
      comment: link.comment,
    }
    const index = links.value.findIndex(item => item.slug === link.slug)
    if (index === -1) {
      links.value = [...links.value, nextLink]
      return
    }

    links.value = links.value.map(item => item.slug === link.slug ? nextLink : item)
  }

  function findDuplicateLink(url: string, currentSlug?: string): LinkSearchItem | undefined {
    const targetUrl = withoutUrlQuery(url)
    if (!targetUrl)
      return undefined

    return links.value.find((link) => {
      if (link.slug === currentSlug)
        return false

      return link.url === targetUrl
    })
  }

  return {
    links,
    loaded,
    loading,
    loadLinks,
    syncLink,
    findDuplicateLink,
  }
})
