<script setup lang="ts">
defineProps<{
  tabs: readonly string[]
  rawTabs: readonly string[]
}>()
</script>

<template>
  <Tabs
    :default-value="rawTabs[0]"
    class="
      flex flex-col
      lg:h-[500px]
    "
  >
    <div class="max-w-full shrink-0 overflow-x-auto p-1">
      <TabsList class="min-w-max">
        <TabsTrigger
          v-for="(tab, index) in tabs"
          :key="tab"
          :value="rawTabs[index]!"
        >
          {{ tab }}
        </TabsTrigger>
      </TabsList>
    </div>
    <TabsContent
      v-for="(tab, index) in tabs"
      :key="tab"
      :value="rawTabs[index]!"
      class="min-h-0 flex-1"
    >
      <DashboardAnalysisMetricsMetric
        :type="rawTabs[index]!"
        :name="tab"
        class="h-full"
      />
    </TabsContent>
  </Tabs>
</template>
