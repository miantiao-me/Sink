import type { Link, LinkUpdateType } from '@/types'
import type { DashboardLinkStatus } from '@/types/dashboard-links'
import type { DashboardLinkSort, LinksQueryState } from '@/utils/dashboard-query'
import { createEventHook, tryOnScopeDispose } from '@vueuse/core'
import { ref } from 'vue'
import { defineStore } from '#imports'

export interface LinkUpdateEvent {
  link: Link
  type: LinkUpdateType
}

export const useDashboardLinksStore = defineStore('dashboard-links', () => {
  const sortBy = ref<DashboardLinkSort>('newest')
  const status = ref<DashboardLinkStatus>('active')
  const tag = ref<string>()

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

  function applyRouteState(state: LinksQueryState) {
    sortBy.value = state.sort
    status.value = state.status
    tag.value = state.tag
  }

  return {
    sortBy,
    status,
    tag,
    showLinkEditor,
    editingLink,
    openLinkEditor,
    closeLinkEditor,
    notifyLinkUpdate,
    onLinkUpdate,
    applyRouteState,
  }
})
