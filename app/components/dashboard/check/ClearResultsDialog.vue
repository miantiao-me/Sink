<script setup lang="ts">
const emit = defineEmits<{
  confirm: []
}>()

const open = defineModel<boolean>('open', { default: false })

function confirmClear() {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('check.dialogs.clear.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('check.dialogs.clear.description') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="confirmClear">
          {{ $t('check.dialogs.clear.action') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
