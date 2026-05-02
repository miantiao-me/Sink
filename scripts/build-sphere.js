import { Buffer } from 'node:buffer'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { createOctahedronSphere } from '../layers/dashboard/app/composables/globe/sphere.ts'

/**
 * Binary format:
 * [header: 12 bytes] 3x Uint32 (positions_bytes, texcoords_bytes, indices_bytes)
 * [body] Float32Array | Float32Array | Uint16Array
 */
function main() {
  const { position, texcoord, indices } = createOctahedronSphere(6)

  const posBytes = position.byteLength
  const texBytes = texcoord.byteLength
  const idxBytes = indices.byteLength

  const header = new Uint32Array([posBytes, texBytes, idxBytes])
  const totalSize = header.byteLength + posBytes + texBytes + idxBytes

  const buffer = new ArrayBuffer(totalSize)
  const view = new Uint8Array(buffer)

  let offset = 0
  view.set(new Uint8Array(header.buffer), offset)
  offset += header.byteLength
  view.set(new Uint8Array(position.buffer), offset)
  offset += posBytes
  view.set(new Uint8Array(texcoord.buffer), offset)
  offset += texBytes
  view.set(new Uint8Array(indices.buffer), offset)

  const outPath = join(import.meta.dirname, '../public/sphere.bin')
  writeFileSync(outPath, Buffer.from(buffer))

  const sizeKB = (totalSize / 1024).toFixed(1)
  console.log(`sphere.bin: ${position.length / 3} vertices, ${indices.length / 3} triangles, ${sizeKB} KB`)
}

main()
