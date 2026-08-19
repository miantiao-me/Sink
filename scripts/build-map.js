import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WorldMapTopoJSON } from '@unovis/ts/maps.js'
import { feature } from 'topojson-client'

const publicDir = join(import.meta.dirname, '../public')

// Dashboard Locations map (TopoJSON). world-simple includes small states like Singapore.
writeFileSync(join(publicDir, 'world.json'), JSON.stringify(WorldMapTopoJSON), 'utf8')

// Globe country polygons (GeoJSON). Keep only fields used by texture coloring.
const countries = feature(WorldMapTopoJSON, WorldMapTopoJSON.objects.countries)
const geojson = {
  type: 'FeatureCollection',
  features: countries.features.map(f => ({
    type: 'Feature',
    properties: {
      ISO_A2: String(f.id ?? ''),
      NAME: f.properties?.name ?? '',
    },
    geometry: f.geometry,
  })),
}

writeFileSync(join(publicDir, 'countries.geojson'), JSON.stringify(geojson), 'utf8')
