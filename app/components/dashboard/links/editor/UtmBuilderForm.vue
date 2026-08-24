<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { parseQuery, parseURL, withQuery } from 'ufo'
import { toast } from 'vue-sonner'
import { UrlSchema } from '#shared/schemas/link'

interface UtmFormValues {
  source: string
  medium: string
  campaign: string
  term: string
  content: string
}

const props = defineProps<{
  url: string
  formId: string
}>()

const emit = defineEmits<{
  'apply': [url: string]
  'update:canApply': [value: boolean]
}>()

const { t } = useI18n()
const isDesktop = useMediaQuery('(min-width: 640px)')
const utmValues = reactive<UtmFormValues>(createEmptyUtmValues())

const validatedUrl = computed(() => {
  const result = UrlSchema.safeParse(props.url)
  return result.success ? result.data : undefined
})

const previewUrl = computed(() => {
  if (!validatedUrl.value)
    return ''

  return withQuery(validatedUrl.value, buildUtmQuery(utmValues))
})

const validatedPreviewUrl = computed(() => {
  if (!previewUrl.value)
    return undefined

  const result = UrlSchema.safeParse(previewUrl.value)
  return result.success ? result.data : undefined
})

const canApply = computed(() => Boolean(validatedUrl.value && validatedPreviewUrl.value))

watch(canApply, value => emit('update:canApply', value), { immediate: true })

syncUtmValues(props.url)

function createEmptyUtmValues(): UtmFormValues {
  return {
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
  }
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function normalizeUtmValue(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

function buildUtmQuery(values: UtmFormValues) {
  return {
    utm_source: normalizeUtmValue(values.source),
    utm_medium: normalizeUtmValue(values.medium),
    utm_campaign: normalizeUtmValue(values.campaign),
    utm_term: normalizeUtmValue(values.term),
    utm_content: normalizeUtmValue(values.content),
  }
}

function syncUtmValues(url: string) {
  Object.assign(utmValues, createEmptyUtmValues())

  const result = UrlSchema.safeParse(url)
  if (!result.success)
    return

  const { search } = parseURL(result.data)
  const query = parseQuery(search)

  utmValues.source = getQueryValue(query.utm_source)
  utmValues.medium = getQueryValue(query.utm_medium)
  utmValues.campaign = getQueryValue(query.utm_campaign)
  utmValues.term = getQueryValue(query.utm_term)
  utmValues.content = getQueryValue(query.utm_content)
}

function clearUtmValues() {
  Object.assign(utmValues, createEmptyUtmValues())
}

function submitForm() {
  if (!validatedPreviewUrl.value) {
    toast.error(t('links.form.utm_invalid_url'))
    return
  }

  emit('apply', validatedPreviewUrl.value)
}
</script>

<template>
  <form
    :id="formId"
    class="w-full"
    @submit.prevent="submitForm"
    @reset.prevent="clearUtmValues"
  >
    <div class="w-full space-y-5 px-1">
      <FieldGroup>
        <div
          class="
            grid gap-4
            md:grid-cols-2
          "
        >
          <Field>
            <FieldLabel :for="`${formId}-utm-source`">
              {{ $t('links.form.utm_source') }}
            </FieldLabel>
            <Input
              :id="`${formId}-utm-source`"
              v-model="utmValues.source"
              name="utm_source"
              :autofocus="isDesktop"
              placeholder="newsletter"
              autocomplete="off"
            />
          </Field>

          <Field>
            <FieldLabel :for="`${formId}-utm-medium`">
              {{ $t('links.form.utm_medium') }}
            </FieldLabel>
            <Input
              :id="`${formId}-utm-medium`"
              v-model="utmValues.medium"
              name="utm_medium"
              placeholder="email"
              autocomplete="off"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel :for="`${formId}-utm-campaign`">
            {{ $t('links.form.utm_campaign') }}
          </FieldLabel>
          <Input
            :id="`${formId}-utm-campaign`"
            v-model="utmValues.campaign"
            name="utm_campaign"
            placeholder="spring_sale"
            autocomplete="off"
          />
        </Field>

        <div
          class="
            grid gap-4
            md:grid-cols-2
          "
        >
          <Field>
            <FieldLabel :for="`${formId}-utm-term`">
              {{ $t('links.form.utm_term') }}
            </FieldLabel>
            <Input
              :id="`${formId}-utm-term`"
              v-model="utmValues.term"
              name="utm_term"
              placeholder="running-shoes"
              autocomplete="off"
            />
          </Field>

          <Field>
            <FieldLabel :for="`${formId}-utm-content`">
              {{ $t('links.form.utm_content') }}
            </FieldLabel>
            <Input
              :id="`${formId}-utm-content`"
              v-model="utmValues.content"
              name="utm_content"
              placeholder="hero_button"
              autocomplete="off"
            />
          </Field>
        </div>

        <Field>
          <div class="space-y-2">
            <FieldLabel>{{ $t('links.form.utm_preview') }}</FieldLabel>
            <div
              class="
                rounded-md border bg-muted/50 p-3 font-mono text-xs/5 break-all
                sm:text-sm
              "
              :class="!previewUrl && 'text-muted-foreground'"
            >
              {{ previewUrl || $t('links.form.utm_invalid_url') }}
            </div>
          </div>
        </Field>
      </FieldGroup>
    </div>
  </form>
</template>
