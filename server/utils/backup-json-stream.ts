import type { Link } from '#shared/schemas/link'

interface BackupJsonStreamOptions {
  version: string
  exportedAt: string
}

export interface BackupJsonStream {
  stream: ReadableStream<Uint8Array>
  count: Promise<number>
}

const encoder = new TextEncoder()
const R2_MULTIPART_MIN_PART_SIZE = 5 * 1024 * 1024

export async function uploadBackupParts(upload: R2MultipartUpload, stream: ReadableStream<Uint8Array>): Promise<R2UploadedPart[]> {
  const reader = stream.getReader()
  const parts: R2UploadedPart[] = []
  let buffer = new Uint8Array(R2_MULTIPART_MIN_PART_SIZE)
  let buffered = 0

  try {
    while (true) {
      const next = await reader.read()
      if (next.done)
        break

      let offset = 0
      while (offset < next.value.byteLength) {
        const copied = Math.min(R2_MULTIPART_MIN_PART_SIZE - buffered, next.value.byteLength - offset)
        buffer.set(next.value.subarray(offset, offset + copied), buffered)
        buffered += copied
        offset += copied

        if (buffered === R2_MULTIPART_MIN_PART_SIZE) {
          parts.push(await upload.uploadPart(parts.length + 1, buffer))
          buffer = new Uint8Array(R2_MULTIPART_MIN_PART_SIZE)
          buffered = 0
        }
      }
    }

    if (buffered > 0)
      parts.push(await upload.uploadPart(parts.length + 1, buffer.slice(0, buffered)))
    return parts
  }
  catch (error) {
    try {
      await reader.cancel(error)
    }
    catch {
      // Preserve the upload or stream error.
    }
    throw error
  }
  finally {
    reader.releaseLock()
  }
}

export function createBackupJsonStream(links: AsyncIterable<Link>, options: BackupJsonStreamOptions): BackupJsonStream {
  const iterator = links[Symbol.asyncIterator]()
  let emitted = 0
  let prefixed = false
  let settled = false
  let resolveCount!: (count: number) => void
  let rejectCount!: (error: unknown) => void
  const count = new Promise<number>((resolve, reject) => {
    resolveCount = resolve
    rejectCount = reject
  })
  void count.catch(() => {})

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!prefixed) {
          controller.enqueue(encoder.encode(`{"version":${JSON.stringify(options.version)},"exportedAt":${JSON.stringify(options.exportedAt)},"links":[`))
          prefixed = true
          return
        }

        const next = await iterator.next()
        if (!next.done) {
          const serialized = JSON.stringify(next.value)
          if (serialized === undefined)
            throw new TypeError('Failed to serialize backup link')
          controller.enqueue(encoder.encode(`${emitted ? ',' : ''}${serialized}`))
          emitted++
          return
        }

        controller.enqueue(encoder.encode(`],"count":${emitted}}`))
        settled = true
        resolveCount(emitted)
        controller.close()
      }
      catch (error) {
        if (!settled) {
          settled = true
          rejectCount(error)
        }
        if (iterator.return) {
          try {
            await iterator.return()
          }
          catch {
            // Preserve the serialization error.
          }
        }
        controller.error(error)
      }
    },
    async cancel(reason) {
      if (!settled) {
        settled = true
        rejectCount(reason)
      }
      await iterator.return?.()
    },
  }, { highWaterMark: 0 })

  return { stream, count }
}
