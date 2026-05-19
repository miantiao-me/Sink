<script setup lang="ts">
import type { LinkCheckResult } from '@/types'

const props = defineProps<{
  modelValue: string
  results: LinkCheckResult[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selected = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const abnormalCount = computed(() => props.results.filter(result => !result.ok).length)

const statusItems = computed(() => {
  const counts = new Map<number, number>()

  for (const result of props.results.filter(result => !result.ok))
    counts.set(result.status, (counts.get(result.status) ?? 0) + 1)

  return Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([status, count]) => ({
      status,
      count,
      value: `status:${status}`,
    }))
})
</script>

<template>
  <Tabs v-model="selected" class="w-full">
    <TabsList
      class="h-auto max-w-full justify-start overflow-x-auto p-1"
    >
      <TabsTrigger value="abnormal" class="shrink-0">
        {{ $t('check.tabs.abnormal', { count: abnormalCount }) }}
      </TabsTrigger>
      <TabsTrigger
        v-for="item in statusItems"
        :key="item.value"
        :value="item.value"
        class="shrink-0"
      >
        {{ $t('check.tabs.status', { status: item.status, count: item.count }) }}
      </TabsTrigger>
      <TabsTrigger value="all" class="shrink-0">
        {{ $t('check.tabs.all', { count: results.length }) }}
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>
