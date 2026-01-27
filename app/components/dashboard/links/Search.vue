<script setup lang="ts">
import type { Link } from '@/types'
import { createReusableTemplate, useMagicKeys, useMediaQuery } from '@vueuse/core'
import { useFuse } from '@vueuse/integrations/useFuse'

defineOptions({
  inheritAttrs: false,
})
const [TriggerTemplate, TriggerComponent] = createReusableTemplate()
const [SearchTemplate, SearchComponent] = createReusableTemplate()

const isDesktop = useMediaQuery('(min-width: 640px)')

const router = useRouter()

const isOpen = ref(false)
const searchTerm = ref('')
const links = ref<Link[]>([])

const { results: filteredLinks } = useFuse(searchTerm, links, {
  fuseOptions: {
    keys: ['slug', 'url', 'comment'],
  },
  resultLimit: 20,
})

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

function selectLink(link: Link | undefined) {
  if (!link)
    return
  isOpen.value = false
  router.push({
    path: '/dashboard/link',
    query: { slug: link.slug },
  })
}

async function getLinks() {
  try {
    links.value = await useAPI('/api/link/search') as Link[]
  }
  catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  getLinks()
})
</script>

<template>
  <TriggerTemplate v-slot="attrs">
    <Button
      v-bind="sanitizeSlotAttrs(attrs)"
      variant="outline"
      size="sm"
      class="
        relative h-9 w-full justify-start bg-background text-muted-foreground
        sm:w-32
        md:w-48
      "
    >
      <span
        class="
          hidden
          md:inline-flex
        "
      >{{ $t('links.search_placeholder') }}</span>
      <span
        class="
          inline-flex
          md:hidden
        "
      >{{ $t('common.search') }}</span>
      <kbd
        class="
          pointer-events-none absolute top-2 right-[0.3rem] hidden h-5
          items-center gap-1 rounded border bg-muted px-1.5 font-mono
          text-[10px] font-medium opacity-100 select-none
          sm:flex
        "
      >
        <span class="text-xs">⌘</span>K
      </kbd>
    </Button>
  </TriggerTemplate>
  <SearchTemplate>
    <Command class="h-auto">
      <CommandInput v-model="searchTerm" :placeholder="$t('links.search_placeholder')" />
    </Command>
    <!-- disable command search -->
    <Command class="flex-1">
      <CommandList
        class="
          max-h-none
          sm:max-h-[300px]
        "
      >
        <CommandEmpty>
          {{ $t('links.no_results') }}
        </CommandEmpty>
        <CommandGroup v-if="filteredLinks.length" :heading="$t('links.group_title')">
          <CommandItem
            v-for="link in filteredLinks" :key="link.item?.id" class="
              cursor-pointer
            " :value="link.item" @select="selectLink(link.item)"
          >
            <div class="flex w-full gap-1">
              <div class="inline-flex flex-1 items-center gap-1 overflow-hidden">
                <div class="text-sm font-medium">
                  {{ link.item?.slug }}
                </div>
                <div class="flex-1 truncate text-xs text-muted-foreground">
                  ({{ link.item?.url }})
                </div>
              </div>
              <Badge v-if="link.item?.comment" variant="secondary">
                <div class="max-w-24 truncate">
                  {{ link.item?.comment }}
                </div>
              </Badge>
            </div>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </SearchTemplate>
  <Dialog v-if="isDesktop" v-model:open="isOpen">
    <DialogTrigger as-child>
      <TriggerComponent />
    </DialogTrigger>
    <DialogContent class="gap-0 overflow-hidden p-0 shadow-lg" :show-close-button="false">
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
    <DrawerContent class="h-[500px] gap-0">
      <DrawerHeader class="sr-only">
        <DrawerTitle>{{ $t('links.search_placeholder') }}</DrawerTitle>
      </DrawerHeader>
      <SearchComponent />
    </DrawerContent>
  </Drawer>
</template>
