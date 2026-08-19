<script setup lang="ts">
import type { DashboardLinkSearchItem } from '@/types/dashboard-links'
import { Link as LinkIcon, LoaderCircle, SearchIcon } from '@lucide/vue'
import { createReusableTemplate, useDebounceFn, useMagicKeys, useMediaQuery, useWindowSize } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { ListboxFilter } from 'reka-ui'

defineOptions({
  inheritAttrs: false,
})
const [TriggerTemplate, TriggerComponent] = createReusableTemplate()
const [SearchTemplate, SearchComponent] = createReusableTemplate()

const isDesktop = useMediaQuery('(min-width: 640px)')
const { height: visualViewportHeight } = useWindowSize({ type: 'visual' })

const router = useRouter()
const linksStore = useDashboardLinksStore()
const linksSearchStore = useDashboardLinksSearchStore()
const { error, links, requestStatus } = storeToRefs(linksSearchStore)

const isOpen = shallowRef(false)
const searchTerm = shallowRef('')
const hasSearchActivity = computed(() =>
  searchTerm.value.trim().length > 0 || requestStatus.value !== 'idle',
)
const drawerStyle = computed(() => {
  const viewportHeight = visualViewportHeight.value
  if (!hasSearchActivity.value || !Number.isFinite(viewportHeight) || viewportHeight <= 0)
    return

  return { height: `${Math.min(640, viewportHeight * 0.8)}px` }
})

const search = useDebounceFn((query: string) => {
  if (isOpen.value && searchTerm.value.trim() === query.trim())
    void linksSearchStore.searchLinks(query)
}, 300)

const { Meta_K, Ctrl_K } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey))
      e.preventDefault()
  },
})

function sanitizeSlotAttrs(attrs?: Record<string, unknown>) {
  if (!attrs)
    return {}

  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => !key.startsWith('$')),
  ) as Record<string, unknown>
}

watch([Meta_K, Ctrl_K], (v) => {
  if (v[0] || v[1])
    isOpen.value = true
})

watch(isOpen, () => {
  searchTerm.value = ''
  linksSearchStore.invalidateSearch()
})

function selectLink(link: DashboardLinkSearchItem | undefined) {
  if (!link)
    return
  isOpen.value = false
  router.push(getDashboardLinkDetailLocation(link.slug))
}

function visibleTags(link: DashboardLinkSearchItem) {
  const normalizedQuery = searchTerm.value.trim().toLowerCase()
  return [...(link.tags ?? [])]
    .sort((a, b) => Number(b.includes(normalizedQuery)) - Number(a.includes(normalizedQuery)))
    .slice(0, 3)
}

function hiddenTagCount(link: DashboardLinkSearchItem) {
  return Math.max(0, (link.tags?.length ?? 0) - 3)
}

watch([searchTerm, () => linksStore.status, () => linksStore.tag], ([query]) => {
  linksSearchStore.invalidateSearch(query)
  if (!isOpen.value || !query.trim())
    return

  void search(query)
})
</script>

