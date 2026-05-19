<script setup lang="ts">
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  placeholder: 'Select country',
  searchPlaceholder: 'Search country...',
  emptyText: 'No country found.',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { locale } = useI18n()
const open = ref(false)

const selectedCode = computed(() => props.modelValue.trim().toUpperCase())
const countries = computed(() => getCountryCodes()
  .map(code => ({
    code,
    flag: getFlag(code),
    name: getRegionName(code, locale.value),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, locale.value)))
const selectedCountry = computed(() => countries.value.find(country => country.code === selectedCode.value))

function selectCountry(code: string) {
  emit('update:modelValue', code)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        :disabled="disabled"
        class="w-full justify-between px-3"
      >
        <span
          :class="cn(
            'flex min-w-0 flex-1 items-center gap-2 text-left',
            !selectedCountry && 'text-muted-foreground',
          )"
        >
          <span v-if="selectedCountry?.flag" aria-hidden="true" class="shrink-0">
            {{ selectedCountry.flag }}
          </span>
          <span class="truncate">
            {{ selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : placeholder }}
          </span>
        </span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="min-w-[var(--radix-popper-anchor-width)] p-0" align="start">
      <Command>
        <CommandInput :placeholder="searchPlaceholder" />
        <CommandEmpty>{{ emptyText }}</CommandEmpty>
        <CommandList>
          <CommandGroup>
            <CommandItem
              v-for="country in countries"
              :key="country.code"
              :value="`${country.name} ${country.code}`"
              class="cursor-pointer"
              @select="selectCountry(country.code)"
            >
              <Check
                :class="cn(
                  'h-4 w-4 shrink-0',
                  selectedCode === country.code ? 'opacity-100' : 'opacity-0',
                )"
              />
              <span
                v-if="country.flag" aria-hidden="true" class="
                  w-5 shrink-0 text-center
                "
              >
                {{ country.flag }}
              </span>
              <span class="min-w-0 flex-1 truncate">
                {{ country.name }}
              </span>
              <span class="ml-auto text-xs text-muted-foreground">
                {{ country.code }}
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
