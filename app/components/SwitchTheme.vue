<script setup lang="ts">
import { Laptop, Moon, Sun } from '@lucide/vue'

const colorMode = useColorMode()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="$t('theme.toggle')">
        <Sun
          aria-hidden="true"
          class="
            absolute scale-100 transition-[transform,opacity]
            dark:scale-0
          "
        />
        <Moon
          aria-hidden="true"
          class="
            scale-0 transition-[transform,opacity]
            dark:scale-100
          "
        />
        <span class="sr-only">{{ $t('theme.toggle') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
    >
      <DropdownMenuItem
        @click="colorMode.preference = 'light'"
      >
        <Sun aria-hidden="true" />
        {{ $t('theme.light') }}
      </DropdownMenuItem>
      <DropdownMenuItem
        @click="colorMode.preference = 'dark'"
      >
        <Moon aria-hidden="true" />
        {{ $t('theme.dark') }}
      </DropdownMenuItem>
      <DropdownMenuItem
        @click="colorMode.preference = 'system'"
      >
        <Laptop aria-hidden="true" />
        {{ $t('theme.system') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
