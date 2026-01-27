<script setup lang="ts">
import type { Link } from '@/types'
import { createReusableTemplate, useMediaQuery, useUrlSearchParams, watchDebounced } from '@vueuse/core'
import { safeDestr } from 'destr'
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { VList } from 'virtua/vue'
import { cn } from '@/lib/utils'

const emit = defineEmits<{
  change: [key: string, value: string]
}>()

const [TriggerTemplate, TriggerComponent] = createReusableTemplate()
const [FilterTemplate, FilterComponent] = createReusableTemplate()

const isDesktop = useMediaQuery('(min-width: 640px)')

const links = ref<Link[]>([])
const isOpen = ref(false)
const selectedLinks = ref<string[]>([])

async function getLinks() {
  try {
    links.value = await useAPI('/api/link/search')
  }
  catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  getLinks()
})

watchDebounced(selectedLinks, (value) => {
  emit('change', 'slug', value.join(','))
}, { debounce: 500, maxWait: 1000 })

function restoreFilters() {
  const searchParams = useUrlSearchParams('history')
  if (searchParams.filters) {
    const filters = safeDestr<{ slug?: string }>(searchParams.filters as string)
    if (filters.slug) {
      selectedLinks.value = filters.slug.split(',')
    }
  }
}

onBeforeMount(() => {
  restoreFilters()
})
</script>

<template>
  <TriggerTemplate>
    <Button
      variant="outline"
      role="combobox"
      :aria-expanded="isOpen"
      class="
        flex w-full justify-between px-3
        sm:w-48
      "
    >
      <div
        class="flex-1 truncate text-left" :class="selectedLinks.length ? `
          text-foreground
        ` : `text-muted-foreground`"
      >
        {{ selectedLinks.length ? selectedLinks.join(', ') : $t('dashboard.filter_placeholder') }}
      </div>
      <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </TriggerTemplate>
  <FilterTemplate>
    <Command v-model="selectedLinks" multiple>
      <CommandInput :placeholder="selectedLinks.length ? selectedLinks.join(', ') : $t('dashboard.filter_placeholder')" />
      <CommandEmpty>No link found.</CommandEmpty>
      <CommandList :class="{ 'max-h-none': !isDesktop }">
        <CommandGroup>
          <VList
            v-slot="{ item: link }"
            :data="links"
            :style="{ height: isDesktop ? '292px' : '420px' }"
          >
            <CommandItem
              :value="link.slug"
              class="py-2"
            >
              <Check
                :class="cn(
                  'h-4 w-4',
                  selectedLinks.includes(link.slug) ? 'opacity-100' : `
                    opacity-0
                  `,
                )"
              />
              {{ link.slug }}
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
    <PopoverContent
      class="
        w-full p-0
        sm:w-48
      "
    >
      <FilterComponent />
    </PopoverContent>
  </Popover>

  <Drawer v-else v-model:open="isOpen">
    <DrawerTrigger as-child>
      <TriggerComponent />
    </DrawerTrigger>
    <DrawerContent class="h-[500px]">
      <DrawerHeader class="sr-only">
        <DrawerTitle>{{ $t('dashboard.filter_placeholder') }}</DrawerTitle>
      </DrawerHeader>
      <FilterComponent />
    </DrawerContent>
  </Drawer>
</template>
