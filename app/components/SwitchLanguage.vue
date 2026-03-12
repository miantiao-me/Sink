<script setup lang="ts">
import { Languages } from 'lucide-vue-next'

const { setLocale, locales } = useI18n()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost">
        <Languages class="h-5 w-5" />
        <span class="sr-only">{{ $t('theme.toggle') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      class="min-w-min"
    >
      <DropdownMenuItem
        v-for="locale in locales"
        :key="locale.code"
        class="cursor-pointer"
        @click="setLocale(locale.code)"
      >
        <span class="mr-1">
          {{ locale.emoji }}
        </span>
        {{ locale.name }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
