<script setup lang="ts">
import { useInfiniteScroll } from '@vueuse/core'
import { Loader } from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from '@/components/ui/tags-input'
import { normalizeTags } from '@/lib/tags'

const links = ref([])
const limit = 24
let cursor = ''
let listComplete = false
let listError = false

const sortBy = ref('az')
const tagFilters = ref<string[]>([])

const availableTags = computed(() => {
  const tags = new Set<string>()
  for (const link of links.value || []) {
    if (Array.isArray(link.tags)) {
      for (const tag of link.tags)
        tags.add(tag)
    }
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b))
})

const tagSuggestions = computed(() => {
  const selected = new Set(tagFilters.value.map(tag => tag.toLowerCase()))
  return availableTags.value.filter(tag => !selected.has(tag.toLowerCase()))
})

const displayedLinks = computed(() => {
  const activeFilters = normalizeTags(tagFilters.value).map(tag => tag.toLowerCase())
  const filtered = activeFilters.length
    ? links.value.filter((link) => {
        const tags = (link.tags || []).map(tag => tag.toLowerCase())
        return tags.some(tag => activeFilters.includes(tag))
      })
    : links.value

  const sorted = [...filtered]
  switch (sortBy.value) {
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

function addTagFilter(tag: string) {
  tagFilters.value = normalizeTags([...tagFilters.value, tag])
}

async function getLinks() {
  try {
    const data = await useAPI('/api/link/list', {
      query: {
        limit,
        cursor,
      },
    })
    links.value = links.value.concat(data.links).filter(Boolean) // Sometimes cloudflare will return null, filter out
    cursor = data.cursor
    listComplete = data.list_complete
    listError = false
  }
  catch (error) {
    console.error(error)
    listError = true
  }
}

const { isLoading } = useInfiniteScroll(
  document,
  getLinks,
  {
    distance: 150,
    interval: 1000,
    canLoadMore: () => {
      return !listError && !listComplete
    },
  },
)

function updateLinkList(link, type) {
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
    sortBy.value = 'newest'
  }
}
</script>

<template>
  <main class="space-y-6">
    <div
      class="
        flex flex-col gap-6
        sm:flex-row sm:justify-between sm:gap-2
      "
    >
      <DashboardNav class="flex-1">
        <div class="flex items-center gap-2">
          <DashboardLinksEditor @update:link="updateLinkList" />
          <DashboardLinksSort v-model:sort-by="sortBy" />
        </div>
      </DashboardNav>
      <LazyDashboardLinksSearch />
    </div>
    <div class="flex flex-col gap-2">
      <Label class="text-sm font-medium">Filter by tags</Label>
      <div class="grid gap-2">
        <TagsInput
          :model-value="tagFilters"
          @update:model-value="tagFilters = normalizeTags($event)"
        >
          <TagsInputItem
            v-for="tag in tagFilters"
            :key="tag"
            :value="tag"
          >
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>
          <TagsInputInput placeholder="Add or select tags..." />
        </TagsInput>
        <div
          v-if="tagSuggestions.length"
          class="flex flex-wrap items-center gap-2"
        >
          <Button
            v-for="tag in tagSuggestions"
            :key="tag"
            type="button"
            variant="secondary"
            size="sm"
            class="h-6 px-2 text-xs"
            @click="addTagFilter(tag)"
          >
            {{ tag }}
          </Button>
        </div>
      </div>
    </div>
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
        @update:link="updateLinkList"
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
  </main>
</template>
