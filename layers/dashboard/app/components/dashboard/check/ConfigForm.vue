<script setup lang="ts">
import type { LinkCheckConfig } from '@/types'
import { LinkCheckConfigSchema } from '#shared/schemas/link-check'
import { useForm } from '@tanstack/vue-form'

defineProps<{
  checking: boolean
  loadingLinks: boolean
  hasLinks: boolean
  hasResults: boolean
  exportDisabled: boolean
}>()

const emit = defineEmits<{
  start: [config: LinkCheckConfig]
  stop: []
  clear: []
  export: []
  reload: []
}>()

interface LinkCheckConfigFormValues {
  timeout: number | undefined
  batchSize: number | undefined
}

const defaultValues: LinkCheckConfigFormValues = {
  timeout: 6,
  batchSize: 6,
}

const form = useForm({
  defaultValues,
  onSubmit: ({ value }) => {
    emit('start', LinkCheckConfigSchema.parse(value))
  },
})

const validateTimeout = makeZodValidator(LinkCheckConfigSchema.shape.timeout)
const validateBatchSize = makeZodValidator(LinkCheckConfigSchema.shape.batchSize)
const { isInvalid, getAriaInvalid } = useFieldHelpers()

function getNumberInputValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : ''
}

function getNumberInputChangeValue(event: Event) {
  const input = event.target as HTMLInputElement
  return input.value === '' ? undefined : input.valueAsNumber
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="form.handleSubmit">
    <FieldGroup
      class="
        grid gap-4
        md:grid-cols-2
      "
    >
      <form.Field
        v-slot="{ field }"
        name="timeout"
        :validators="{ onBlur: validateTimeout, onSubmit: validateTimeout }"
      >
        <Field :data-invalid="isInvalid(field)">
          <FieldLabel :for="field.name">
            {{ $t('check.config.timeout') }}
          </FieldLabel>
          <Input
            :id="field.name"
            :name="field.name"
            type="number"
            min="1"
            max="30"
            step="1"
            :model-value="getNumberInputValue(field.state.value)"
            :aria-invalid="getAriaInvalid(field)"
            @blur="field.handleBlur"
            @input="field.handleChange(getNumberInputChangeValue($event))"
          />
          <FieldDescription>{{ $t('check.config.timeout_description') }}</FieldDescription>
          <FieldError v-if="isInvalid(field)" :errors="field.state.meta.errors" />
        </Field>
      </form.Field>

      <form.Field
        v-slot="{ field }"
        name="batchSize"
        :validators="{ onBlur: validateBatchSize, onSubmit: validateBatchSize }"
      >
        <Field :data-invalid="isInvalid(field)">
          <FieldLabel :for="field.name">
            {{ $t('check.config.batch_size') }}
          </FieldLabel>
          <Input
            :id="field.name"
            :name="field.name"
            type="number"
            min="1"
            max="10"
            step="1"
            :model-value="getNumberInputValue(field.state.value)"
            :aria-invalid="getAriaInvalid(field)"
            @blur="field.handleBlur"
            @input="field.handleChange(getNumberInputChangeValue($event))"
          />
          <FieldDescription>{{ $t('check.config.batch_size_description') }}</FieldDescription>
          <FieldError v-if="isInvalid(field)" :errors="field.state.meta.errors" />
        </Field>
      </form.Field>
    </FieldGroup>

    <div class="flex flex-wrap gap-2">
      <Button
        type="submit"
        :disabled="checking || loadingLinks || !hasLinks"
        aria-label="Start link check"
      >
        {{ checking ? $t('check.actions.checking') : $t('check.actions.start') }}
      </Button>
      <Button
        type="button"
        variant="destructive"
        :disabled="!checking"
        aria-label="Stop link check"
        @click="emit('stop')"
      >
        {{ $t('check.actions.stop') }}
      </Button>
      <Button
        type="button"
        variant="outline"
        :disabled="checking || loadingLinks"
        aria-label="Reload links"
        @click="emit('reload')"
      >
        {{ loadingLinks ? $t('check.actions.loading') : $t('check.actions.reload') }}
      </Button>
      <Button
        type="button"
        variant="outline"
        :disabled="checking || !hasResults"
        aria-label="Clear check results"
        @click="emit('clear')"
      >
        {{ $t('check.actions.clear') }}
      </Button>
      <Button
        type="button"
        variant="outline"
        :disabled="exportDisabled"
        aria-label="Export check results"
        @click="emit('export')"
      >
        {{ $t('check.actions.export') }}
      </Button>
    </div>
  </form>
</template>
