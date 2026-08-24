<script setup lang="ts">
const analysisStore = useDashboardAnalysisStore()
const { locale } = useI18n()
const openCustomDateRange = ref(false)

function onPresetChange(value: string | number | bigint | Record<string, any> | null) {
  if (value === 'custom') {
    openCustomDateRange.value = true
    return
  }

  if (!isAnalysisDatePreset(value))
    return

  analysisStore.selectPreset(value)
}
</script>

<template>
  <Select :model-value="analysisStore.datePreset" @update:model-value="onPresetChange">
    <SelectTrigger :aria-label="$t('dashboard.date_range')">
      <SelectValue v-if="analysisStore.datePreset" />
      <div v-else>
        {{ shortDate(analysisStore.dateRange.startAt, locale) }} - {{ shortDate(analysisStore.dateRange.endAt, locale) }}
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="today">
        {{ $t('dashboard.date_picker.today') }}
      </SelectItem>
      <SelectItem value="last-24h">
        {{ $t('dashboard.date_picker.last_24h') }}
      </SelectItem>
      <SelectSeparator />
      <SelectItem value="this-week">
        {{ $t('dashboard.date_picker.this_week') }}
      </SelectItem>
      <SelectItem value="last-7d">
        {{ $t('dashboard.date_picker.last_7d') }}
      </SelectItem>
      <SelectSeparator />
      <SelectItem value="this-month">
        {{ $t('dashboard.date_picker.this_month') }}
      </SelectItem>
      <SelectItem value="last-30d">
        {{ $t('dashboard.date_picker.last_30d') }}
      </SelectItem>
      <SelectSeparator />
      <SelectItem value="last-90d">
        {{ $t('dashboard.date_picker.last_90d') }}
      </SelectItem>
      <SelectSeparator />
      <SelectItem value="custom">
        {{ $t('dashboard.date_picker.custom') }}
      </SelectItem>
    </SelectContent>
  </Select>

  <DashboardCustomDateRangeModal
    v-model:open="openCustomDateRange"
    @select="analysisStore.selectCustomRange"
  />
</template>
