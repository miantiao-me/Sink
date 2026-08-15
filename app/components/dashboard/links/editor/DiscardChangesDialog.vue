<script setup lang="ts">
const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const open = defineModel<boolean>('open', { default: false })
let confirmed = false

function discardChanges() {
  confirmed = true
  emit('confirm')
  open.value = false
}

function updateOpen(value: boolean) {
  if (value) {
    confirmed = false
  }
  else if (!confirmed) {
    emit('cancel')
  }
  open.value = value
}
</script>

<template>
  <AlertDialog :open="open" @update:open="updateOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('links.dialogs.discard.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('links.dialogs.discard.description') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="discardChanges">
          {{ $t('links.dialogs.discard.action') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
