<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { Component } from 'vue'
import type { AnyFieldApi, LinkFormData } from '@/types'
import { isMaskedLinkPassword, LINK_PASSWORD_MASK_PREFIX } from '#shared/utils/link-password'
import { today } from '@internationalized/date'
import { CalendarIcon, Plus, Sparkles, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { cn } from '@/lib/utils'

const props = defineProps<{
  form: {
    Field: Component
    getFieldValue: (name: keyof LinkFormData) => LinkFormData[keyof LinkFormData]
    setFieldValue: (name: keyof LinkFormData, value: any) => void
  }
  validateOptionalUrl: (ctx: { value: string }) => string | undefined
  isInvalid: (field: AnyFieldApi) => boolean
  getAriaInvalid: (field: AnyFieldApi) => string | undefined
  formatErrors: (errors: unknown[]) => string[]
  currentSlug: string
}>()

const datePickerOpen = ref(false)
const { t, locale } = useI18n()
const accordionTriggerClass = 'hover:no-underline'

type GeoRoute = LinkFormData['geo'][number]

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

// Compute default open items based on existing values
const defaultOpenItems = computed(() => {
  const items: string[] = []
  if (props.form.getFieldValue('title') || props.form.getFieldValue('description') || props.form.getFieldValue('image')) {
    items.push('og')
  }
  if (props.form.getFieldValue('google') || props.form.getFieldValue('apple')) {
    items.push('device')
  }
  if (props.form.getFieldValue('expiration') || props.form.getFieldValue('cloaking') || props.form.getFieldValue('redirectWithQuery') || props.form.getFieldValue('password') || props.form.getFieldValue('unsafe')) {
    items.push('link_settings')
  }
  const geoVal = props.form.getFieldValue('geo')
  if (Array.isArray(geoVal) && geoVal.length > 0) {
    items.push('geo')
  }
  return items
})

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
  <Accordion type="multiple" :default-value="defaultOpenItems" class="w-full">
    <AccordionItem value="link_settings">
      <AccordionTrigger :class="accordionTriggerClass">
        {{ $t('links.form.link_settings') }}
      </AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field v-slot="{ field }" name="redirectWithQuery">
            <DashboardLinksEditorFieldSwitch
              :id="field.name"
              :model-value="field.state.value"
              :label="$t('links.form.redirect_with_query_label')"
              :description="$t('links.form.redirect_with_query_description')"
              @update:model-value="field.handleChange"
            />
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="cloaking">
            <DashboardLinksEditorFieldSwitch
              :id="field.name"
              :model-value="field.state.value"
              :label="$t('links.form.cloaking_label')"
              :description="$t('links.form.cloaking_description')"
              @update:model-value="field.handleChange"
            />
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="unsafe">
            <DashboardLinksEditorFieldSwitch
              :id="field.name"
              :model-value="field.state.value"
              :label="$t('links.form.unsafe_label')"
              :description="$t('links.form.unsafe_description')"
              @update:model-value="field.handleChange"
            />
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="expiration">
            <Field :data-invalid="isInvalid(field)">
              <FieldLabel :for="field.name">
                {{ $t('links.form.expiration') }}
              </FieldLabel>
              <FieldDescription class="text-xs">
                {{ $t('links.form.expiration_description') }}
              </FieldDescription>
              <Popover v-model:open="datePickerOpen">
                <PopoverTrigger as-child>
                  <Button
                    :id="field.name"
                    variant="outline"
                    :class="cn(
                      'w-full justify-start text-left font-normal',
                      !field.state.value && 'text-muted-foreground',
                    )"
                  >
                    <CalendarIcon class="mr-2 h-4 w-4" />
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
                    layout="month-and-year"
                    initial-focus
                    @update:model-value="(v: DateValue | undefined) => {
                      field.handleChange(v)
                      datePickerOpen = false
                    }"
                  />
                </PopoverContent>
              </Popover>
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="password">
            <Field>
              <FieldLabel :for="field.name">
                {{ $t('links.form.password_label') }}
              </FieldLabel>
              <FieldDescription class="text-xs">
                {{ $t('links.form.password_description') }}
              </FieldDescription>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="formatPasswordDisplay(field.state.value)"
                :placeholder="$t('links.form.password_placeholder')"
                :type="isMaskedLinkPassword(field.state.value) ? 'text' : 'password'"
                autocomplete="off"
                class="mt-1.5"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="og">
      <AccordionTrigger :class="accordionTriggerClass">
        {{ $t('links.form.og_settings') }}
      </AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field v-slot="{ field }" name="title">
            <Field>
              <div class="flex items-center justify-between">
                <FieldLabel :for="field.name">
                  {{ $t('links.form.og_title') }}
                </FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="h-auto w-auto p-0"
                  :aria-label="$t('links.form.ai_og_generate')"
                  :disabled="aiOgPending"
                  @click="aiOg"
                >
                  <Sparkles
                    class="h-4 w-4"
                    :class="{ 'animate-bounce': aiOgPending }"
                  />
                </Button>
              </div>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :placeholder="$t('links.form.og_title_placeholder')"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
            </Field>
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="description">
            <DashboardLinksEditorFieldTextarea
              :field="field"
              :label="$t('links.form.og_description')"
              :placeholder="$t('links.form.og_description_placeholder')"
            />
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="image">
            <Field>
              <FieldLabel :for="field.name">
                {{ $t('links.form.og_image') }}
              </FieldLabel>
              <DashboardLinksEditorImageUploader
                :model-value="field.state.value"
                :slug="currentSlug"
                @update:model-value="field.handleChange($event || '')"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="device">
      <AccordionTrigger :class="accordionTriggerClass">
        {{ $t('links.form.device_redirect') }}
      </AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field
            v-slot="{ field }"
            name="google"
            :validators="{ onBlur: validateOptionalUrl }"
          >
            <DashboardLinksEditorFieldInput
              :field="field"
              :label="$t('links.form.google_play')"
              placeholder="https://play.google.com/store/apps/…"
              autocomplete="off"
              :invalid="isInvalid(field)"
              :aria-invalid="getAriaInvalid(field)"
              :errors="formatErrors(field.state.meta.errors)"
            />
          </props.form.Field>

          <props.form.Field
            v-slot="{ field }"
            name="apple"
            :validators="{ onBlur: validateOptionalUrl }"
          >
            <DashboardLinksEditorFieldInput
              :field="field"
              :label="$t('links.form.app_store')"
              placeholder="https://apps.apple.com/app/…"
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
      <AccordionTrigger :class="accordionTriggerClass">
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
                  <DashboardLinksEditorCountrySelect
                    :model-value="item.country"
                    :placeholder="$t('links.form.select_country')"
                    :search-placeholder="$t('links.form.search_country')"
                    :empty-text="$t('links.form.no_country_found')"
                    @update:model-value="field.handleChange(updateGeoRoute(field.state.value, i, { country: $event }))"
                  />
                </Field>
                <Field class="flex-1">
                  <Input
                    :model-value="item.url"
                    placeholder="https://..."
                    autocomplete="url"
                    @input="field.handleChange(updateGeoRoute(field.state.value, i, { url: ($event.target as HTMLInputElement).value }))"
                  />
                </Field>
                <Button type="button" variant="ghost" size="icon" @click="field.handleChange(removeGeoRoute(field.state.value, i))">
                  <Trash2 class="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" @click="field.handleChange([...field.state.value, { country: '', url: '' }])">
                <Plus class="mr-2 h-4 w-4" /> {{ $t('links.form.add_geo_route') }}
              </Button>
            </div>
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
