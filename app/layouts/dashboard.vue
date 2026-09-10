<script setup lang="ts">
import { useScroll } from '@vueuse/core'

const { pageTitle } = useDashboardRoute()
const route = useRoute()

const scrollContainer = ref<HTMLElement | null>(null)
const { y } = useScroll(scrollContainer)

watch(() => route.fullPath, () => {
  y.value = 0
})

useSeoMeta({
  robots: 'noindex, nofollow',
})
</script>

<template>
  <SidebarProvider>
    <a
      href="#dashboard-main"
      class="
        fixed top-4 left-4 z-50 -translate-y-24 rounded-md bg-background px-4
        py-2 text-sm font-medium shadow-lg
        focus:translate-y-0
        focus-visible:ring-2 focus-visible:ring-ring
      "
    >
      {{ $t('layouts.links.skip_to_content') }}
    </a>
    <DashboardSidebarAppSidebar />
    <SidebarInset
      class="
        max-h-svh overflow-hidden
        md:max-h-[calc(100svh-1rem)]
      "
    >
      <div class="flex h-full flex-col">
        <header
          class="
            z-20 flex shrink-0 flex-col gap-2 border-b bg-background p-4
            pt-[calc(1rem+env(safe-area-inset-top))]
            sm:h-16 sm:flex-row sm:items-center sm:gap-2 sm:py-0
          "
        >
          <div
            class="
              flex w-full min-w-0 items-center gap-2
              sm:w-auto
            "
          >
            <SidebarTrigger class="-ml-1" />
            <Separator orientation="vertical" class="mr-2 h-4" />
            <DashboardPageBreadcrumb :title="$t(pageTitle ?? 'dashboard.title')" />
          </div>

          <div
            id="dashboard-header-actions"
            class="
              flex w-full flex-wrap items-center gap-2
              sm:ml-auto sm:w-auto sm:flex-1 sm:flex-nowrap sm:justify-end
            "
          />
        </header>

        <div
          id="dashboard-main"
          ref="scrollContainer"
          tabindex="-1"
          class="
            flex-1 overflow-x-hidden overflow-y-auto p-4
            pb-[calc(1rem+env(safe-area-inset-bottom))]
          "
        >
          <slot />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
