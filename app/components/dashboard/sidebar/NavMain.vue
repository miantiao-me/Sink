<script setup lang="ts">
import { useSidebar } from '@/components/ui/sidebar'

defineProps<{
  platformItems: {
    title: string
    url: string
    icon: Component
    isActive?: boolean
  }[]
  settingsItems: {
    title: string
    url: string
    icon: Component
    isActive?: boolean
  }[]
}>()

const { t } = useI18n()
const { isMobile, setOpenMobile } = useSidebar()
const route = useRoute()

let globePreloaded = false
function preloadGlobeOnHover(url: string) {
  if (url.includes('realtime') && !globePreloaded) {
    globePreloaded = true
    import('@/components/dashboard/realtime/Globe.vue')
  }
}

watch(() => route.path, () => {
  if (isMobile.value) {
    setOpenMobile(false)
  }
})
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>{{ $t('sidebar.platform') }}</SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem v-for="item in platformItems" :key="item.title">
        <SidebarMenuButton
          as-child
          :tooltip="t(item.title)"
          :data-active="item.isActive"
          @mouseenter="preloadGlobeOnHover(item.url)"
        >
          <NuxtLink :to="item.url">
            <component :is="item.icon" />
            <span>{{ t(item.title) }}</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>

  <SidebarGroup>
    <SidebarGroupLabel>{{ $t('sidebar.settings') }}</SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem v-for="item in settingsItems" :key="item.title">
        <SidebarMenuButton
          as-child
          :tooltip="t(item.title)"
          :data-active="item.isActive"
        >
          <NuxtLink :to="item.url">
            <component :is="item.icon" />
            <span>{{ t(item.title) }}</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>
