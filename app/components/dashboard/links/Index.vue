<script setup lang="ts">
import type { Link, LinkListResponse, LinkUpdateType } from '@/types'
import { useInfiniteScroll } from '@vueuse/core'
import { Loader } from 'lucide-vue-next'

const linksStore = useDashboardLinksStore()

const links = ref<Link[]>([])
const listComplete = ref(false)
const listError = ref(false)
const limit = 24
let cursor = ''

const scrollContainer = ref<HTMLElement | Window | null>(null)

onMounted(() => {
  scrollContainer.value = document.querySelector('.overflow-y-auto') as HTMLElement | null
})

const displayedLinks = computed(() => {
  const sorted = [...links.value]
  switch (linksStore.sortBy) {
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt - b.createdAt)
    case 'az':
      return sorted.sort((a, b) => a.slug.localeCompare(b.slug))
    case 'za':
      return sorted.sort((a, b) => b.slug.localeCompare(a.slug))
    default:
      return sorted
  }
})

async function getLinks() {
  try {
    const data = await useAPI('/api/link/list', {
      query: {
        limit,
        cursor,
      },
    }) as LinkListResponse
    links.value = links.value.concat(data.links).filter(Boolean)
    cursor = data.cursor
    listComplete.value = data.list_complete
    listError.value = false
  }
  catch (error) {
    console.error(error)
    listError.value = true
  }
}

const { isLoading } = useInfiniteScroll(
  scrollContainer as unknown as Ref<HTMLElement | null>,
  getLinks,
  {
    distance: 150,
    interval: 1000,
    canLoadMore: () => {
      return !listError.value && !listComplete.value
    },
  },
)

function updateLinkList(link: Link, type: LinkUpdateType) {
  if (type === 'edit') {
    const index = links.value.findIndex(l => l.id === link.id)
    links.value[index] = link
  }
  else if (type === 'delete') {
    const index = links.value.findIndex(l => l.id === link.id)
    links.value.splice(index, 1)
  }
  else {
    links.value.unshift(link)
    linksStore.sortBy = 'newest'
  }
}

const unsubscribe = linksStore.onLinkUpdate(({ link, type }) => {
  updateLinkList(link, type)
})

onUnmounted(() => {
  unsubscribe()
})
</script>

<template>
  <section
    class="
      grid grid-cols-1 gap-4
      md:grid-cols-2
      lg:grid-cols-3
    "
  >
    <DashboardLinksLink
      v-for="link in displayedLinks"
      :key="link.id"
      :link="link"
    />
  </section>
  <div
    v-if="isLoading"
    class="flex items-center justify-center"
  >
    <Loader class="animate-spin" />
  </div>
  <div
    v-if="!isLoading && listComplete"
    class="flex items-center justify-center text-sm"
  >
    {{ $t('links.no_more') }}
  </div>
  <div
    v-if="listError"
    class="flex items-center justify-center text-sm"
  >
    {{ $t('links.load_failed') }}
    <Button variant="link" @click="getLinks">
      {{ $t('common.try_again') }}
    </Button>
  </div>
</template>
