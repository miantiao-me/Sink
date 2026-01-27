import type { Link, LinkUpdateType } from '@/types'

export interface LinkUpdateEvent {
  link: Link
  type: LinkUpdateType
}

type LinkUpdateCallback = (event: LinkUpdateEvent) => void

export const useDashboardLinksStore = defineStore('dashboard-links', () => {
  const sortBy = ref<'newest' | 'oldest' | 'az' | 'za'>('az')

  const showLinkEditor = ref(false)
  const editingLink = ref<Record<string, unknown> | null>(null)

  const subscribers = new Set<LinkUpdateCallback>()

  function openLinkEditor(link?: Record<string, unknown>) {
    editingLink.value = link || null
    showLinkEditor.value = true
  }

  function closeLinkEditor() {
    showLinkEditor.value = false
    editingLink.value = null
  }

  function notifyLinkUpdate(link: Link, type: LinkUpdateType) {
    const event: LinkUpdateEvent = { link, type }
    subscribers.forEach(callback => callback(event))
  }

  function onLinkUpdate(callback: LinkUpdateCallback): () => void {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }

  return {
    sortBy,
    showLinkEditor,
    editingLink,
    openLinkEditor,
    closeLinkEditor,
    notifyLinkUpdate,
    onLinkUpdate,
  }
})
