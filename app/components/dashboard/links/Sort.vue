<script setup lang="ts">
import { ArrowUpDown } from '@lucide/vue'

const linksStore = useDashboardLinksStore()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        :aria-label="$t(`links.sort.${linksStore.sortBy}`)"
      >
        <ArrowUpDown
          aria-hidden="true"
          class="
            size-4
            sm:mr-2
          "
        />
        <span
          class="
            hidden
            sm:inline
          "
        >
          {{ $t(`links.sort.${linksStore.sortBy}`) }}
        </span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem @click="linksStore.sortBy = 'newest'">
        {{ $t('links.sort.newest') }}
      </DropdownMenuItem>
      <DropdownMenuItem @click="linksStore.sortBy = 'oldest'">
        {{ $t('links.sort.oldest') }}
      </DropdownMenuItem>
      <DropdownMenuItem @click="linksStore.sortBy = 'az'">
        {{ $t('links.sort.az') }}
      </DropdownMenuItem>
      <DropdownMenuItem @click="linksStore.sortBy = 'za'">
        {{ $t('links.sort.za') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
