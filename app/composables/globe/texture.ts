import type { GeoProjection } from 'd3-geo'
import type { CountryColorTiers, HeatmapColorTiers } from './types'
import type { GeoJSONData, LocationData } from '@/types'
import { scaleThreshold } from 'd3-scale'

// Hex grid constants (flat-top hexagons)
// Base hexSize=9 is calibrated for 4096px texture width
const BASE_HEX_SIZE = 9
const BASE_TEXTURE_WIDTH = 4096
const HEX_MARGIN = 0.2

const HEX_ANGLES = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i
  return [Math.cos(angle), Math.sin(angle)] as const
})

type Canvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export interface ProjectedHeatLocation {
  px: number
  py: number
  count: number
}

export interface HeatmapHexDensity {
  cx: number
  cy: number
  density: number
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined')
    return new OffscreenCanvas(width, height)
  return Object.assign(document.createElement('canvas'), { width, height })
}

export async function createCountryTexture(
  gl: WebGLRenderingContext,
  countries: GeoJSONData,
  countryStats: Map<string, number>,
  maxVisits: number,
  tiers: CountryColorTiers,
  globeFill: string,
  locations: LocationData[],
  highest: number,
  heatmapTiers: HeatmapColorTiers,
  containerSize: number,
): Promise<WebGLTexture> {
  const { geoPath, geoEquirectangular } = await import('d3-geo')

  const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
  const targetWidth = Math.min(containerSize * 2, maxSize)
  const width = Math.max(2, Math.floor(targetWidth / 2) * 2)
  const height = width / 2
  const hexSize = BASE_HEX_SIZE * (width / BASE_TEXTURE_WIDTH)

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d') as Canvas2D | null
  if (!ctx)
    throw new Error('Failed to create globe texture canvas')

  ctx.fillStyle = globeFill
  ctx.fillRect(0, 0, width, height)

  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2])

  const pathGen = geoPath(projection)

  // Country lookup texture: each country drawn with unique color encoding its index
  const lookupCanvas = createCanvas(width, height)
  const lookupCtx = lookupCanvas.getContext('2d') as Canvas2D | null
  if (!lookupCtx)
    throw new Error('Failed to create globe lookup canvas')

  lookupCtx.fillStyle = 'rgb(0, 0, 0)'
  lookupCtx.fillRect(0, 0, width, height)

  const features = countries.features
  for (let i = 0; i < features.length; i++) {
    const id = i + 1
    lookupCtx.fillStyle = `rgb(${id & 0xFF}, ${(id >> 8) & 0xFF}, 0)`
    lookupCtx.beginPath()
    pathGen.context(lookupCtx as any)(features[i] as any)
    lookupCtx.fill()
  }

  const lookupData = lookupCtx.getImageData(0, 0, width, height).data

  // Country color map from visit tiers
  const tierScale = scaleThreshold<number, string>()
    .domain([1, maxVisits * 0.33, maxVisits * 0.66])
    .range([tiers.noData, tiers.tier1, tiers.tier2, tiers.tier3])

  const countryColorMap = new Map<number, string>()
  for (let i = 0; i < features.length; i++) {
    const props = (features[i] as any)?.properties
    const countryCode = props?.ISO_A2 || props?.iso_a2 || ''
    const count = countryStats.get(countryCode) || 0
    countryColorMap.set(i, tierScale(count))
  }

  // Generate hex grid grouped by color for batch rendering
  drawHexGrid(ctx, width, height, hexSize, lookupData, countryColorMap, tiers.noData)

  // Heatmap overlay from location density
  if (locations.length > 0 && highest > 0) {
    drawHeatmapHexes(ctx, width, height, hexSize, projection, locations, highest, heatmapTiers)
  }

  return createGLTexture(gl, canvas)
}

function drawHexGrid(
  ctx: Canvas2D,
  width: number,
  height: number,
  hexSize: number,
  lookupData: Uint8ClampedArray,
  countryColorMap: Map<number, string>,
  noDataColor: string,
) {
  const drawRadius = hexSize * (1 - HEX_MARGIN)
  const colSpacing = 1.5 * hexSize
  const rowSpacing = Math.sqrt(3) * hexSize
  const halfRowSpacing = rowSpacing / 2
  const numCols = Math.ceil(width / colSpacing) + 1
  const numRows = Math.ceil(height / rowSpacing) + 1

  const hexesByColor = new Map<string, number[]>()

  for (let col = 0; col < numCols; col++) {
    const isOddCol = col & 1
    for (let row = 0; row < numRows; row++) {
      const cx = col * colSpacing
      const cy = row * rowSpacing + (isOddCol ? halfRowSpacing : 0)

      if (cx >= width || cy >= height)
        continue

      const px = Math.min(Math.floor(cx), width - 1)
      const py = Math.min(Math.floor(cy), height - 1)
      const idx = (py * width + px) * 4
      const countryIdx = (lookupData[idx]! | (lookupData[idx + 1]! << 8)) - 1

      if (countryIdx < 0 || countryIdx >= countryColorMap.size)
        continue

      const color = countryColorMap.get(countryIdx) || noDataColor
      let coords = hexesByColor.get(color)
      if (!coords) {
        coords = []
        hexesByColor.set(color, coords)
      }
      coords.push(cx, cy)
    }
  }

  for (const [color, coords] of hexesByColor) {
    drawHexBatch(ctx, coords, drawRadius, color)
  }
}

