<script setup lang="ts">
import type { DashboardLinkSearchItem } from '@/types/dashboard-links'
import type { DashboardSlugFilters } from '@/utils/dashboard-query'
import { Check, ChevronsUpDown, LoaderCircle, SearchIcon } from '@lucide/vue'
import { createReusableTemplate, useMediaQuery, useWindowSize, watchDebounced } from '@vueuse/core'
import { ListboxFilter } from 'reka-ui'
import { VList } from 'virtua/vue'

type FilterLink = Pick<DashboardLinkSearchItem, 'slug'>

const props = withDefaults(defineProps<{
  filters?: DashboardSlugFilters
  debounce?: number
  ariaLabel?: string
  ariaLabelledby?: string
}>(), {
  debounce: 500,
})

const emit = defineEmits<{
  change: [key: string, value: string]
}>()

const [TriggerTemplate, TriggerComponent] = createReusableTemplate()
const [FilterTemplate, FilterComponent] = createReusableTemplate()

const isDesktop = useMediaQuery('(min-width: 640px)')
const { height: visualViewportHeight } = useWindowSize({ type: 'visual' })

const links = ref<FilterLink[]>([])
const isOpen = shallowRef(false)
const isLoading = shallowRef(false)
const hasError = shallowRef(false)
const selectedLinks = ref<string[]>(props.filters?.slug?.split(',').filter(Boolean) ?? [])
const searchTerm = shallowRef('')
const hasSearchActivity = computed(() =>
  searchTerm.value.trim().length > 0
  || isLoading.value
  || hasError.value
  || links.value.length > 0,
)
const drawerStyle = computed(() => {
  const viewportHeight = visualViewportHeight.value
  if (!hasSearchActivity.value || !Number.isFinite(viewportHeight) || viewportHeight <= 0)
    return

  return { height: `${Math.min(640, viewportHeight * 0.8)}px` }
})
let requestController: AbortController | null = null
let requestGeneration = 0

watch(() => props.filters?.slug, (newSlug) => {
  const newValue = newSlug?.split(',').filter(Boolean) ?? []
  if (JSON.stringify(newValue) !== JSON.stringify(selectedLinks.value)) {
    selectedLinks.value = newValue
  }
})

watch(isOpen, (open) => {
  if (!open)
    searchTerm.value = ''
})

function cancelSearch() {
  requestGeneration++
  requestController?.abort()
  requestController = null
  isLoading.value = false
}

async function getLinks(query: string) {
  const normalizedQuery = query.trim()
  if (!normalizedQuery)
    return

  requestController?.abort()
  const controller = new AbortController()
  requestController = controller
  const generation = ++requestGeneration
  isLoading.value = true
  hasError.value = false

  try {
    const data = await useAPI<FilterLink[]>('/api/link/search', {
      signal: controller.signal,
      query: {
        q: normalizedQuery,
        limit: 50,
      },
    })
    if (!controller.signal.aborted && generation === requestGeneration)
      links.value = data
  }
  catch {
    if (!controller.signal.aborted && generation === requestGeneration) {
      links.value = []
      hasError.value = true
    }
  }
  finally {
    if (requestController === controller && generation === requestGeneration) {
      requestController = null
      isLoading.value = false
    }
  }
}

watch(searchTerm, () => {
  cancelSearch()
  links.value = []
  hasError.value = false
  isLoading.value = Boolean(searchTerm.value.trim())
})

watchDebounced(searchTerm, (query) => {
  const normalizedQuery = query.trim()
  if (normalizedQuery)
    void getLinks(normalizedQuery)
}, { debounce: 300 })

function retrySearch() {
  void getLinks(searchTerm.value)
}

function clearSelectedLinks() {
  selectedLinks.value = []
}

onBeforeUnmount(() => requestController?.abort())

function emitSelectedLinks(value: string[]) {
  emit('change', 'slug', value.join(','))
}

if (props.debounce === 0) {
  watch(selectedLinks, emitSelectedLinks)
}
else {
  watchDebounced(selectedLinks, emitSelectedLinks, {
    debounce: props.debounce,
    maxWait: props.debounce * 2,
  })
}
</script>

