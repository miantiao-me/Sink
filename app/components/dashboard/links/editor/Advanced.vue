<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { DeepKeys, DeepValue, Updater } from '@tanstack/vue-form'
import type { Component } from 'vue'
import type { AnyFieldApi } from '@/types'
import type { DashboardLinkFormData } from '@/types/dashboard-links'
import { today } from '@internationalized/date'
import { CalendarIcon, Plus, Sparkles, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { isMaskedLinkPassword, LINK_PASSWORD_MASK_PREFIX } from '#shared/utils/link-password'
import { cn } from '@/lib/utils'

const props = defineProps<{
  form: {
    Field: Component
    getFieldValue: <TField extends DeepKeys<DashboardLinkFormData>>(name: TField) => DeepValue<DashboardLinkFormData, TField>
    setFieldValue: <TField extends DeepKeys<DashboardLinkFormData>>(name: TField, updater: Updater<DeepValue<DashboardLinkFormData, TField>>) => void
  }
  idPrefix: string
  validateOptionalUrl: (ctx: { value: string }) => string | undefined
  isInvalid: (field: AnyFieldApi) => boolean
  getAriaInvalid: (field: AnyFieldApi) => string | undefined
  formatErrors: (errors: unknown[]) => string[]
  currentSlug: string
}>()
const openSections = defineModel<string[]>('openSections', { default: () => [] })

const datePickerOpen = ref(false)
const { t, locale } = useI18n()

type GeoRoute = DashboardLinkFormData['geo'][number]

function updateGeoRoute(routes: GeoRoute[], index: number | string, value: Partial<GeoRoute>) {
  const targetIndex = Number(index)
  return routes.map((route, routeIndex) => routeIndex === targetIndex ? { ...route, ...value } : route)
}

function removeGeoRoute(routes: GeoRoute[], index: number | string) {
  const targetIndex = Number(index)
  return routes.filter((_, routeIndex) => routeIndex !== targetIndex)
}

function formatPasswordDisplay(password: string) {
  return isMaskedLinkPassword(password)
    ? password.replace(LINK_PASSWORD_MASK_PREFIX, '')
    : password
}

const aiOgPending = ref(false)
async function aiOg() {
  const url = props.form.getFieldValue('url') as string
  if (!url) {
    return
  }

  aiOgPending.value = true
  try {
    const result = await useAPI<{ title?: string, description?: string }>('/api/link/og-ai', {
      query: { url },
    })

    if (result.title) {
      props.form.setFieldValue('title', result.title)
    }
    if (result.description) {
      props.form.setFieldValue('description', result.description)
    }
    toast.success(t('links.ai_og_success'))
  }
  catch (error) {
    console.error(error)
    toast.error(t('links.ai_og_failed'), {
      description: error instanceof Error ? error.message : String(error),
    })
  }
  finally {
    aiOgPending.value = false
  }
}
</script>

<template>
  <Accordion v-model="openSections" type="multiple" class="w-full">
    <AccordionItem value="link_settings">
      <AccordionTrigger>
        {{ $t('links.form.link_settings') }}
      </AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field v-slot="{ field }" name="redirectWithQuery">
            <DashboardLinksEditorFieldSwitch
              :id="`${idPrefix}-${field.name}`"
              :model-value="field.state.value"
              :label="$t('links.form.redirect_with_query_label')"
              :description="$t('links.form.redirect_with_query_description')"
              @update:model-value="field.handleChange"
            />
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="cloaking">
            <DashboardLinksEditorFieldSwitch
              :id="`${idPrefix}-${field.name}`"
              :model-value="field.state.value"
              :label="$t('links.form.cloaking_label')"
              :description="$t('links.form.cloaking_description')"
              @update:model-value="field.handleChange"
            />
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="unsafe">
            <DashboardLinksEditorFieldSwitch
              :id="`${idPrefix}-${field.name}`"
              :model-value="field.state.value"
              :label="$t('links.form.unsafe_label')"
              :description="$t('links.form.unsafe_description')"
              @update:model-value="field.handleChange"
            />
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="expiration">
            <Field :data-invalid="isInvalid(field)">
              <FieldLabel :for="`${idPrefix}-${field.name}`">
                {{ $t('links.form.expiration') }}
              </FieldLabel>
              <FieldDescription>
                {{ $t('links.form.expiration_description') }}
              </FieldDescription>
              <Popover v-model:open="datePickerOpen">
                <PopoverTrigger as-child>
                  <Button
                    :id="`${idPrefix}-${field.name}`"
                    variant="outline"
                    :class="cn(
                      'w-full justify-start text-left',
                      !field.state.value && 'text-muted-foreground',
                    )"
                  >
                    <CalendarIcon aria-hidden="true" class="mr-2 size-4" />
                    {{
                      field.state.value
                        ? field.state.value.toDate(getTimeZone()).toLocaleDateString(locale)
                        : $t('links.form.pick_date')
                    }}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                  <Calendar
                    :model-value="field.state.value"
                    :default-placeholder="today(getTimeZone())"
                    :min-value="today(getTimeZone())"
                    layout="month-and-year"
                    initial-focus
                    @update:model-value="(v: DateValue | undefined) => {
                      field.handleChange(v)
                      datePickerOpen = false
                    }"
                  />
                </PopoverContent>
              </Popover>
              <Button
                v-if="field.state.value"
                type="button"
                variant="ghost"
                size="sm"
                @click="field.handleChange(undefined)"
              >
                {{ $t('links.form.clear_expiration') }}
              </Button>
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="password">
            <Field>
              <FieldLabel :for="`${idPrefix}-${field.name}`">
                {{ $t('links.form.password_label') }}
              </FieldLabel>
              <FieldDescription>
                {{ $t('links.form.password_description') }}
              </FieldDescription>
              <Input
                :id="`${idPrefix}-${field.name}`"
                :name="field.name"
                :model-value="formatPasswordDisplay(field.state.value)"
                :placeholder="$t('links.form.password_placeholder')"
                :type="isMaskedLinkPassword(field.state.value) ? 'text' : 'password'"
                autocomplete="off"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="og">
      <AccordionTrigger>
        {{ $t('links.form.og_settings') }}
      </AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field v-slot="{ field }" name="title">
            <Field>
              <div class="flex items-center justify-between">
                <FieldLabel :for="`${idPrefix}-${field.name}`">
                  {{ $t('links.form.og_title') }}
                </FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  :aria-label="$t('links.form.ai_og_generate')"
                  :disabled="aiOgPending"
                  @click="aiOg"
                >
                  <Sparkles
                    aria-hidden="true"
                    class="size-4"
                    :class="{ 'motion-safe:animate-bounce': aiOgPending }"
                  />
                </Button>
              </div>
              <Input
                :id="`${idPrefix}-${field.name}`"
                :name="field.name"
                :model-value="field.state.value"
                :placeholder="$t('links.form.og_title_placeholder')"
                autocomplete="off"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
            </Field>
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="description">
            <DashboardLinksEditorFieldTextarea
              :field="field"
              :input-id="`${idPrefix}-${field.name}`"
              :label="$t('links.form.og_description')"
              :placeholder="$t('links.form.og_description_placeholder')"
            />
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="image">
            <Field>
              <FieldLabel :for="`${idPrefix}-${field.name}`">
                {{ $t('links.form.og_image') }}
              </FieldLabel>
              <DashboardLinksEditorImageUploader
                :model-value="field.state.value"
                :slug="currentSlug"
                :input-id="`${idPrefix}-${field.name}`"
                @update:model-value="field.handleChange($event || '')"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="device">
      <AccordionTrigger>
        {{ $t('links.form.device_redirect') }}
      </AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field
            v-slot="{ field }"
            name="google"
            :validators="{ onBlur: validateOptionalUrl, onSubmit: validateOptionalUrl }"
          >
            <DashboardLinksEditorFieldInput
              :field="field"
              :input-id="`${idPrefix}-${field.name}`"
              :label="$t('links.form.google_play')"
              placeholder="https://play.google.com/store/apps/…"
              inputmode="url"
              autocomplete="off"
              :invalid="isInvalid(field)"
              :aria-invalid="getAriaInvalid(field)"
              :errors="formatErrors(field.state.meta.errors)"
            />
          </props.form.Field>

          <props.form.Field
            v-slot="{ field }"
            name="apple"
            :validators="{ onBlur: validateOptionalUrl, onSubmit: validateOptionalUrl }"
          >
            <DashboardLinksEditorFieldInput
              :field="field"
              :input-id="`${idPrefix}-${field.name}`"
              :label="$t('links.form.app_store')"
              placeholder="https://apps.apple.com/app/…"
              inputmode="url"
              autocomplete="off"
              :invalid="isInvalid(field)"
              :aria-invalid="getAriaInvalid(field)"
              :errors="formatErrors(field.state.meta.errors)"
            />
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="geo">
      <AccordionTrigger>
        {{ $t('links.form.geo_routing') }}
      </AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field v-slot="{ field }" name="geo">
            <div class="space-y-2">
              <div
                v-for="(item, i) in field.state.value" :key="i" class="
                  flex flex-col gap-2
                  sm:flex-row sm:items-start
                "
              >
                <Field
                  class="
                    w-full
                    sm:w-56
                  "
                >
                  <FieldLabel
                    :for="`${idPrefix}-geo-country-${i}`" class="sr-only"
                  >
                    {{ $t('links.form.select_country') }}
                  </FieldLabel>
                  <DashboardLinksEditorCountrySelect
                    :id="`${idPrefix}-geo-country-${i}`"
                    :model-value="item.country"
                    :placeholder="$t('links.form.select_country')"
                    :search-placeholder="$t('links.form.search_country')"
                    :empty-text="$t('links.form.no_country_found')"
                    @update:model-value="field.handleChange(updateGeoRoute(field.state.value, i, { country: $event }))"
                  />
                </Field>
                <Field class="flex-1">
                  <FieldLabel :for="`${idPrefix}-geo-url-${i}`" class="sr-only">
                    {{ $t('links.form.url') }}
                  </FieldLabel>
                  <Input
                    :id="`${idPrefix}-geo-url-${i}`"
                    :name="`geo.${i}.url`"
                    :model-value="item.url"
                    inputmode="url"
                    placeholder="https://..."
                    autocomplete="off"
                    @input="field.handleChange(updateGeoRoute(field.state.value, i, { url: ($event.target as HTMLInputElement).value }))"
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  :aria-label="$t('common.delete')"
                  @click="field.handleChange(removeGeoRoute(field.state.value, i))"
                >
                  <Trash2
                    aria-hidden="true" class="size-4 text-muted-foreground"
                  />
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" @click="field.handleChange([...field.state.value, { country: '', url: '' }])">
                <Plus aria-hidden="true" class="mr-2 size-4" /> {{ $t('links.form.add_geo_route') }}
              </Button>
            </div>
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
