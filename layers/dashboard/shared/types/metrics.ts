export interface MetricItem {
  name: string
  count: number
  color?: string
  percent?: number
}

export interface ViewDataPoint {
  time: string
  visitors: number
  visits: number
}

export interface CounterData {
  visits: number
  visitors: number
  referers: number
}

export interface LocationData {
  lat: number
  lng: number
  count: number
}

export interface DateRange {
  startAt: number
  endAt: number
}

export interface GeoJSONData {
  features: unknown[]
  type?: string
}

export interface CurrentLocation {
  latitude?: number
  longitude?: number
}

export interface AreaData {
  id: string
  name: string
  count: number
}

export interface HeatmapDataPoint {
  weekday: number
  hour: number
  visits: number
  visitors: number
}
