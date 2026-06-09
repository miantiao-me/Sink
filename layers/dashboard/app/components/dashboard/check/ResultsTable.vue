<script setup lang="ts">
import type { LinkCheckResult } from '@/types'
import { CircleCheck, CircleX, ExternalLink, WifiOff } from 'lucide-vue-next'

defineProps<{
  results: LinkCheckResult[]
  emptyMessage: string
}>()

function resultLabel(result: LinkCheckResult): string {
  if (result.status === 0)
    return 'check.result.network_error'

  return result.ok ? 'check.result.normal' : 'check.result.broken'
}

function resultVariant(result: LinkCheckResult): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (result.status === 0 || !result.ok)
    return 'destructive'

  return 'secondary'
}
</script>

<template>
  <div class="overflow-x-auto rounded-md border">
    <Table class="min-w-[72rem] table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead class="w-40">
            {{ $t('check.table.slug') }}
          </TableHead>
          <TableHead class="w-96">
            {{ $t('check.table.url') }}
          </TableHead>
          <TableHead class="w-24">
            {{ $t('check.table.status') }}
          </TableHead>
          <TableHead class="w-40">
            {{ $t('check.table.result') }}
          </TableHead>
          <TableHead class="w-28">
            {{ $t('check.table.duration') }}
          </TableHead>
          <TableHead class="w-80">
            {{ $t('check.table.error') }}
          </TableHead>
          <TableHead class="w-56 text-right">
            {{ $t('check.table.action') }}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="results.length === 0" :colspan="7">
          {{ emptyMessage }}
        </TableEmpty>
        <TableRow v-for="(result, index) in results" :key="`${result.slug}-${result.status}-${result.checkedAt}-${index}`">
          <TableCell class="font-medium">
            <div class="truncate" :title="result.slug">
              {{ result.slug }}
            </div>
          </TableCell>
          <TableCell>
            <div class="max-h-20 overflow-hidden break-all" :title="result.url">
              {{ result.url }}
            </div>
          </TableCell>
          <TableCell>
            <Badge :variant="resultVariant(result)">
              {{ result.status }}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge :variant="resultVariant(result)">
              <WifiOff v-if="result.status === 0" class="h-3.5 w-3.5" />
              <CircleCheck v-else-if="result.ok" class="h-3.5 w-3.5" />
              <CircleX v-else class="h-3.5 w-3.5" />
              {{ $t(resultLabel(result)) }}
            </Badge>
          </TableCell>
          <TableCell class="whitespace-nowrap">
            {{ $t('check.duration_ms', { duration: result.duration }) }}
          </TableCell>
          <TableCell class="text-muted-foreground">
            <div class="max-h-20 overflow-hidden break-all" :title="result.error || '-'">
              {{ result.error || '-' }}
            </div>
          </TableCell>
          <TableCell class="text-right">
            <div
              class="flex justify-end gap-2"
            >
              <Button
                as="a"
                variant="outline"
                size="sm"
                :href="result.url"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open original link"
              >
                <ExternalLink class="h-4 w-4" />
                {{ $t('check.actions.original') }}
              </Button>
              <Button
                as="a"
                variant="outline"
                size="sm"
                :href="getDashboardLinkDetailUrl(result.slug)"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open link detail"
              >
                <ExternalLink class="h-4 w-4" />
                {{ $t('check.actions.detail') }}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
