<script setup lang="ts">
import type { Link } from '@/types'

const props = withDefaults(defineProps<{
  link?: Partial<Link>
}>(), {
  link: () => ({}),
})

const { t } = useI18n()
const linksStore = useDashboardLinksStore()
const dialogOpen = ref(false)
const isEdit = !!props.link.id

const formRef = ref<{ randomSlug: () => void } | null>(null)

watch(dialogOpen, (open) => {
  if (open && !isEdit) {
    nextTick(() => {
      formRef.value?.randomSlug()
    })
  }
})

function handleSuccess(link: Link) {
  dialogOpen.value = false
  linksStore.notifyLinkUpdate(link, isEdit ? 'edit' : 'create')
}

function handleClose() {
  dialogOpen.value = false
}
</script>

<template>
  <ResponsiveModal
    v-model:open="dialogOpen"
    :title="isEdit ? t('links.edit') : t('links.create')"
  >
    <template #trigger>
      <slot>
        <Button class="md:ml-2" variant="outline">
          {{ $t('links.create') }}
        </Button>
      </slot>
    </template>

    <DashboardLinksEditorForm
      ref="formRef"
      :link="link"
      :is-edit="isEdit"
      @success="handleSuccess"
    />

    <template #footer>
      <Button
        type="button"
        variant="secondary"
        @click="handleClose"
      >
        {{ $t('common.close') }}
      </Button>
      <Button type="submit" form="link-editor-form">
        {{ $t('common.save') }}
      </Button>
    </template>
  </ResponsiveModal>
</template>
