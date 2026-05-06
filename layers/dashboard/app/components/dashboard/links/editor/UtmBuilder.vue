<script setup lang="ts">
import { LinkSchema } from '#shared/schemas/link'
import { parseQuery, parseURL, withQuery } from 'ufo'
import { toast } from 'vue-sonner'

interface UtmFormValues {
  source: string
  medium: string
  campaign: string
  term: string
  content: string
}

const props = defineProps<{
  url: string
}>()

const emit = defineEmits<{
  apply: [url: string]
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()

const urlValidator = LinkSchema.shape.url
const utmValues = reactive<UtmFormValues>(createEmptyUtmValues())

const validatedUrl = computed(() => {
  const result = urlValidator.safeParse(props.url)
  return result.success ? result.data : undefined
})

const hasValidBaseUrl = computed(() => !!validatedUrl.value)

const previewUrl = computed(() => {
  if (!validatedUrl.value)
    return ''

  return applyUtmValues(validatedUrl.value, utmValues)
})

const validatedPreviewUrl = computed(() => {
  if (!previewUrl.value)
    return undefined

  const result = urlValidator.safeParse(previewUrl.value)
  return result.success ? result.data : undefined
})

watch(open, (value) => {
  if (value)
    syncUtmValues(props.url)
})

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

function applyUtmValues(url: string, values: UtmFormValues) {
  return withQuery(url, buildUtmQuery(values))
}

function syncUtmValues(url: string) {
  Object.assign(utmValues, createEmptyUtmValues())

  const result = urlValidator.safeParse(url)
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

function closeBuilder() {
  open.value = false
}

function applyBuilder() {
  if (!validatedPreviewUrl.value) {
    toast.error(t('links.form.utm_invalid_url'))
    return
  }

  emit('apply', validatedPreviewUrl.value)
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
    <div class="w-full space-y-5 px-1">
      <FieldGroup>
        <div
          class="
            grid gap-4
            md:grid-cols-2
          "
        >
          <Field>
            <FieldLabel for="utm-source">
              {{ $t('links.form.utm_source') }}
            </FieldLabel>
            <Input
              id="utm-source"
              v-model="utmValues.source"
              autofocus
              placeholder="newsletter"
              autocomplete="off"
            />
          </Field>

          <Field>
            <FieldLabel for="utm-medium">
              {{ $t('links.form.utm_medium') }}
            </FieldLabel>
            <Input
              id="utm-medium"
              v-model="utmValues.medium"
              placeholder="email"
              autocomplete="off"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel for="utm-campaign">
            {{ $t('links.form.utm_campaign') }}
          </FieldLabel>
          <Input
            id="utm-campaign"
            v-model="utmValues.campaign"
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
            <FieldLabel for="utm-term">
              {{ $t('links.form.utm_term') }}
            </FieldLabel>
            <Input
              id="utm-term"
              v-model="utmValues.term"
              placeholder="running-shoes"
              autocomplete="off"
            />
          </Field>

          <Field>
            <FieldLabel for="utm-content">
              {{ $t('links.form.utm_content') }}
            </FieldLabel>
            <Input
              id="utm-content"
              v-model="utmValues.content"
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
                rounded-md border bg-muted/50 px-3 py-3 font-mono text-xs
                leading-5 break-all
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

    <template #footer>
      <Button
        type="button"
        variant="ghost"
        class="mr-auto"
        @click="clearUtmValues"
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
        type="button"
        :disabled="!hasValidBaseUrl || !validatedPreviewUrl"
        @click="applyBuilder"
      >
        {{ $t('links.form.utm_apply') }}
      </Button>
    </template>
  </ResponsiveModal>
</template>
