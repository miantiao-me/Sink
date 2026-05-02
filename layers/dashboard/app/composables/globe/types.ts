import type { ComputedRef, Ref, ShallowRef } from 'vue'
import type { GeoJSONData, LocationData } from '@/types'

export interface GlobeColors {
  globeFill: string
}

export interface CountryColorTiers {
  noData: string
  tier1: string
  tier2: string
  tier3: string
}

export interface HeatmapColorTiers {
  tier1: string
  tier2: string
  tier3: string
  tier4: string
  tier5: string
}

export interface WebGLGlobeContext {
  canvasRef: Ref<HTMLCanvasElement | null>
  width: Ref<number>
  height: Ref<number>
  countries: ShallowRef<GeoJSONData>
  locations: ShallowRef<LocationData[]>
  countryStats: ShallowRef<Map<string, number>>
  maxCountryVisits: ComputedRef<number>
  highest: ComputedRef<number>
  colors: ComputedRef<GlobeColors>
  countryColorTiers: ComputedRef<CountryColorTiers>
  heatmapColorTiers: ComputedRef<HeatmapColorTiers>
}

export interface ArcData {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color?: string
}

export interface RippleData {
  lat: number
  lng: number
  maxRadius?: number
  duration?: number
  color?: string
}
