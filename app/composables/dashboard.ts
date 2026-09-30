import type { Component } from 'vue'
import { Activity, ChartArea, FolderSync, Link, ScanSearch } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute } from '#imports'

export interface DashboardRouteConfig {
  readonly titleKey: string
  readonly icon: Component
}

// Keyed by route name, which stays the same whether the dashboard is served from the root of
// its own host or from `/dashboard` (see the `pages:extend` hook in nuxt.config.ts).
export const DASHBOARD_ROUTES = {
  links: {
    titleKey: 'nav.links',
    icon: Link,
  },
  link: {
    titleKey: 'nav.links',
    icon: Link,
  },
  analysis: {
    titleKey: 'nav.analysis',
    icon: ChartArea,
  },
  realtime: {
    titleKey: 'nav.realtime',
    icon: Activity,
  },
  check: {
    titleKey: 'nav.check',
    icon: ScanSearch,
  },
  migrate: {
    titleKey: 'nav.migrate',
    icon: FolderSync,
  },
} as const satisfies Record<string, DashboardRouteConfig>

export type DashboardRouteName = keyof typeof DASHBOARD_ROUTES

export function useDashboardRoute() {
  const route = useRoute()

  const currentPage = computed<DashboardRouteName | ''>(() => {
    const name = typeof route.name === 'string' ? route.name : ''
    return name in DASHBOARD_ROUTES ? name as DashboardRouteName : ''
  })

  const pageTitle = computed(() => {
    const page = currentPage.value
    return page ? DASHBOARD_ROUTES[page].titleKey : 'dashboard.title'
  })

  const isActive = (page: DashboardRouteName) => {
    return currentPage.value === page
  }

  return { currentPage, pageTitle, isActive }
}