function drawHeatmapHexes(
  ctx: Canvas2D,
  width: number,
  height: number,
  hexSize: number,
  projection: GeoProjection,
  locations: LocationData[],
  highest: number,
  heatmapTiers: HeatmapColorTiers,
) {
  const drawRadius = hexSize * (1 - HEX_MARGIN)

  const projectedLocs: ProjectedHeatLocation[] = []
  for (const loc of locations) {
    const projected = projection([loc.lng, loc.lat])
    if (!projected)
      continue
    projectedLocs.push({ px: projected[0], py: projected[1], count: loc.count })
  }

  const heatTierScale = scaleThreshold<number, string>()
    .domain([highest * 0.05, highest * 0.15, highest * 0.35, highest * 0.65])
    .range([heatmapTiers.tier1, heatmapTiers.tier2, heatmapTiers.tier3, heatmapTiers.tier4, heatmapTiers.tier5])

  const heatHexesByColor = new Map<string, number[]>()
  const densities = calculateHeatmapHexDensities(width, height, hexSize, projectedLocs)

  for (const { cx, cy, density } of densities) {
    const color = heatTierScale(density)
    let coords = heatHexesByColor.get(color)
    if (!coords) {
      coords = []
      heatHexesByColor.set(color, coords)
    }
    coords.push(cx, cy)
  }

  for (const [color, coords] of heatHexesByColor) {
    drawHexBatch(ctx, coords, drawRadius, color)
  }
}

export function calculateHeatmapHexDensities(
  width: number,
  height: number,
  hexSize: number,
  locations: ProjectedHeatLocation[],
): HeatmapHexDensity[] {
  const colSpacing = 1.5 * hexSize
  const rowSpacing = Math.sqrt(3) * hexSize
  const halfRowSpacing = rowSpacing / 2
  const influenceRadius = colSpacing * 1.5
  const influenceRadiusSq = influenceRadius * influenceRadius
  const numCols = Math.ceil(width / colSpacing) + 1
  const numRows = Math.ceil(height / rowSpacing) + 1
  const densities = new Map<number, number>()

  for (const loc of locations) {
    const px = ((loc.px % width) + width) % width
    const candidateCells = new Set<number>()

    for (const shiftedPx of [px - width, px, px + width]) {
      const firstCol = Math.max(0, Math.ceil((shiftedPx - influenceRadius) / colSpacing))
      const lastCol = Math.min(numCols - 1, Math.floor((shiftedPx + influenceRadius) / colSpacing))

      for (let col = firstCol; col <= lastCol; col++) {
        const cx = col * colSpacing
        if (cx >= width)
          continue

        const rowOffset = col & 1 ? halfRowSpacing : 0
        const firstRow = Math.max(0, Math.ceil((loc.py - influenceRadius - rowOffset) / rowSpacing))
        const lastRow = Math.min(numRows - 1, Math.floor((loc.py + influenceRadius - rowOffset) / rowSpacing))

        for (let row = firstRow; row <= lastRow; row++) {
          const cy = row * rowSpacing + rowOffset
          if (cy < height)
            candidateCells.add(col * numRows + row)
        }
      }
    }

    for (const cell of candidateCells) {
      const col = Math.floor(cell / numRows)
      const row = cell % numRows
      const cx = col * colSpacing
      const cy = row * rowSpacing + (col & 1 ? halfRowSpacing : 0)
      const rawDx = cx - px
      const dx = rawDx - Math.round(rawDx / width) * width
      const dy = cy - loc.py
      const distSq = dx * dx + dy * dy

      if (distSq < influenceRadiusSq) {
        const density = loc.count * (1 - Math.sqrt(distSq) / influenceRadius)
        densities.set(cell, (densities.get(cell) ?? 0) + density)
      }
    }
  }

  return Array.from(densities, ([cell, density]) => {
    const col = Math.floor(cell / numRows)
    const row = cell % numRows
    return {
      cx: col * colSpacing,
      cy: row * rowSpacing + (col & 1 ? halfRowSpacing : 0),
      density,
    }
  })
}

// Batch-draw flat-top hexagons at given coordinates
function drawHexBatch(ctx: Canvas2D, coords: number[], radius: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < coords.length; i += 2) {
    const cx = coords[i]!
    const cy = coords[i + 1]!
    const [cos0, sin0] = HEX_ANGLES[0]!
    ctx.moveTo(cx + radius * cos0, cy + radius * sin0)
    for (let v = 1; v < 6; v++) {
      const [cos, sin] = HEX_ANGLES[v]!
      ctx.lineTo(cx + radius * cos, cy + radius * sin)
    }
    ctx.closePath()
  }
  ctx.fill()
}

function createGLTexture(gl: WebGLRenderingContext, canvas: HTMLCanvasElement | OffscreenCanvas): WebGLTexture {
  const texture = gl.createTexture()
  if (!texture)
    throw new Error('Failed to create globe texture')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas as TexImageSource)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return texture
}
