<script setup lang="ts">
import type { DashboardLink } from '@/types/dashboard-links'
import { Loader2 } from '@lucide/vue'

const props = withDefaults(defineProps<{
  link?: Partial<DashboardLink>
}>(), {
  link: () => ({}),
})

const emit = defineEmits<{
  closeAutoFocus: [event: Event]
}>()

const { t } = useI18n()
const linksStore = useDashboardLinksStore()
const linksSearchStore = useDashboardLinksSearchStore()
const open = defineModel<boolean>('open', { default: false })
const isEdit = !!props.link.id
const formId = `link-editor-${useId()}`
const isSubmitting = shallowRef(false)
const isDirty = shallowRef(false)
const discardDialogOpen = shallowRef(false)
const pendingLink = shallowRef<DashboardLink | null>(null)
const discardIntent = shallowRef<'close' | 'navigate' | null>(null)
let resolveRouteLeave: ((allow: boolean) => void) | null = null

const formRef = ref<{ initializeRandomSlug: () => void } | null>(null)
const modalOpen = computed({
  get: () => open.value,
  set: (value: boolean) => {
    if (!value && isSubmitting.value)
      return
    if (!value && isDirty.value) {
      discardIntent.value = 'close'
      discardDialogOpen.value = true
      return
    }
    open.value = value
  },
})

watch(open, (isOpen) => {
  if (isOpen && !isEdit) {
    nextTick(() => {
      formRef.value?.initializeRandomSlug()
    })
  }
})

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value)
    return

  event.preventDefault()
  event.returnValue = ''
}

watch(isDirty, (dirty, _wasDirty, onCleanup) => {
  if (!dirty)
    return

  window.addEventListener('beforeunload', handleBeforeUnload)
  onCleanup(() => window.removeEventListener('beforeunload', handleBeforeUnload))
})

onBeforeUnmount(() => resolveRouteLeave?.(false))

onBeforeRouteLeave(() => {
  if (isSubmitting.value)
    return false
  if (!isDirty.value)
    return true

  return new Promise<boolean>((resolve) => {
    resolveRouteLeave?.(false)
    resolveRouteLeave = resolve
    discardIntent.value = 'navigate'
    discardDialogOpen.value = true
  })
})

function handleSuccess(link: DashboardLink) {
  pendingLink.value = link
  isDirty.value = false
  open.value = false
}

function handleClose() {
  if (isSubmitting.value)
    return

  modalOpen.value = false
}

function discardChanges() {
  isDirty.value = false
  if (discardIntent.value === 'navigate') {
    resolveRouteLeave?.(true)
    resolveRouteLeave = null
  }
  else {
    open.value = false
  }
  discardIntent.value = null
}

function keepEditing() {
  if (discardIntent.value === 'navigate') {
    resolveRouteLeave?.(false)
    resolveRouteLeave = null
  }
  discardIntent.value = null
}

function handleCloseAutoFocus(event: Event) {
  emit('closeAutoFocus', event)

  const link = pendingLink.value
  if (!link)
    return

  pendingLink.value = null
  const operation = isEdit ? 'edit' : 'create'
  linksSearchStore.syncLink(link, operation)
  linksStore.notifyLinkUpdate(link, operation)
}
</script>

<template>
  <ResponsiveModal
    v-model:open="modalOpen"
    :title="isEdit ? t('links.edit') : t('links.create')"
    :prevent-close="isSubmitting"
    @close-auto-focus="handleCloseAutoFocus"
  >
    <template v-if="!isEdit" #trigger>
      <slot>
        <Button>
          {{ $t('links.create') }}
        </Button>
      </slot>
    </template>

    <DashboardLinksEditorForm
      ref="formRef"
      :link="link"
      :is-edit="isEdit"
      :form-id="formId"
      @success="handleSuccess"
      @update:dirty="isDirty = $event"
      @update:submitting="isSubmitting = $event"
    />

    <template #footer>
      <Button
        type="button"
        variant="secondary"
        class="
          w-full
          sm:w-auto
        "
        :disabled="isSubmitting"
        @click="handleClose"
      >
        {{ $t('common.close') }}
      </Button>
      <Button
        type="submit"
        :form="formId"
        :disabled="isSubmitting || (isEdit && !isDirty)"
        :aria-busy="isSubmitting"
        class="
          w-full
          sm:w-auto
        "
      >
        <Loader2 v-if="isSubmitting" class="motion-safe:animate-spin" aria-hidden="true" />
        {{ $t('common.save') }}
      </Button>
    </template>
  </ResponsiveModal>

  <DashboardLinksEditorDiscardChangesDialog
    v-model:open="discardDialogOpen"
    @confirm="discardChanges"
    @cancel="keepEditing"
  />
</template>
