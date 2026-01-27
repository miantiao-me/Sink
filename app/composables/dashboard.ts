import { Activity, ChartArea, FolderSync, Link } from 'lucide-vue-next'

export interface DashboardRouteConfig {
  paths: string[]
  titleKey: string
  icon: Component
}

export const DASHBOARD_ROUTES: Record<string, DashboardRouteConfig> = {
  links: {
    paths: ['/dashboard/links'],
    titleKey: 'nav.links',
    icon: Link,
  },
  link: {
    paths: ['/dashboard/link'],
    titleKey: 'nav.links',
    icon: Link,
  },
  analysis: {
    paths: ['/dashboard/analysis'],
    titleKey: 'nav.analysis',
    icon: ChartArea,
  },
  realtime: {
    paths: ['/dashboard/realtime'],
    titleKey: 'nav.realtime',
    icon: Activity,
  },
  migrate: {
    paths: ['/dashboard/migrate'],
    titleKey: 'nav.migrate',
    icon: FolderSync,
  },
} as const

export function useDashboardRoute() {
  const route = useRoute()

  const currentPage = computed(() => {
    for (const [page, config] of Object.entries(DASHBOARD_ROUTES)) {
      if (config.paths.includes(route.path))
        return page
    }
    return ''
  })

  const pageTitle = computed(() => {
    const page = currentPage.value
    return page ? DASHBOARD_ROUTES[page]?.titleKey : 'dashboard.title'
  })

  const isActive = (page: string) => {
    return currentPage.value === page
  }

  return { currentPage, pageTitle, isActive }
}
