<script setup lang="ts">
import { Languages } from '@lucide/vue'

const { setLocale, locales } = useI18n()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="$t('layouts.header.select_language')">
        <Languages aria-hidden="true" />
        <span class="sr-only">{{ $t('layouts.header.select_language') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
    >
      <DropdownMenuItem
        v-for="locale in locales"
        :key="locale.code"
        @click="setLocale(locale.code)"
      >
        <span>
          {{ locale.emoji }}
        </span>
        {{ locale.name }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
