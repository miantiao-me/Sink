export interface LogEvent {
  id: string
  slug: string
  os?: string
  browser?: string
  country?: string
  city?: string
  latitude?: number
  longitude?: number
  COLO?: string
  timestamp: number
}

export interface ArcData {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
  arcAltitude: number
}

export interface ColoData {
  lat: number
  lon: number
}
