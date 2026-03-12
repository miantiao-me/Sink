import { geoDistance, geoInterpolate } from 'd3-geo'

export { createOctahedronSphere } from './sphere'

// Great-circle arc geometry via d3-geo interpolation (ribbon for visible width)
export function createArcGeometry(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  segments: number = 50,
  progress: number = 1,
  ribbonHalfWidth: number = 0.002,
): { positions: Float32Array, alphas: Float32Array, dashParams: Float32Array } {
  const interpolate = geoInterpolate([startLng, startLat], [endLng, endLat])
  const angle = geoDistance([startLng, startLat], [endLng, endLat])

  // First pass: compute center line points
  const numSegments = Math.floor(segments * progress)
  const center: { x: number, y: number, z: number, t: number }[] = []

  for (let i = 0; i <= numSegments; i++) {
    const t = i / segments
    const [lng, lat] = interpolate(t)
    const point = latLngToXYZ(lat!, lng!, 1.0)

    // Lift arc above sphere surface
    const lift = Math.sin(t * Math.PI) * 0.08 * (angle / Math.PI)
    const len = Math.sqrt(point[0] ** 2 + point[1] ** 2 + point[2] ** 2)
    const scale = (1.008 + lift) / len
    center.push({ x: point[0] * scale, y: point[1] * scale, z: point[2] * scale, t })
  }

  if (center.length < 2) {
    return {
      positions: new Float32Array(0),
      alphas: new Float32Array(0),
      dashParams: new Float32Array(0),
    }
  }

  // Second pass: expand center line into ribbon (triangle strip)
  const positions: number[] = []
  const alphas: number[] = []
  const dashParams: number[] = []

  for (let i = 0; i < center.length; i++) {
    const p = center[i]!

    // Tangent direction along the arc
    let tx: number, ty: number, tz: number
    if (i === 0) {
      const n = center[1]!
      tx = n.x - p.x
      ty = n.y - p.y
      tz = n.z - p.z
    }
    else if (i === center.length - 1) {
      const prev = center[i - 1]!
      tx = p.x - prev.x
      ty = p.y - prev.y
      tz = p.z - prev.z
    }
    else {
      const prev = center[i - 1]!
      const n = center[i + 1]!
      tx = n.x - prev.x
      ty = n.y - prev.y
      tz = n.z - prev.z
    }

    // Side = cross(tangent, radial), normalized, gives perpendicular ribbon direction
    let sx = ty * p.z - tz * p.y
    let sy = tz * p.x - tx * p.z
    let sz = tx * p.y - ty * p.x
    const sLen = Math.sqrt(sx * sx + sy * sy + sz * sz)
    if (sLen > 0) {
      sx /= sLen
      sy /= sLen
      sz /= sLen
    }

    const alpha = Math.sin(p.t * Math.PI)

    // Two vertices per arc point (left / right of center)
    positions.push(
      p.x + sx * ribbonHalfWidth,
      p.y + sy * ribbonHalfWidth,
      p.z + sz * ribbonHalfWidth,
      p.x - sx * ribbonHalfWidth,
      p.y - sy * ribbonHalfWidth,
      p.z - sz * ribbonHalfWidth,
    )
    alphas.push(alpha, alpha)
    dashParams.push(p.t, p.t)
  }

  return {
    positions: new Float32Array(positions),
    alphas: new Float32Array(alphas),
    dashParams: new Float32Array(dashParams),
  }
}

export function latLngToXYZ(lat: number, lng: number, radius: number): [number, number, number] {
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  return [
    radius * Math.cos(latRad) * Math.sin(lngRad),
    radius * Math.sin(latRad),
    radius * Math.cos(latRad) * Math.cos(lngRad),
  ]
}
