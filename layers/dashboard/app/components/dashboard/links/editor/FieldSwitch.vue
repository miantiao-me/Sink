<script setup lang="ts">
defineProps<{
  id: string
  modelValue?: boolean
  label: string
  description?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <Field orientation="horizontal">
    <FieldContent>
      <FieldLabel :for="id">
        {{ label }}
      </FieldLabel>
      <FieldDescription v-if="description" class="text-xs">
        {{ description }}
      </FieldDescription>
    </FieldContent>
    <Switch
      :id="id"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </Field>
</template>
