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
          :is-active="item.isActive"
          class="
            hover:rounded-4xl
            data-active:rounded-4xl
          "
        >
          <NuxtLink :to="item.url">
            <component :is="item.icon" aria-hidden="true" />
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
          :is-active="item.isActive"
          class="
            hover:rounded-4xl
            data-active:rounded-4xl
          "
        >
          <NuxtLink :to="item.url">
            <component :is="item.icon" aria-hidden="true" />
            <span>{{ t(item.title) }}</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>
