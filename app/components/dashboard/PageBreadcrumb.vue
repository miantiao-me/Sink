<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <Breadcrumb class="min-w-0">
    <BreadcrumbList class="min-w-0 flex-nowrap">
      <BreadcrumbItem class="shrink-0 whitespace-nowrap">
        <span class="text-muted-foreground">
          {{ $t('dashboard.title') }}
        </span>
      </BreadcrumbItem>
      <BreadcrumbSeparator class="shrink-0" />
      <BreadcrumbItem class="min-w-0">
        <BreadcrumbPage class="block truncate whitespace-nowrap">
          {{ title }}
        </BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
</template>
