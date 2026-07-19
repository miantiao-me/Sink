<script setup lang="ts">
import type { DateRange, DateValue } from 'reka-ui'
import { getLocalTimeZone } from '@internationalized/date'
import { useMediaQuery } from '@vueuse/core'

defineProps<{
  range?: DateRange
}>()

const emit = defineEmits<{
  select: [range: DateRange]
}>()

const open = defineModel<boolean>('open', { default: false })
const showTwoMonths = useMediaQuery('(min-width: 768px)')
const timeZone = getLocalTimeZone()

function isDateDisabled(value: DateValue) {
  return value.toDate(timeZone) > new Date()
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    :title="$t('dashboard.date_picker.custom_title')"
    content-class="w-[calc(100vw_-_2rem)] overflow-x-hidden md:w-auto md:max-w-(--breakpoint-md)"
  >
    <RangeCalendar
      :model-value="range"
      initial-focus
      weekday-format="short"
      :number-of-months="showTwoMonths ? 2 : 1"
      class="max-w-full overflow-x-hidden"
      :is-date-disabled="isDateDisabled"
      @update:model-value="$event && emit('select', $event)"
    />
  </ResponsiveModal>
</template>
