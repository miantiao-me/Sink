<script setup lang="ts">
import { Laptop, Moon, Sun } from 'lucide-vue-next'

const colorMode = useColorMode()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost">
        <Sun
          class="
            absolute h-5 w-5 scale-100 transition-all
            dark:scale-0
          "
        />
        <Moon
          class="
            h-5 w-5 scale-0 transition-all
            dark:scale-100
          "
        />
        <span class="sr-only">{{ $t('theme.toggle') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      class="min-w-min"
    >
      <DropdownMenuItem
        class="cursor-pointer"
        @click="colorMode.preference = 'light'"
      >
        <Sun class="mr-1 h-4 w-4" />
        {{ $t('theme.light') }}
      </DropdownMenuItem>
      <DropdownMenuItem
        class="cursor-pointer"
        @click="colorMode.preference = 'dark'"
      >
        <Moon class="mr-1 h-4 w-4" />
        {{ $t('theme.dark') }}
      </DropdownMenuItem>
      <DropdownMenuItem
        class="cursor-pointer"
        @click="colorMode.preference = 'system'"
      >
        <Laptop class="mr-1 h-4 w-4" />
        {{ $t('theme.system') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
