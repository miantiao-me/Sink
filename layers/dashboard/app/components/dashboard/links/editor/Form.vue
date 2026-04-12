<script setup lang="ts">
import type { AnyFieldApi, Link, LinkFormData } from '@/types'
import { LinkSchema, nanoid } from '#shared/schemas/link'
import { useForm } from '@tanstack/vue-form'
import { Shuffle, Sparkles } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const props = defineProps<{
  link: Partial<Link>
  isEdit: boolean
}>()

const emit = defineEmits<{
  success: [link: Link]
}>()

const { t } = useI18n()

const urlValidator = LinkSchema.shape.url
const slugValidator = LinkSchema.shape.slug
const commentValidator = z.string().max(500).optional()
const optionalUrlValidator = z.string().trim().url().max(2048).optional().or(z.literal(''))

const generateSlug = nanoid()

const form = useForm({
  defaultValues: {
    url: props.link.url ?? '',
    slug: props.link.slug ?? '',
    comment: props.link.comment ?? '',
    expiration: props.link.expiration
      ? unix2date(props.link.expiration)
      : undefined,
    google: props.link.google ?? '',
    apple: props.link.apple ?? '',
    title: props.link.title ?? '',
    description: props.link.description ?? '',
    image: props.link.image ?? '',
    cloaking: props.link.cloaking ?? false,
    redirectWithQuery: props.link.redirectWithQuery ?? false,
    password: props.link.password ?? '',
    unsafe: props.link.unsafe ?? false,
  } satisfies LinkFormData,
  onSubmit: async ({ value }) => {
    try {
      const linkData = {
        url: value.url,
        slug: value.slug,
        comment: value.comment || undefined,
        expiration: value.expiration
          ? date2unix(value.expiration, 'end')
          : undefined,
        google: value.google || undefined,
        apple: value.apple || undefined,
        title: value.title || undefined,
        description: value.description || undefined,
        image: value.image || undefined,
        cloaking: value.cloaking,
        redirectWithQuery: value.redirectWithQuery,
        password: value.password || undefined,
        unsafe: value.unsafe || undefined,
      }
      const { link: newLink } = await useAPI<{ link: Link }>(
        props.isEdit ? '/api/link/edit' : '/api/link/create',
        {
          method: props.isEdit ? 'PUT' : 'POST',
          body: linkData,
        },
      )
      emit('success', newLink)
      toast(props.isEdit ? t('links.update_success') : t('links.create_success'))
    }
    catch (error) {
      console.error(error)
      toast.error(props.isEdit ? t('links.update_failed') : t('links.create_failed'), {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  },
})

function makeValidator<T>(schema: z.ZodSchema<T>) {
  return ({ value }: { value: T }) => {
    const result = schema.safeParse(value)
    return result.success ? undefined : result.error.errors[0]?.message
  }
}

const validateUrl = makeValidator(urlValidator)
const validateSlug = makeValidator(slugValidator)
const validateComment = makeValidator(commentValidator)
const validateOptionalUrl = makeValidator(optionalUrlValidator)

function isInvalid(field: AnyFieldApi) {
  return field.state.meta.isTouched && !field.state.meta.isValid
}

function getAriaInvalid(field: AnyFieldApi) {
  return isInvalid(field) ? 'true' : undefined
}

function formatErrors(errors: unknown[]): string[] {
  return errors
    .map((e) => {
      if (typeof e === 'string')
        return e
      if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string')
        return e.message
      return null
    })
    .filter((m): m is string => m !== null)
}

function randomSlug() {
  form.setFieldValue('slug', generateSlug())
}

const aiSlugPending = ref(false)
async function aiSlug() {
  const url = form.getFieldValue('url')
  if (!url)
    return

  aiSlugPending.value = true
  try {
    const result = await useAPI<{ slug: string }>('/api/link/ai', {
      query: { url },
    })
    form.setFieldValue('slug', result.slug)
  }
  catch (error) {
    console.error(error)
    toast.error(t('links.ai_slug_failed'), {
      description: error instanceof Error ? error.message : String(error),
    })
  }
  finally {
    aiSlugPending.value = false
  }
}

const currentSlug = form.useStore(state => state.values.slug || '')

const { previewMode } = useRuntimeConfig().public

defineExpose({ randomSlug })
</script>

<template>
  <form
    id="link-editor-form"
    class="w-full space-y-4 px-1"
    @submit.prevent="form.handleSubmit"
  >
    <p
      v-if="previewMode"
      class="text-sm text-muted-foreground"
    >
      {{ $t('links.preview_mode_tip') }}
    </p>

    <FieldGroup>
      <form.Field
        v-slot="{ field }"
        name="url"
        :validators="{ onBlur: validateUrl }"
      >
        <Field :data-invalid="isInvalid(field)">
          <FieldLabel :for="field.name">
            {{ $t('links.form.url') }}
          </FieldLabel>
          <Input
            :id="field.name"
            :name="field.name"
            :model-value="field.state.value"
            :aria-invalid="getAriaInvalid(field)"
            placeholder="https://example.com"
            autocomplete="url"
            @blur="field.handleBlur"
            @input="field.handleChange(($event.target as HTMLInputElement).value)"
          />
          <FieldError
            v-if="isInvalid(field)"
            :errors="formatErrors(field.state.meta.errors)"
          />
        </Field>
      </form.Field>

      <form.Field
        v-slot="{ field }"
        name="slug"
        :validators="{ onBlur: validateSlug }"
      >
        <Field :data-invalid="isInvalid(field)">
          <div class="flex items-center justify-between">
            <FieldLabel :for="field.name">
              {{ $t('links.form.slug') }}
            </FieldLabel>
            <div v-if="!isEdit" class="flex space-x-3">
              <Button
                variant="ghost"
                size="icon"
                class="h-auto w-auto p-0"
                aria-label="Generate random slug"
                @click="randomSlug"
              >
                <Shuffle class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-auto w-auto p-0"
                aria-label="Generate AI slug"
                :disabled="aiSlugPending"
                @click="aiSlug"
              >
                <Sparkles
                  class="h-4 w-4"
                  :class="{ 'animate-bounce': aiSlugPending }"
                />
              </Button>
            </div>
          </div>
          <Input
            :id="field.name"
            :name="field.name"
            :model-value="field.state.value"
            :disabled="isEdit"
            :aria-invalid="getAriaInvalid(field)"
            placeholder="my-short-link"
            autocomplete="off"
            @blur="field.handleBlur"
            @input="field.handleChange(($event.target as HTMLInputElement).value)"
          />
          <FieldError
            v-if="isInvalid(field)"
            :errors="formatErrors(field.state.meta.errors)"
          />
        </Field>
      </form.Field>

      <form.Field
        v-slot="{ field }"
        name="comment"
        :validators="{ onBlur: validateComment }"
      >
        <Field :data-invalid="isInvalid(field)">
          <FieldLabel :for="field.name">
            {{ $t('links.form.comment') }}
          </FieldLabel>
          <Textarea
            :id="field.name"
            :name="field.name"
            :model-value="field.state.value"
            :aria-invalid="getAriaInvalid(field)"
            @blur="field.handleBlur"
            @input="field.handleChange(($event.target as HTMLTextAreaElement).value)"
          />
          <FieldError
            v-if="isInvalid(field)"
            :errors="formatErrors(field.state.meta.errors)"
          />
        </Field>
      </form.Field>
    </FieldGroup>

    <DashboardLinksEditorAdvanced
      :form="form"
      :validate-optional-url="validateOptionalUrl"
      :is-invalid="isInvalid"
      :get-aria-invalid="getAriaInvalid"
      :format-errors="formatErrors"
      :current-slug="currentSlug"
    />
  </form>
</template>
