<script setup lang="ts">
import { LogOut } from '@lucide/vue'

withDefaults(defineProps<{
  showTrigger?: boolean
}>(), {
  showTrigger: true,
})

const emit = defineEmits<{
  closeAutoFocus: [event: Event]
}>()

const slots = defineSlots<{
  trigger?: () => any
}>()

const open = defineModel<boolean>('open', { default: false })
const { authMethod, accessEnabled, clearAuthSession } = useAuthSession()

function logOut() {
  const method = authMethod.value || (getAuthToken() ? 'site-token' : 'access-user')
  const shouldLogoutAccess = accessEnabled.value || method === 'access-user' || method === 'access-service'
  removeAuthToken()
  clearAuthSession()

  if (shouldLogoutAccess) {
    window.location.assign('/cdn-cgi/access/logout')
    return
  }

  navigateTo('/dashboard/login')
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogTrigger v-if="slots.trigger || showTrigger" as-child>
      <slot v-if="slots.trigger" name="trigger" />
      <Button
        v-else
        type="button"
        variant="ghost"
        size="icon-lg"
        :aria-label="$t('logout.action')"
      >
        <LogOut aria-hidden="true" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent @close-auto-focus="emit('closeAutoFocus', $event)">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('logout.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('logout.confirm') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="logOut">
          {{ $t('logout.action') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
