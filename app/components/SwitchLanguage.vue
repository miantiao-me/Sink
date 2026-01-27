<script setup lang="ts">
import { Languages } from 'lucide-vue-next'

const nuxtApp = useNuxtApp()
const i18n = nuxtApp.$i18n
const { setLocale, locales } = useI18n()
const currentLocale = ref(i18n.locale.value)

watch(currentLocale, (newLocale) => {
  setLocale(newLocale)
})
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
