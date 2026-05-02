import type { Link, LinkUpdateType } from '@/types'
import { defineStore } from '#imports'
import { createEventHook, tryOnScopeDispose } from '@vueuse/core'
import { ref } from 'vue'

export interface LinkUpdateEvent {
  link: Link
  type: LinkUpdateType
}

export const useDashboardLinksStore = defineStore('dashboard-links', () => {
  const sortBy = ref<'newest' | 'oldest' | 'az' | 'za'>('az')

  const showLinkEditor = ref(false)
  const editingLink = ref<Record<string, unknown> | null>(null)

  const linkUpdateHook = createEventHook<LinkUpdateEvent>()

  function openLinkEditor(link?: Record<string, unknown>) {
    editingLink.value = link || null
    showLinkEditor.value = true
  }

  function closeLinkEditor() {
    showLinkEditor.value = false
    editingLink.value = null
  }

  function notifyLinkUpdate(link: Link, type: LinkUpdateType) {
    linkUpdateHook.trigger({ link, type })
  }

  function onLinkUpdate(callback: (event: LinkUpdateEvent) => void) {
    const { off } = linkUpdateHook.on(callback)
    tryOnScopeDispose(off)
    return off
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
