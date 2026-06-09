<script setup lang="ts">
import type { AnyFieldApi } from '@/types'

defineProps<{
  field: AnyFieldApi
  label: string
  type?: string
  placeholder?: string
  autocomplete?: string
  disabled?: boolean
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
    <Input
      :id="field.name"
      :name="field.name"
      :model-value="field.state.value"
      :type="type"
      :disabled="disabled"
      :aria-invalid="ariaInvalid"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      @blur="field.handleBlur"
      @input="field.handleChange(($event.target as HTMLInputElement).value)"
    />
    <FieldError
      v-if="invalid"
      :errors="errors"
    />
  </Field>
</template>