<template>
  <TriggerTemplate>
    <Button
      variant="outline"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-label="ariaLabelledby ? undefined : (ariaLabel ?? $t('dashboard.realtime.filter_label'))"
      :aria-labelledby="ariaLabelledby"
      class="
        flex w-full justify-between
        sm:w-48
      "
    >
      <div
        class="min-w-0 flex-1 truncate text-left" :class="selectedLinks.length ? `
          text-foreground
        ` : `text-muted-foreground`"
      >
        {{ selectedLinks.length ? selectedLinks.join(', ') : $t('dashboard.filter_placeholder') }}
      </div>
      <ChevronsUpDown aria-hidden="true" class="ml-2 size-4 shrink-0 opacity-50" />
    </Button>
  </TriggerTemplate>
  <FilterTemplate>
    <Command
      v-model="selectedLinks"
      :aria-busy="isLoading"
      class="
        h-full min-h-0 flex-1
        sm:h-auto
      "
      multiple
    >
      <div data-slot="command-input-wrapper" class="shrink-0 p-1">
        <InputGroup>
          <ListboxFilter
            v-model="searchTerm"
            data-slot="command-input"
            :auto-focus="isDesktop"
            :aria-label="$t('dashboard.realtime.filter_search_label')"
            :placeholder="$t('dashboard.filter_placeholder')"
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
      <div
        v-if="selectedLinks.length"
        class="flex min-w-0 shrink-0 items-center gap-2 px-3 py-1"
      >
        <p
          class="
            flex min-w-0 flex-1 items-center gap-1 text-xs text-muted-foreground
          "
        >
          <span class="shrink-0">
            {{ $t('dashboard.selected_count', { count: selectedLinks.length }) }}
          </span>
          <span aria-hidden="true">·</span>
          <span class="min-w-0 truncate">{{ selectedLinks.join(', ') }}</span>
        </p>
        <Button type="button" variant="ghost" size="sm" @click="clearSelectedLinks">
          {{ $t('dashboard.clear_selection') }}
        </Button>
      </div>
      <div
        v-if="isLoading"
        role="status"
        aria-live="polite"
        class="
          flex min-h-0 flex-1 items-center justify-center gap-2 p-4
          text-muted-foreground
          sm:h-72 sm:flex-none
        "
      >
        <LoaderCircle
          class="
            size-4
            motion-safe:animate-spin
          "
          aria-hidden="true"
        />
        <span>{{ $t('dashboard.loading') }}</span>
      </div>
      <div
        v-else-if="hasError"
        role="alert"
        class="
          flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4
          text-center
          sm:h-72 sm:flex-none
        "
      >
        <p class="text-sm text-destructive">
          {{ $t('dashboard.realtime.links_error') }}
        </p>
        <Button type="button" variant="outline" size="sm" @click="retrySearch">
          {{ $t('common.try_again') }}
        </Button>
      </div>
      <div
        v-else-if="searchTerm.trim() && links.length === 0"
        role="status"
        aria-live="polite"
        class="
          flex min-h-0 flex-1 items-center justify-center p-4 text-center
          text-sm text-muted-foreground
          sm:h-72 sm:flex-none
        "
      >
        {{ $t('links.no_results') }}
      </div>
      <CommandList
        v-else-if="links.length"
        class="
          max-h-none min-h-0 flex-1 overflow-hidden
          sm:h-72 sm:max-h-72 sm:flex-none
          *:[[role=presentation]]:h-full *:[[role=presentation]]:min-h-0
        "
      >
        <CommandGroup class="h-full min-h-0">
          <VList
            v-slot="{ item: link }"
            :data="links"
            style="height: 100%"
          >
            <CommandItem
              :value="link.slug"
            >
              <CommandShortcut
                class="ml-0 flex size-4 shrink-0 items-center justify-center"
              >
                <Check
                  v-if="selectedLinks.includes(link.slug)"
                  class="size-4"
                  aria-hidden="true"
                />
              </CommandShortcut>
              <span class="min-w-0 flex-1 truncate">{{ link.slug }}</span>
            </CommandItem>
          </VList>
        </CommandGroup>
      </CommandList>
    </Command>
  </FilterTemplate>
  <Popover v-if="isDesktop" v-model:open="isOpen">
    <PopoverTrigger as-child>
      <TriggerComponent />
    </PopoverTrigger>
    <PopoverContent class="p-0" align="end">
      <FilterComponent />
    </PopoverContent>
  </Popover>

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
        <DrawerTitle>{{ $t('dashboard.realtime.filter_label') }}</DrawerTitle>
      </DrawerHeader>
      <FilterComponent />
    </DrawerContent>
  </Drawer>
</template>
