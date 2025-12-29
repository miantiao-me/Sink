<script setup lang="ts">
import type { ZodAny } from 'zod'
import type { Shape } from '@/components/ui/auto-form/interface'
import { LinkSchema, nanoid } from '@@/schemas/link'
import { toTypedSchema } from '@vee-validate/zod'
import { Shuffle, Sparkles } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import AutoFormField from '@/components/ui/auto-form/AutoFormField.vue'
import { DependencyType } from '@/components/ui/auto-form/interface'
import { beautifyObjectName, getBaseSchema, getBaseType, getDefaultValueInZodStack } from '@/components/ui/auto-form/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { applyUtmToUrl, extractUtmFromUrl, normalizeUtmFields, stripUtmFromUrl } from '@/lib/utm'

const props = defineProps({
  link: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:link'])

const { t } = useI18n()
const link = ref(props.link)
const dialogOpen = ref(false)

const isEdit = !!props.link.id

const EditLinkSchema = LinkSchema.pick({
  url: true,
  slug: true,
}).extend({
  optional: LinkSchema.omit({
    id: true,
    url: true,
    slug: true,
    createdAt: true,
    updatedAt: true,
    title: true,
    description: true,
    image: true,
  }).extend({
    expiration: z.coerce.date().optional(),
  }).optional(),
})

const fieldConfig = {
  slug: {
    disabled: isEdit,
  },
  optional: {
    comment: {
      component: 'textarea',
    },
  },
}

const optionalShapes = computed(() => {
  const optionalSchema = getBaseSchema((EditLinkSchema.shape as Record<string, ZodAny>).optional)
  if (!optionalSchema || !('shape' in optionalSchema))
    return {} as Record<string, Shape>

  const shapes: Record<string, Shape> = {}
  const shape = optionalSchema.shape as Record<string, ZodAny>

  Object.keys(shape).forEach((name) => {
    const item = shape[name]
    const baseItem = getBaseSchema(item) as ZodAny
    let options = (baseItem && 'values' in baseItem._def) ? baseItem._def.values as string[] : undefined
    if (!Array.isArray(options) && typeof options === 'object')
      options = Object.values(options)

    shapes[name] = {
      type: getBaseType(item),
      default: getDefaultValueInZodStack(item),
      options,
      required: !['ZodOptional', 'ZodNullable'].includes(item._def.typeName),
      schema: item,
    }
  })

  return shapes
})

const utmPlaceholders = {
  source: 'twitter',
  medium: 'social',
  campaign: 'landing_test',
  term: 'paid keywords',
  content: 'text ad',
}

const utmDescription = 'UTM tags help you understand where your traffic is coming from and what\'s driving clicks.'

const dependencies = [
  {
    sourceField: 'slug',
    type: DependencyType.DISABLES,
    targetField: 'slug',
    when: () => isEdit,
  },
]

function getInitialUtmValues() {
  if (link.value?.utm)
    return link.value.utm

  if (isEdit && link.value?.url)
    return extractUtmFromUrl(link.value.url)

  return undefined
}

const form = useForm({
  validationSchema: toTypedSchema(EditLinkSchema),
  initialValues: {
    slug: link.value.slug,
    url: link.value.url,
    optional: {
      comment: link.value.comment,
      utm: getInitialUtmValues(),
    },
  },
  validateOnMount: isEdit,
  keepValuesOnUnmount: isEdit,
})

function applyUtmPreview() {
  if (!form.values.url)
    return

  const normalizedUtm = normalizeUtmFields(form.values.optional?.utm)
  const nextUrl = normalizedUtm
    ? applyUtmToUrl(form.values.url, normalizedUtm)
    : stripUtmFromUrl(form.values.url)

  form.setFieldValue('url', nextUrl)
}

function randomSlug() {
  form.setFieldValue('slug', nanoid()())
}

const aiSlugPending = ref(false)
async function aiSlug() {
  if (!form.values.url)
    return

  aiSlugPending.value = true
  try {
    const { slug } = await useAPI('/api/link/ai', {
      query: {
        url: form.values.url,
      },
    })
    form.setFieldValue('slug', slug)
  }
  catch (error) {
    console.log(error)
  }
  aiSlugPending.value = false
}

onMounted(() => {
  if (link.value.expiration) {
    form.setFieldValue('optional.expiration', unix2date(link.value.expiration))
  }

  if (isEdit && !form.values.optional?.utm && link.value?.url) {
    const extracted = extractUtmFromUrl(link.value.url)
    if (extracted)
      form.setFieldValue('optional.utm', extracted)
  }
})

async function onSubmit(formData) {
  const optionalData = formData.optional || {}
  const normalizedUtm = normalizeUtmFields(optionalData.utm)
  const url = normalizedUtm
    ? applyUtmToUrl(formData.url, normalizedUtm)
    : optionalData.utm
      ? stripUtmFromUrl(formData.url)
      : formData.url

  const link = {
    url,
    slug: formData.slug,
    ...optionalData,
    utm: normalizedUtm,
    expiration: optionalData.expiration ? date2unix(optionalData.expiration, 'end') : undefined,
  }
  const { link: newLink } = await useAPI(isEdit ? '/api/link/edit' : '/api/link/create', {
    method: isEdit ? 'PUT' : 'POST',
    body: link,
  })
  dialogOpen.value = false
  emit('update:link', newLink, isEdit ? 'edit' : 'create')
  if (isEdit) {
    toast(t('links.update_success'))
  }
  else {
    toast(t('links.create_success'))
  }
}

const { previewMode } = useRuntimeConfig().public
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogTrigger as-child>
      <slot>
        <Button
          class="ml-2"
          variant="outline"
          @click="randomSlug"
        >
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
      <AutoForm
        class="space-y-2 overflow-y-auto px-2"
        :schema="EditLinkSchema"
        :form="form"
        :field-config="fieldConfig"
        :dependencies="dependencies"
        @submit="onSubmit"
      >
        <template #slug="slotProps">
          <div
            v-if="!isEdit"
            class="relative"
          >
            <div class="absolute top-0 right-0 flex space-x-3">
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
            <AutoFormField
              v-bind="slotProps"
            />
          </div>
        </template>
        <template #optional="{ fieldName, shape }">
          <Accordion type="single" as-child class="w-full" collapsible>
            <FormItem>
              <AccordionItem :value="fieldName" class="border-none">
                <AccordionTrigger>
                  <Label class="text-base">
                    {{ shape.schema?.description || beautifyObjectName(fieldName) }}
                  </Label>
                </AccordionTrigger>
                <AccordionContent class="space-y-5 p-1">
                  <AutoFormField
                    v-if="optionalShapes.comment"
                    :shape="optionalShapes.comment"
                    :field-name="`${fieldName}.comment`"
                    :config="fieldConfig.optional?.comment"
                  />
                  <AutoFormField
                    v-if="optionalShapes.expiration"
                    :shape="optionalShapes.expiration"
                    :field-name="`${fieldName}.expiration`"
                    :config="fieldConfig.optional?.expiration"
                  />
                  <Card class="bg-muted/20">
                    <CardHeader class="pb-3">
                      <CardTitle class="text-base">
                        UTM Builder
                      </CardTitle>
                      <CardDescription>
                        {{ utmDescription }}
                      </CardDescription>
                    </CardHeader>
                    <CardContent class="grid gap-4">
                      <div
                        class="
                          grid gap-4
                          sm:grid-cols-2
                        "
                      >
                        <FormField v-slot="{ componentField }" name="optional.utm.source">
                          <FormItem>
                            <FormLabel>Source</FormLabel>
                            <FormControl>
                              <Input :placeholder="utmPlaceholders.source" v-bind="componentField" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        </FormField>
                        <FormField v-slot="{ componentField }" name="optional.utm.medium">
                          <FormItem>
                            <FormLabel>Medium</FormLabel>
                            <FormControl>
                              <Input :placeholder="utmPlaceholders.medium" v-bind="componentField" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        </FormField>
                        <FormField v-slot="{ componentField }" name="optional.utm.campaign">
                          <FormItem>
                            <FormLabel>Campaign</FormLabel>
                            <FormControl>
                              <Input :placeholder="utmPlaceholders.campaign" v-bind="componentField" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        </FormField>
                        <FormField v-slot="{ componentField }" name="optional.utm.term">
                          <FormItem>
                            <FormLabel>Term</FormLabel>
                            <FormControl>
                              <Input :placeholder="utmPlaceholders.term" v-bind="componentField" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        </FormField>
                        <FormField v-slot="{ componentField }" name="optional.utm.content">
                          <FormItem class="sm:col-span-2">
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Input :placeholder="utmPlaceholders.content" v-bind="componentField" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        </FormField>
                      </div>
                      <div class="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          @click="applyUtmPreview"
                        >
                          Apply
                        </Button>
                      </div>
                      <!-- TODO: Add UTM presets (save/apply) -->
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            </FormItem>
          </Accordion>
        </template>
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
          <Button type="submit">
            {{ $t('common.save') }}
          </Button>
        </DialogFooter>
      </AutoForm>
    </DialogContent>
  </Dialog>
</template>
