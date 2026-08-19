<script setup lang="ts">
import { X } from '@lucide/vue'

const model = defineModel<string[]>({ required: true })
const { t } = useI18n()
const input = shallowRef('')
const error = shallowRef('')
const announcement = shallowRef('')
const isComposing = shallowRef(false)
const inputId = useId()
const descriptionId = useId()
const errorId = useId()

function announce(message: string) {
  announcement.value = ''
  nextTick(() => {
    announcement.value = message
  })
}

function commit(): boolean {
  if (isComposing.value)
    return false

  const tag = input.value.trim().toLowerCase()
  error.value = ''

  if (!tag)
    return true

  if (tag.length > 32) {
    error.value = t('links.form.tag_too_long')
    return false
  }

  if (model.value.includes(tag)) {
    input.value = ''
    return true
  }

  if (model.value.length >= 10) {
    error.value = t('links.form.tags_limit')
    return false
  }

  model.value = [...model.value, tag]
  input.value = ''
  announce(t('links.form.tag_added', { tag }))
  return true
}

function removeTag(index: number) {
  const tag = model.value[index]
  model.value = model.value.filter((_, tagIndex) => tagIndex !== index)
  error.value = ''
  if (tag)
    announce(t('links.form.tag_removed', { tag }))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.isComposing || isComposing.value)
    return

  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    commit()
  }
  else if (event.key === 'Backspace' && !input.value && model.value.length) {
    removeTag(model.value.length - 1)
  }
}

function handleBlur() {
  if (!isComposing.value)
    commit()
}

defineExpose({ commit })
</script>

<template>
  <Field>
    <FieldLabel :for="inputId">
      {{ $t('links.form.tags') }}
    </FieldLabel>
    <FieldDescription :id="descriptionId">
      {{ $t('links.form.tags_description') }}
    </FieldDescription>
    <div
      class="
        flex min-h-9 flex-wrap items-center gap-1.5 rounded-4xl border
        border-input bg-input/30 px-2 py-1 text-sm transition-colors
        outline-none
        focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50
      "
      :aria-invalid="error ? 'true' : undefined"
    >
      <Badge
        v-for="(tag, index) in model"
        :key="tag"
        variant="secondary"
        class="
          h-10 max-w-full gap-1 py-0 pr-1
          sm:h-5
        "
      >
        <span class="truncate">{{ tag }}</span>
        <button
          type="button"
          class="
            inline-flex size-10 items-center justify-center rounded-full
            hover:bg-muted-foreground/20
            focus-visible:ring-2 focus-visible:ring-ring
            focus-visible:outline-none
            sm:size-5
          "
          :aria-label="$t('links.form.tag_remove', { tag })"
          @click="removeTag(index)"
        >
          <X class="size-3" aria-hidden="true" />
        </button>
      </Badge>
      <input
        :id="inputId"
        v-model="input"
        type="text"
        name="tags"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        class="
          h-7 min-w-28 flex-1 bg-transparent px-1 text-base outline-none
          placeholder:text-muted-foreground
          md:text-sm
        "
        :placeholder="$t('links.form.tags_placeholder')"
        :aria-describedby="`${descriptionId} ${error ? errorId : ''}`"
        :aria-invalid="error ? 'true' : undefined"
        @blur="handleBlur"
        @compositionend="isComposing = false"
        @compositionstart="isComposing = true"
        @keydown="handleKeydown"
      >
    </div>
    <p v-if="error" :id="errorId" class="text-sm text-destructive" role="alert" aria-live="polite">
      {{ error }}
    </p>
    <p class="sr-only" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </p>
  </Field>
</template>
