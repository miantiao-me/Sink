<script setup lang="ts">
import type { AnyFieldApi } from '@/types'

defineProps<{
  field: AnyFieldApi
  label: string
  placeholder?: string
  invalid?: boolean
  ariaInvalid?: string
  errors?: string[]
}>()
</script>

<template>
  <Field :data-invalid="invalid || undefined">
    <FieldLabel :for="field.name">
      {{ label }}
    </FieldLabel>
    <Textarea
      :id="field.name"
      :name="field.name"
      :model-value="field.state.value"
      :aria-invalid="ariaInvalid"
      :placeholder="placeholder"
      @blur="field.handleBlur"
      @input="field.handleChange(($event.target as HTMLTextAreaElement).value)"
    />
    <FieldError
      v-if="invalid"
      :errors="errors"
    />
  </Field>
</template>
