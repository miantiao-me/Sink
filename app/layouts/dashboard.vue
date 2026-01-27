<script setup lang="ts">
import { useScroll } from '@vueuse/core'

const { currentPage, pageTitle } = useDashboardRoute()
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
            sm:h-16 sm:flex-row sm:items-center sm:gap-2 sm:py-0
          "
        >
          <div class="flex items-center gap-2">
            <SidebarTrigger class="-ml-1" />
            <Separator
              orientation="vertical"
              class="
                mr-2
                data-[orientation=vertical]:h-4
              "
            />
            <DashboardPageBreadcrumb :title="$t(pageTitle)" />
          </div>

          <div class="flex flex-1 items-center justify-end gap-2">
            <div
              class="
                hidden items-center gap-2
                sm:flex
              "
            >
              <DashboardHeaderActions :page="currentPage" />
            </div>
          </div>

          <div
            class="
              flex flex-wrap items-center gap-2
              sm:hidden
            "
          >
            <DashboardHeaderActions :page="currentPage" :mobile-buttons="true" />
          </div>

          <div
            class="
              w-full
              sm:hidden
            "
          >
            <DashboardHeaderActions :page="currentPage" :mobile-search="true" />
          </div>
        </header>

        <div ref="scrollContainer" class="flex-1 overflow-y-auto p-4">
          <slot />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
