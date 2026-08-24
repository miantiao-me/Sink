<script setup lang="ts">
import type { MetricItem } from '@/types'
import { Maximize } from '@lucide/vue'

defineProps<{
  title: string
  metrics: MetricItem[]
  type: string
}>()
</script>

<template>
  <ResponsiveModal :title="title" content-class="md:max-w-(--breakpoint-md)">
    <template #trigger>
      <Button variant="link" class="w-full">
        <Maximize aria-hidden="true" class="mr-2 size-4" />
        {{ $t('dashboard.details') }}
      </Button>
    </template>

    <DashboardAnalysisMetricsList
      class="overflow-y-auto"
      :metrics="metrics"
      :type="type"
    />
  </ResponsiveModal>
</template>
