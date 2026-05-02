import type { CountryColorTiers, GlobeColors, HeatmapColorTiers } from './types'
import { useColorMode } from '#imports'
import { computed } from 'vue'

export type { CountryColorTiers, GlobeColors, HeatmapColorTiers }

export function useGlobeColors() {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

  const arcColor = computed(() =>
    isDark.value ? 'oklch(0.85 0.15 70)' : 'oklch(0.8 0.12 65)',
  )

  const colors = computed<GlobeColors>(() => ({
    globeFill: isDark.value ? 'oklch(0.3 0.005 286)' : 'oklch(0.95 0.002 286)',
  }))

  const countryColorTiers = computed<CountryColorTiers>(() => ({
    noData: isDark.value ? 'oklch(0.4 0.005 286)' : 'oklch(0.88 0.003 286)',
    tier1: isDark.value ? 'oklch(0.723 0.219 149.579 / 35%)' : 'oklch(0.723 0.219 149.579 / 40%)',
    tier2: isDark.value ? 'oklch(0.723 0.219 149.579 / 55%)' : 'oklch(0.723 0.219 149.579 / 60%)',
    tier3: isDark.value ? 'oklch(0.723 0.219 149.579 / 75%)' : 'oklch(0.723 0.219 149.579 / 80%)',
  }))

  const heatmapColorTiers = computed<HeatmapColorTiers>(() => ({
    tier1: isDark.value ? 'oklch(0.82 0.1 75)' : 'oklch(0.82 0.12 72)',
    tier2: isDark.value ? 'oklch(0.75 0.14 68)' : 'oklch(0.75 0.16 65)',
    tier3: isDark.value ? 'oklch(0.65 0.18 58)' : 'oklch(0.65 0.2 55)',
    tier4: isDark.value ? 'oklch(0.55 0.22 48)' : 'oklch(0.55 0.24 45)',
    tier5: isDark.value ? 'oklch(0.45 0.24 40)' : 'oklch(0.48 0.26 38)',
  }))

  return {
    isDark,
    arcColor,
    colors,
    countryColorTiers,
    heatmapColorTiers,
  }
}
