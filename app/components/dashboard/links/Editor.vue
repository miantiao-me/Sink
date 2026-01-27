<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { Link } from '@/types'
import { LinkSchema, nanoid } from '@@/schemas/link'
import { today } from '@internationalized/date'
import { useForm } from '@tanstack/vue-form'
import { CalendarIcon, Shuffle, Sparkles } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  link?: Partial<Link>
}>(), {
  link: () => ({}),
})

const { t } = useI18n()
const linksStore = useDashboardLinksStore()
const link = ref(props.link)
const dialogOpen = ref(false)
const isEdit = !!props.link.id
const { previewMode } = useRuntimeConfig().public

// Field-level validators using Zod
const urlValidator = LinkSchema.shape.url
const slugValidator = LinkSchema.shape.slug
const commentValidator = z.string().max(500).optional()

// Generate slug using nanoid
const generateSlug = nanoid()

// Setup TanStack Form with field-level validation
const form = useForm({
  defaultValues: {
    url: link.value.url ?? '',
    slug: link.value.slug ?? '',
    comment: link.value.comment ?? '',
    expiration: link.value.expiration
      ? unix2date(link.value.expiration)
      : undefined as DateValue | undefined,
  },
  onSubmit: async ({ value }) => {
    try {
      const linkData = {
        url: value.url,
        slug: value.slug,
        comment: value.comment || undefined,
        expiration: value.expiration
          ? date2unix(value.expiration, 'end')
          : undefined,
      }
      const { link: newLink } = await useAPI(
        isEdit ? '/api/link/edit' : '/api/link/create',
        {
          method: isEdit ? 'PUT' : 'POST',
          body: linkData,
        },
      ) as { link: Link }
      dialogOpen.value = false
      linksStore.notifyLinkUpdate(newLink, isEdit ? 'edit' : 'create')
      toast(isEdit ? t('links.update_success') : t('links.create_success'))
    }
    catch (error) {
      console.error(error)
      toast.error(isEdit ? t('links.update_failed') : t('links.create_failed'), {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  },
})

// Field-level validator functions
function validateUrl({ value }: { value: string }) {
  const result = urlValidator.safeParse(value)
  return result.success ? undefined : result.error.errors[0]?.message
}

function validateSlug({ value }: { value: string }) {
  const result = slugValidator.safeParse(value)
  return result.success ? undefined : result.error.errors[0]?.message
}

function validateComment({ value }: { value: string }) {
  const result = commentValidator.safeParse(value)
  return result.success ? undefined : result.error.errors[0]?.message
}

function isInvalid(field: { state: { meta: { isTouched: boolean, isValid: boolean } } }) {
  return field.state.meta.isTouched && !field.state.meta.isValid
}

function getAriaInvalid(field: { state: { meta: { isTouched: boolean, isValid: boolean } } }) {
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

// Date picker state
const datePickerOpen = ref(false)
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogTrigger as-child>
      <slot>
        <Button class="md:ml-2" variant="outline" @click="randomSlug">
          {{ $t('links.create') }}
        </Button>
      </slot>
    </DialogTrigger>
    <DialogContent
      class="
        max-h-[95svh] max-w-[95svw] grid-rows-[auto_minmax(0,1fr)_auto]
        md:max-w-lg
      "
    >
      <DialogHeader>
        <DialogTitle>{{ link.id ? $t('links.edit') : $t('links.create') }}</DialogTitle>
      </DialogHeader>
      <p
        v-if="previewMode"
        class="text-sm text-muted-foreground"
      >
        {{ $t('links.preview_mode_tip') }}
      </p>

      <form
        id="link-editor-form"
        class="space-y-4 overflow-y-auto px-2"
        @submit.prevent="form.handleSubmit"
      >
        <FieldGroup>
          <!-- URL Field -->
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
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </form.Field>

          <!-- Slug Field -->
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
                  <Shuffle
                    class="h-4 w-4 cursor-pointer"
                    @click="randomSlug"
                  />
                  <Sparkles
                    class="h-4 w-4 cursor-pointer"
                    :class="{ 'animate-bounce': aiSlugPending }"
                    @click="aiSlug"
                  />
                </div>
              </div>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :disabled="isEdit"
                :aria-invalid="getAriaInvalid(field)"
                placeholder="my-short-link"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </form.Field>

          <!-- Comment Field -->
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

          <!-- Expiration Date Picker -->
          <form.Field v-slot="{ field }" name="expiration">
            <Field :data-invalid="isInvalid(field)">
              <FieldLabel :for="field.name">
                {{ $t('links.form.expiration') }}
              </FieldLabel>
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
                        ? field.state.value.toDate(getTimeZone()).toLocaleDateString()
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
          </form.Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose as-child>
          <Button
            type="button"
            variant="secondary"
            class="
              mt-2
              sm:mt-0
            "
          >
            {{ $t('common.close') }}
          </Button>
        </DialogClose>
        <Button type="submit" form="link-editor-form">
          {{ $t('common.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
