<script setup lang="ts">
const realtimeStore = useDashboardRealtimeStore()

function onPresetChange(value: string | number | bigint | Record<string, any> | null) {
  if (typeof value !== 'string')
    return

  realtimeStore.selectPreset(value)
}
</script>

<template>
  <Select :model-value="realtimeStore.timeName" @update:model-value="onPresetChange">
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="last-5m">
        {{ $t('dashboard.time_picker.last_5m') }}
      </SelectItem>
      <SelectItem value="last-10m">
        {{ $t('dashboard.time_picker.last_10m') }}
      </SelectItem>
      <SelectItem value="last-30m">
        {{ $t('dashboard.time_picker.last_30m') }}
      </SelectItem>
      <SelectItem value="last-1h">
        {{ $t('dashboard.time_picker.last_1h') }}
      </SelectItem>
      <SelectItem value="last-6h">
        {{ $t('dashboard.time_picker.last_6h') }}
      </SelectItem>
      <SelectItem value="last-12h">
        {{ $t('dashboard.time_picker.last_12h') }}
      </SelectItem>
      <SelectItem value="last-24h">
        {{ $t('dashboard.time_picker.last_24h') }}
      </SelectItem>
      <SelectSeparator />
      <SelectItem value="today">
        {{ $t('dashboard.time_picker.today') }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