<template>
  <TriggerTemplate v-slot="attrs">
    <Button
      v-bind="sanitizeSlotAttrs(attrs)"
      data-link-search-trigger
      variant="outline"
      class="
        min-w-0 flex-1 justify-start text-muted-foreground
        sm:w-32 sm:flex-none
        md:w-48
      "
    >
      <SearchIcon class="size-4 shrink-0" aria-hidden="true" />
      <span
        class="
          hidden min-w-0 flex-1 truncate text-left
          md:inline-flex
        "
      >{{ $t('links.search_placeholder') }}</span>
      <span
        class="
          inline-flex min-w-0 flex-1 truncate text-left
          md:hidden
        "
      >{{ $t('common.search') }}</span>
      <Kbd
        class="
          ml-auto hidden
          sm:flex
        "
      >
        <span>⌘</span>K
      </Kbd>
    </Button>
  </TriggerTemplate>
  <SearchTemplate>
    <Command
      class="
        h-full min-h-0 flex-1
        sm:h-auto
      "
    >
      <div data-slot="command-input-wrapper" class="shrink-0 p-1">
        <InputGroup>
          <ListboxFilter
            v-model="searchTerm"
            data-slot="command-input"
            :auto-focus="isDesktop"
            :aria-label="$t('links.search_placeholder')"
            :placeholder="$t('links.search_placeholder')"
            autocomplete="off"
            class="
              w-full text-sm outline-hidden
              disabled:cursor-not-allowed disabled:opacity-50
            "
          />
          <InputGroupAddon>
            <SearchIcon class="size-4 shrink-0 opacity-50" aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </div>
      <CommandList
        v-if="requestStatus !== 'idle'"
        class="
          max-h-none min-h-0 flex-1
          sm:max-h-[300px] sm:flex-none
          *:[[role=presentation]]:h-full *:[[role=presentation]]:min-h-0
        "
      >
        <div
          v-if="requestStatus === 'loading'"
          role="status"
          aria-live="polite"
          class="
            flex min-h-full items-center justify-center gap-2 p-6 text-center
            text-sm text-muted-foreground
            sm:min-h-32
          "
        >
          <LoaderCircle
            class="
              size-4 shrink-0
              motion-safe:animate-spin
            "
            aria-hidden="true"
          />
          <span>{{ $t('links.search_loading') }}</span>
        </div>
        <div
          v-else-if="requestStatus === 'error'"
          role="alert"
          class="
            flex min-h-full flex-col items-center justify-center p-6 text-center
            text-sm text-destructive
            sm:min-h-32
          "
        >
          <p class="font-medium">
            {{ $t('links.search_failed') }}
          </p>
          <p class="mt-1 text-xs wrap-break-word">
            {{ error }}
          </p>
        </div>
        <div
          v-else-if="requestStatus === 'success' && links.length === 0"
          role="status"
          class="
            flex min-h-full items-center justify-center p-6 text-center text-sm
            text-muted-foreground
            sm:min-h-32
          "
        >
          {{ $t('links.no_results') }}
        </div>
        <CommandGroup
          v-else-if="requestStatus === 'success' && links.length"
          :heading="$t('links.group_title')"
        >
          <CommandItem
            v-for="link in links" :key="link.slug"
            :value="link" @select="selectLink(link)"
          >
            <LinkIcon
              class="mt-0.5 size-4 shrink-0 self-start text-muted-foreground"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1 space-y-1 text-left">
              <div class="flex min-w-0 items-baseline gap-2">
                <div class="min-w-0 flex-1 truncate text-sm font-medium">
                  {{ link.slug }}
                </div>
                <div
                  v-if="link.comment"
                  class="max-w-32 shrink truncate text-xs text-muted-foreground"
                >
                  {{ link.comment }}
                </div>
              </div>
              <div class="truncate text-xs text-muted-foreground">
                {{ link.url }}
              </div>
              <div v-if="link.tags?.length" class="flex min-w-0 flex-wrap gap-1">
                <Badge
                  v-for="tag in visibleTags(link)"
                  :key="tag"
                  variant="outline"
                  class="max-w-32 truncate"
                >
                  {{ tag }}
                </Badge>
                <Badge
                  v-if="hiddenTagCount(link)"
                  variant="outline"
                  class="shrink-0 text-muted-foreground"
                >
                  +{{ hiddenTagCount(link) }}
                </Badge>
              </div>
            </div>
            <CommandShortcut
              class="
                hidden
                sm:block
              "
              aria-hidden="true"
            >
              ↵
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </SearchTemplate>
  <Dialog v-if="isDesktop" v-model:open="isOpen">
    <DialogTrigger as-child>
      <TriggerComponent />
    </DialogTrigger>
    <DialogContent class="overflow-hidden p-0" :show-close-button="false">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ $t('links.search_placeholder') }}</DialogTitle>
      </DialogHeader>
      <SearchComponent />
    </DialogContent>
  </Dialog>
  <Drawer v-else v-model:open="isOpen">
    <DrawerTrigger as-child>
      <TriggerComponent />
    </DrawerTrigger>
    <DrawerContent
      class="
        h-auto max-h-dvh min-h-32 overscroll-contain
        pb-[calc(1rem+env(safe-area-inset-bottom))]
      "
      :style="drawerStyle"
    >
      <DrawerHeader class="sr-only">
        <DrawerTitle>{{ $t('links.search_placeholder') }}</DrawerTitle>
      </DrawerHeader>
      <SearchComponent />
    </DrawerContent>
  </Drawer>
</template>
