<script setup lang="ts">
import type { Link } from '@/types'
import { toast } from 'vue-sonner'

const props = defineProps<{
  link: Link
}>()

const { t } = useI18n()
const linksStore = useDashboardLinksStore()

async function deleteLink() {
  try {
    await useAPI('/api/link/delete', {
      method: 'POST',
      body: {
        slug: props.link.slug,
      },
    })
    linksStore.notifyLinkUpdate(props.link, 'delete')
    toast(t('links.delete_success'))
  }
  catch (error) {
    console.error(error)
    toast.error(t('links.delete_failed'))
  }
}
</script>

<template>
  <AlertDialog>
    <AlertDialogTrigger as-child>
      <slot />
    </AlertDialogTrigger>
    <AlertDialogContent
      class="
        max-h-[95svh] max-w-[95svw] grid-rows-[auto_minmax(0,1fr)_auto]
        md:max-w-lg
      "
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('links.delete_confirm_title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('links.delete_confirm_desc') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="deleteLink">
          {{ $t('common.continue') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
