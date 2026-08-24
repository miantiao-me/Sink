<script setup lang="ts">
import { AlertCircle, Database, Loader } from '@lucide/vue'

definePageMeta({
  layout: 'dashboard',
})

const migration = useLinkMigration()
const linksStore = useDashboardLinksStore()
useDashboardLinksRouteState()

onMounted(() => {
  migration.autoMigration()
})
</script>

<template>
  <Tabs v-if="migration.completed.value" v-model="linksStore.status" default-value="active" as-child>
    <main class="space-y-6">
      <h1 class="sr-only">
        {{ $t('links.group_title') }}
      </h1>
      <Teleport to="#dashboard-header-actions" defer>
        <DashboardLinksSearchDialog />
        <DashboardLinksEditorModal />
      </Teleport>

      <DashboardLinksFilters />
      <TabsContent value="active">
        <DashboardLinks />
      </TabsContent>
      <TabsContent value="expired">
        <DashboardLinks />
      </TabsContent>
    </main>
  </Tabs>
  <section
    v-else
    class="flex h-full items-center justify-center px-4"
  >
    <div
      v-if="migration.error.value"
      role="alert"
      class="flex max-w-md flex-col items-center gap-4 text-center"
    >
      <AlertCircle class="size-10 text-destructive" />
      <div class="space-y-1">
        <h2 class="font-semibold">
          {{ $t('links.migration_gate.failed_title') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ $t('links.migration_gate.failed_description') }}
        </p>
        <p class="text-xs wrap-break-word text-destructive">
          {{ migration.error.value }}
        </p>
      </div>
      <div class="flex flex-wrap justify-center gap-2">
        <Button :disabled="migration.running.value" @click="migration.autoMigration">
          {{ $t('links.migration_gate.retry') }}
        </Button>
        <Button variant="outline" as-child>
          <NuxtLink to="/dashboard/migrate?tab=d1">
            {{ $t('links.migration_gate.open_migration') }}
          </NuxtLink>
        </Button>
      </div>
    </div>
    <div
      v-else
      role="status"
      aria-live="polite"
      class="flex flex-col items-center gap-3 text-center"
    >
      <div class="relative">
        <Database class="size-10 text-muted-foreground" />
        <Loader
          class="
            absolute -right-3 -bottom-2 size-5
            motion-safe:animate-spin
          "
        />
      </div>
      <p class="font-medium">
        {{ $t('links.migration_gate.loading') }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ $t('links.migration_gate.scanned', { count: migration.totals.value.scanned }) }}
      </p>
    </div>
  </section>
</template>
