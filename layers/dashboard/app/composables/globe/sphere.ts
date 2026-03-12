// Pure sphere tessellation — no external dependencies.
// Used by both runtime (geometry.ts re-export) and build script (scripts/build-sphere.js).

export function createOctahedronSphere(divisions: number) {
  const initialPoints: number[] = [
    0,
    1,
    0,
    0,
    0,
    -1,
    -1,
    0,
    0,
    0,
    1,
    0,
    -1,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    0,
    0,
    0,
    1,
    1,
    0,
    0,
    0,
    1,
    0,
    1,
    0,
    0,
    0,
    0,
    -1,
    0,
    -1,
    0,
    -1,
    0,
    0,
    0,
    0,
    -1,
    0,
    -1,
    0,
    0,
    0,
    1,
    -1,
    0,
    0,
    0,
    -1,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    -1,
    0,
    0,
    0,
    -1,
    1,
    0,
    0,
  ]

  let points = new Float32Array(initialPoints)

  for (let i = 0; i < divisions; i++) {
    const newPoints = new Float32Array(points.length * 4)
    let offset = 0

    for (let j = 0; j < points.length; j += 9) {
      const a: [number, number, number] = [points[j]!, points[j + 1]!, points[j + 2]!]
      const b: [number, number, number] = [points[j + 3]!, points[j + 4]!, points[j + 5]!]
      const c: [number, number, number] = [points[j + 6]!, points[j + 7]!, points[j + 8]!]

      const ab = normalizeVec3([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2])
      const bc = normalizeVec3([(b[0] + c[0]) / 2, (b[1] + c[1]) / 2, (b[2] + c[2]) / 2])
      const ca = normalizeVec3([(c[0] + a[0]) / 2, (c[1] + a[1]) / 2, (c[2] + a[2]) / 2])

      newPoints.set([...a, ...ab, ...ca], offset)
      offset += 9
      newPoints.set([...ab, ...bc, ...ca], offset)
      offset += 9
      newPoints.set([...ab, ...b, ...bc], offset)
      offset += 9
      newPoints.set([...ca, ...bc, ...c], offset)
      offset += 9
    }

    points = newPoints
  }

  // Build indexed mesh (triangle-at-a-time for proper seam/pole handling)
  const vertexMap = new Map<string, number>()
  const positions: number[] = []
  const texcoords: number[] = []
  const indices: number[] = []

  for (let tri = 0; tri < points.length; tri += 9) {
    const triVerts: [number, number, number][] = []
    const triUVs: [number, number][] = []

    for (let v = 0; v < 3; v++) {
      const p: [number, number, number] = [
        points[tri + v * 3]!,
        points[tri + v * 3 + 1]!,
        points[tri + v * 3 + 2]!,
      ]
      triVerts.push(p)
      triUVs.push(uvFromPoint(p))
    }

    // Fix poles: at poles atan2 is undefined, use average u from other verts
    for (let v = 0; v < 3; v++) {
      if (Math.abs(triVerts[v]![1]) > 0.999) {
        const otherUs = triUVs.filter((_, i) => i !== v).map(uv => uv[0])
        triUVs[v]![0] = (otherUs[0]! + otherUs[1]!) / 2
      }
    }

    // Fix seam: if triangle spans the dateline (u range > 0.5), wrap low values
    const us = triUVs.map(uv => uv[0])
    const maxU = Math.max(...us)
    const minU = Math.min(...us)
    if (maxU - minU > 0.5) {
      for (const uv of triUVs) {
        if (uv[0] < 0.25)
          uv[0] += 1.0
      }
    }

    for (let v = 0; v < 3; v++) {
      const p = triVerts[v]!
      const uv = triUVs[v]!
      const key = `${p[0].toFixed(6)},${p[1].toFixed(6)},${p[2].toFixed(6)},${uv[0].toFixed(6)},${uv[1].toFixed(6)}`

      let index = vertexMap.get(key)
      if (index === undefined) {
        index = positions.length / 3
        vertexMap.set(key, index)
        positions.push(...p)
        texcoords.push(...uv)
      }
      indices.push(index)
    }
  }

  return {
    position: new Float32Array(positions),
    texcoord: new Float32Array(texcoords),
    indices: new Uint16Array(indices),
  }
}

function normalizeVec3(v: number[]): [number, number, number] {
  const len = Math.sqrt(v[0]! * v[0]! + v[1]! * v[1]! + v[2]! * v[2]!)
  return [v[0]! / len, v[1]! / len, v[2]! / len]
}

function uvFromPoint(p: number[]): [number, number] {
  return [
    (Math.atan2(p[0]!, p[2]!) / (2 * Math.PI)) + 0.5,
    1.0 - ((Math.asin(p[1]!) / Math.PI) + 0.5),
  ]
}
