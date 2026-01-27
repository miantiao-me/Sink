<script setup lang="ts">
import type { Link } from '@/types'

definePageMeta({
  layout: 'dashboard',
})

const slug = useRoute().query.slug
const linksStore = useDashboardLinksStore()

const link = ref<Link | null>(null)
const id = computed(() => link.value?.id)

provide(LINK_ID_KEY, id)

async function getLink() {
  const data = await useAPI<Link>('/api/link/query', {
    query: { slug },
  })
  link.value = data
}

onMounted(() => {
  getLink()
})

const unsubscribe = linksStore.onLinkUpdate(({ link: updatedLink, type }) => {
  if (updatedLink.id !== link.value?.id)
    return

  if (type === 'delete') {
    navigateTo('/dashboard/links', { replace: true })
  }
  else if (type === 'edit') {
    link.value = updatedLink
  }
})

onUnmounted(() => {
  unsubscribe()
})
</script>

<template>
  <main class="space-y-6">
    <DashboardLinksLink
      v-if="link?.id"
      :link="link"
    />
    <DashboardAnalysis
      v-if="link?.id"
      :link="link"
    />
  </main>
</template>
