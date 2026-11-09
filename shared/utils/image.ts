export const IMAGE_UPLOAD_KINDS = {
  image: {
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSize: 5 * 1024 * 1024,
  },
  favicon: {
    types: ['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'],
    maxSize: 1024 * 1024,
  },
} satisfies Record<string, { types: string[], maxSize: number }>

export type ImageUploadKind = keyof typeof IMAGE_UPLOAD_KINDS

export const FAVICON_SIZE = 256

export function isImageUploadKind(value: unknown): value is ImageUploadKind {
  return typeof value === 'string' && Object.hasOwn(IMAGE_UPLOAD_KINDS, value)
}

export function isIconType(type: string) {
  return type === 'image/x-icon' || type === 'image/vnd.microsoft.icon'
}
