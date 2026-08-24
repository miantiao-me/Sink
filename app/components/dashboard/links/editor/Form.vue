<script setup lang="ts">
import type { DashboardLink } from '@/types/dashboard-links'
import { ExternalLink, Shuffle, Sparkles } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { nanoid, SlugSchema, UrlSchema } from '#shared/schemas/link'

const props = defineProps<{
  link: Partial<DashboardLink>
  isEdit: boolean
  formId: string
}>()

const emit = defineEmits<{
  'success': [link: DashboardLink]
  'update:dirty': [value: boolean]
  'update:submitting': [value: boolean]
}>()

const { t } = useI18n()
const linksSearchStore = useDashboardLinksSearchStore()
const requestUrl = useRequestURL()

const urlValidator = UrlSchema
const slugValidator = SlugSchema
const commentValidator = z.string().max(500).optional()
const optionalUrlValidator = z.string().trim().url().max(2048).optional().or(z.literal(''))

const generateSlug = nanoid()

const defaultValues = createLinkFormInitialValues(props.link)

const form = useForm({
  defaultValues,
  onSubmit: async ({ value }) => {
    try {
      const linkData = normalizeLinkFormSubmitPayload(value, props.isEdit)
      const { link: newLink } = await useAPI<{ link: DashboardLink }>(
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
const isSubmitting = form.useStore(state => state.isSubmitting)
const isDirty = form.useStore(state => !state.isDefaultValue)
const tagsInput = useTemplateRef<{ commit: () => boolean }>('tagsInput')

watch(isSubmitting, value => emit('update:submitting', value), { immediate: true })
watch(isDirty, value => emit('update:dirty', value), { immediate: true })

const validateUrl = makeZodValidator(urlValidator)
const validateSlug = makeZodValidator(slugValidator)
const validateComment = makeZodValidator(commentValidator)
const validateOptionalUrl = makeZodValidator(optionalUrlValidator)

const utmBuilderOpen = ref(false)
const advancedSections = ref<string[]>([])

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

function initializeRandomSlug() {
  form.reset({
    ...form.state.values,
    slug: generateSlug(),
  })
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
const currentUrl = form.useStore(state => state.values.url || '')
const duplicateLink = shallowRef<Awaited<ReturnType<typeof linksSearchStore.findDuplicateLink>>>()
let duplicateRequestGeneration = 0

const findDuplicateLink = useDebounceFn(async (url: string, generation: number) => {
  if (generation !== duplicateRequestGeneration || currentUrl.value !== url)
    return

  try {
    const match = await linksSearchStore.findDuplicateLink(url, props.link.slug)
    if (generation === duplicateRequestGeneration && currentUrl.value === url)
      duplicateLink.value = match
  }
  catch (error) {
    if (generation === duplicateRequestGeneration && currentUrl.value === url) {
      duplicateLink.value = undefined
      console.error(error)
    }
  }
}, 300)

watch(currentUrl, (url) => {
  const generation = ++duplicateRequestGeneration
  duplicateLink.value = undefined
  if (!url.trim())
    return

  void findDuplicateLink(url, generation)
}, { immediate: true })

const shortDuplicateLink = computed(() => duplicateLink.value ? `${requestUrl.origin}/${duplicateLink.value.slug}` : '')

const { previewMode } = useRuntimeConfig().public
const isExpiredLink = computed(() => Boolean(
  props.isEdit
  && props.link.expiration
  && props.link.expiration <= Math.floor(Date.now() / 1000),
))

async function applyUtmUrl(url: string) {
  form.setFieldValue('url', url)
  await form.validateField('url', 'blur')
}

function getInitialAdvancedSections() {
  const sections: string[] = []
  if (props.link.title || props.link.description || props.link.image)
    sections.push('og')
  if (props.link.google || props.link.apple)
    sections.push('device')
  if (props.link.expiration || props.link.cloaking || props.link.redirectWithQuery || props.link.password || props.link.unsafe)
    sections.push('link_settings')
  if (props.link.geo && Object.keys(props.link.geo).length)
    sections.push('geo')
  return sections
}

advancedSections.value = getInitialAdvancedSections()

async function submitForm() {
  if (tagsInput.value?.commit() === false)
    return

  await form.handleSubmit()

  const fieldOrder = ['url', 'slug', 'comment', 'google', 'apple'] as const
  const firstInvalidField = fieldOrder.find(name => Boolean(form.getFieldMeta(name)?.errors.length))
  if ((firstInvalidField === 'google' || firstInvalidField === 'apple') && !advancedSections.value.includes('device'))
    advancedSections.value = [...advancedSections.value, 'device']

  await nextTick()
  const firstError = firstInvalidField
    ? document.getElementById(`${props.formId}-${firstInvalidField}`)
    : null
  firstError?.scrollIntoView({ block: 'center' })
  firstError?.focus({ preventScroll: true })
}

defineExpose({ initializeRandomSlug })
</script>

<template>
  <form
    :id="formId"
    class="w-full space-y-6 px-1"
    :aria-busy="isSubmitting"
    @submit.prevent="submitForm"
  >
    <p
      v-if="previewMode"
      class="text-sm text-muted-foreground"
    >
      {{ $t('links.preview_mode_tip') }}
    </p>

    <Alert
      v-if="isExpiredLink"
    >
      <AlertDescription>
        {{ $t('links.form.expired_recovery') }}
      </AlertDescription>
    </Alert>

    <fieldset :disabled="isSubmitting" class="space-y-6">
      <FieldGroup>
        <form.Field
          v-slot="{ field }"
          name="url"
          :validators="{ onBlur: validateUrl, onSubmit: validateUrl }"
        >
          <Field :data-invalid="isInvalid(field)">
            <div class="flex items-center justify-between">
              <FieldLabel :for="`${formId}-${field.name}`">
                {{ $t('links.form.url') }}
              </FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="px-3 text-xs"
                :aria-label="$t('links.form.utm_builder')"
                @click="utmBuilderOpen = true"
              >
                UTM
              </Button>
            </div>
            <Input
              :id="`${formId}-${field.name}`"
              :name="field.name"
              inputmode="url"
              :model-value="field.state.value"
              :aria-invalid="getAriaInvalid(field)"
              placeholder="https://example.com"
              autocomplete="off"
              @blur="field.handleBlur"
              @input="field.handleChange(($event.target as HTMLInputElement).value)"
            />
            <FieldDescription
              v-if="!isInvalid(field) && duplicateLink"
              class="flex items-center gap-2"
            >
              <span>{{ $t('links.form.duplicate_url_hint', { shortLink: shortDuplicateLink }) }}</span>
              <NuxtLink
                :to="getDashboardLinkDetailLocation(duplicateLink.slug)"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="$t('links.form.duplicate_url_hint', { shortLink: shortDuplicateLink })"
                class="
                  inline-flex shrink-0 items-center text-primary/80 no-underline
                  hover:text-primary
                "
              >
                <ExternalLink aria-hidden="true" class="size-4" />
              </NuxtLink>
            </FieldDescription>
            <FieldError
              v-if="isInvalid(field)"
              :errors="formatErrors(field.state.meta.errors)"
            />
          </Field>
        </form.Field>

        <form.Field
          v-slot="{ field }"
          name="slug"
          :validators="{ onBlur: validateSlug, onSubmit: validateSlug }"
        >
          <Field :data-invalid="isInvalid(field)">
            <div class="flex items-center justify-between">
              <FieldLabel :for="`${formId}-${field.name}`">
                {{ $t('links.form.slug') }}
              </FieldLabel>
              <div v-if="!isEdit" class="flex space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  :aria-label="$t('links.form.generate_random_slug')"
                  @click="randomSlug"
                >
                  <Shuffle aria-hidden="true" class="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  :aria-label="$t('links.form.generate_ai_slug')"
                  :disabled="aiSlugPending"
                  @click="aiSlug"
                >
                  <Sparkles
                    aria-hidden="true"
                    class="size-4"
                    :class="{ 'motion-safe:animate-bounce': aiSlugPending }"
                  />
                </Button>
              </div>
            </div>
            <Input
              :id="`${formId}-${field.name}`"
              :name="field.name"
              :model-value="field.state.value"
              :disabled="isEdit"
              :aria-invalid="getAriaInvalid(field)"
              placeholder="my-short-link"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
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
          :validators="{ onBlur: validateComment, onSubmit: validateComment }"
        >
          <DashboardLinksEditorFieldTextarea
            :field="field"
            :input-id="`${formId}-${field.name}`"
            :label="$t('links.form.comment')"
            :invalid="isInvalid(field)"
            :aria-invalid="getAriaInvalid(field)"
            :errors="formatErrors(field.state.meta.errors)"
          />
        </form.Field>

        <form.Field v-slot="{ field }" name="tags">
          <DashboardLinksEditorTagsInput
            ref="tagsInput"
            :model-value="field.state.value"
            @update:model-value="field.handleChange"
          />
        </form.Field>
      </FieldGroup>

      <DashboardLinksEditorAdvanced
        v-model:open-sections="advancedSections"
        :form="form"
        :id-prefix="formId"
        :validate-optional-url="validateOptionalUrl"
        :is-invalid="isInvalid"
        :get-aria-invalid="getAriaInvalid"
        :format-errors="formatErrors"
        :current-slug="currentSlug"
      />
    </fieldset>
  </form>

  <DashboardLinksEditorUtmBuilderModal
    v-model:open="utmBuilderOpen"
    :id-prefix="formId"
    :url="currentUrl"
    @apply="applyUtmUrl"
  />
</template>
