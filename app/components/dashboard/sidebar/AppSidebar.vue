<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

interface NavItem {
  title: string
  to: RouteLocationRaw
  icon: Component
  isActive: boolean
}

const { title } = useAppConfig()
const { isActive } = useDashboardRoute()

const platformItems = computed<NavItem[]>(() => [
  {
    title: 'nav.links',
    to: { name: 'links' },
    icon: DASHBOARD_ROUTES.links.icon,
    isActive: isActive('links'),
  },
  {
    title: 'nav.analysis',
    to: { name: 'analysis' },
    icon: DASHBOARD_ROUTES.analysis.icon,
    isActive: isActive('analysis'),
  },
  {
    title: 'nav.realtime',
    to: { name: 'realtime' },
    icon: DASHBOARD_ROUTES.realtime.icon,
    isActive: isActive('realtime'),
  },
  {
    title: 'nav.check',
    to: { name: 'check' },
    icon: DASHBOARD_ROUTES.check.icon,
    isActive: isActive('check'),
  },
])

const settingsItems = computed<NavItem[]>(() => [
  {
    title: 'nav.migrate',
    to: { name: 'migrate' },
    icon: DASHBOARD_ROUTES.migrate.icon,
    isActive: isActive('migrate'),
  },
])
</script>

<template>
  <Sidebar collapsible="icon" variant="inset">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <NuxtLink
              to="/" :title="title"
            >
              <div
                class="
                  flex aspect-square size-8 items-center justify-center
                  rounded-full
                "
              >
                <img
                  src="/sink.png"
                  alt=""
                  width="32"
                  height="32"
                  class="size-8 rounded-full"
                >
              </div>
              <div class="grid flex-1 text-left text-sm/tight">
                <span class="truncate font-medium">{{ title }}</span>
                <span class="truncate text-xs">{{ $t('sidebar.subtitle') }}</span>
              </div>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <DashboardSidebarNavMain :platform-items="platformItems" :settings-items="settingsItems" />
      <DashboardSidebarNavSecondary class="mt-auto" />
    </SidebarContent>
    <SidebarFooter>
      <DashboardSidebarNavUser />
    </SidebarFooter>
  </Sidebar>
</template>
