<script setup lang="ts">
import { getLocalTimeZone, now } from '@internationalized/date'

const emit = defineEmits<{
  'update:timeRange': [value: [number, number], key: string]
}>()

const realtimeStore = useDashboardRealtimeStore()
const timeRange = ref(realtimeStore.timeName || 'last-1h')
const tz = getLocalTimeZone()

watch(() => realtimeStore.timeName, (newName) => {
  if (newName && newName !== timeRange.value) {
    timeRange.value = newName
  }
})

watch(timeRange, (newValue) => {
  switch (newValue) {
    case 'today':
      emit('update:timeRange', [date2unix(now(tz), 'start'), date2unix(now(tz))], newValue)
      break
    case 'last-5m':
      emit('update:timeRange', [date2unix(now(tz).subtract({ minutes: 5 })), date2unix(now(tz))], newValue)
      break
    case 'last-10m':
      emit('update:timeRange', [date2unix(now(tz).subtract({ minutes: 10 })), date2unix(now(tz))], newValue)
      break
    case 'last-30m':
      emit('update:timeRange', [date2unix(now(tz).subtract({ minutes: 30 })), date2unix(now(tz))], newValue)
      break
    case 'last-1h':
      emit('update:timeRange', [date2unix(now(tz).subtract({ hours: 1 })), date2unix(now(tz))], newValue)
      break
    case 'last-6h':
      emit('update:timeRange', [date2unix(now(tz).subtract({ hours: 6 })), date2unix(now(tz))], newValue)
      break
    case 'last-12h':
      emit('update:timeRange', [date2unix(now(tz).subtract({ hours: 12 })), date2unix(now(tz))], newValue)
      break
    case 'last-24h':
      emit('update:timeRange', [date2unix(now(tz).subtract({ hours: 24 })), date2unix(now(tz))], newValue)
      break
    default:
      break
  }
}, { deep: true })
</script>

<template>
  <Select v-model="timeRange">
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
