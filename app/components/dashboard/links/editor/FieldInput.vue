<script setup lang="ts">
import type { AnyFieldApi } from '@/types'

defineProps<{
  field: AnyFieldApi
  inputId: string
  label: string
  type?: string
  inputmode?: string
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
    <FieldLabel :for="inputId">
      {{ label }}
    </FieldLabel>
    <Input
      :id="inputId"
      :name="field.name"
      :model-value="field.state.value"
      :type="type"
      :inputmode="inputmode"
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
