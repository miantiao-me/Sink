import { FAVICON_SIZE, isIconType } from '#shared/utils/image'

/**
 * Scale a favicon down to fit `FAVICON_SIZE` and re-encode it as PNG. ICO files and images
 * already within the size are returned as they are, since canvas cannot read every ICO file.
 */
export async function resizeFavicon(file: File): Promise<File> {
  if (isIconType(file.type))
    return file

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, FAVICON_SIZE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1)
      return file

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob)
      throw new Error('Failed to resize favicon')

    return new File([blob], 'favicon.png', { type: 'image/png' })
  }
  finally {
    bitmap.close()
  }
}
