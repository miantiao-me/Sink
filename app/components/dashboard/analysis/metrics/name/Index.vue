<script setup lang="ts">
defineProps<{
  name: string
  type: string
}>()

const locale = useI18n().locale

function formatName(name: string, type: string): string {
  if (!name)
    return name

  if (type === 'country')
    return `${getFlag(name)} ${getRegionName(name, locale.value)}`

  if (type === 'language')
    return getLanguageName(name, locale.value)

  return name
}
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger class="w-full text-left">
        <DashboardAnalysisMetricsNameReferer
          v-if="name && type === 'referer'"
          :name="name"
        />
        <DashboardAnalysisMetricsNameSlug
          v-else-if="name && type === 'slug'"
          :name="name"
        />
        <DashboardAnalysisMetricsNameIcon
          v-else-if="name && ['os', 'browser', 'browserType', 'device', 'deviceType'].includes(type)"
          :name="name"
          :type="type"
        />
        <div
          v-else
          class="w-full truncate"
        >
          {{ formatName(name, type) || $t('dashboard.none') }}
        </div>
      </TooltipTrigger>
      <TooltipContent v-if="name">
        <p>
          {{ formatName(name, type) }}
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
