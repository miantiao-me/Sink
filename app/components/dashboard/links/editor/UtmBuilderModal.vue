<script setup lang="ts">
const props = defineProps<{
  url: string
  idPrefix: string
}>()

const emit = defineEmits<{
  apply: [url: string]
}>()

const open = defineModel<boolean>('open', { default: false })
const canApply = shallowRef(false)
const formId = `${props.idPrefix}-utm-builder`

watch(open, (value) => {
  if (!value)
    canApply.value = false
})

function closeBuilder() {
  open.value = false
}

function applyBuilder(url: string) {
  emit('apply', url)
  closeBuilder()
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    :title="$t('links.form.utm_builder')"
    :description="$t('links.form.utm_description')"
    content-class="md:max-w-xl"
  >
    <DashboardLinksEditorUtmBuilderForm
      v-if="open"
      :form-id="formId"
      :url="url"
      @apply="applyBuilder"
      @update:can-apply="canApply = $event"
    />

    <template #footer>
      <Button
        type="reset"
        :form="formId"
        variant="ghost"
        class="mr-auto"
      >
        {{ $t('links.form.utm_clear') }}
      </Button>
      <Button
        type="button"
        variant="secondary"
        @click="closeBuilder"
      >
        {{ $t('common.close') }}
      </Button>
      <Button
        type="submit"
        :form="formId"
        :disabled="!canApply"
      >
        {{ $t('links.form.utm_apply') }}
      </Button>
    </template>
  </ResponsiveModal>
</template>
