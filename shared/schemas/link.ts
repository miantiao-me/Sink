import { customAlphabet } from 'nanoid'
import { z } from 'zod'
import { LINK_PASSWORD_MASK_PREFIX } from '../utils/link-password'

const { slugRegex } = useAppConfig()

const slugDefaultLength = +useRuntimeConfig().public.slugDefaultLength
const configuredMaxUrlLength = Number(useRuntimeConfig().public.maxUrlLength)
const MIN_CONFIGURED_URL_LENGTH = 256
// Leaves room under Cloudflare's 128 KB response-header limit after URL encoding.
const MAX_CONFIGURED_URL_LENGTH = 24_000

if (!Number.isSafeInteger(configuredMaxUrlLength)
  || configuredMaxUrlLength < MIN_CONFIGURED_URL_LENGTH
  || configuredMaxUrlLength > MAX_CONFIGURED_URL_LENGTH) {
  throw new Error(
    `NUXT_PUBLIC_MAX_URL_LENGTH must be an integer between ${MIN_CONFIGURED_URL_LENGTH} and ${MAX_CONFIGURED_URL_LENGTH}`,
  )
}

export const MAX_URL_LENGTH = configuredMaxUrlLength

export const nanoid = (length: number = slugDefaultLength) => customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', length)

const GeoSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, url]) => [key.trim().toUpperCase(), url]),
  )
}, z.record(z.string().trim().regex(/^[A-Z]{2}$/), z.string().trim().url().max(MAX_URL_LENGTH)))

const TagsSchema = z.preprocess((value) => {
  if (!Array.isArray(value))
    return value
  return [...new Set(value.map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : tag))]
}, z.array(z.string().min(1).max(32)).max(10)).default([])

export const LinkPasswordSchema = z.string().trim().min(1).max(128).refine(
  password => !password.startsWith(LINK_PASSWORD_MASK_PREFIX),
  'masked password cannot be submitted',
)

export const EditLinkPasswordSchema = z.string().trim().max(128).refine(
  password => !password.startsWith(LINK_PASSWORD_MASK_PREFIX),
  'masked password cannot be submitted',
).optional()

const IdSchema = z.string().trim().min(1).max(26)
export const UrlSchema = z.string()
  .trim()
  .min(1, 'URL is required')
  .max(MAX_URL_LENGTH, `URL must not exceed ${MAX_URL_LENGTH} characters`)
  .url('URL format is invalid')
export const SlugSchema = z.string().trim().max(2048).regex(new RegExp(slugRegex))
const TimestampSchema = z.number().int().safe()
const ExpirationSchema = TimestampSchema.refine(expiration => expiration > Math.floor(Date.now() / 1000), {
  message: 'expiration must be greater than current time',
  path: ['expiration'],
})

const LinkFieldsSchema = z.object({
  url: UrlSchema,
  slug: SlugSchema,
  comment: z.string().trim().max(2048).optional(),
  expiration: ExpirationSchema.optional(),
  title: z.string().trim().max(256).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().max(128).optional(),
  apple: z.string().trim().url().max(MAX_URL_LENGTH).optional(),
  google: z.string().trim().url().max(MAX_URL_LENGTH).optional(),
  cloaking: z.boolean().optional(),
  redirectWithQuery: z.boolean().optional(),
  password: LinkPasswordSchema.optional(),
  unsafe: z.boolean().optional(),
  geo: GeoSchema.optional(),
  tags: TagsSchema,
})

export const CreateLinkSchema = LinkFieldsSchema.extend({
  id: IdSchema.default(nanoid(10)),
  slug: SlugSchema.default(nanoid()),
  createdAt: TimestampSchema.default(() => Math.floor(Date.now() / 1000)),
  updatedAt: TimestampSchema.default(() => Math.floor(Date.now() / 1000)),
})

export const EditLinkSchema = LinkFieldsSchema.extend({
  password: EditLinkPasswordSchema,
})

export const ImportLinkSchema = LinkFieldsSchema.extend({
  id: z.preprocess(value => typeof value === 'string' && !value.trim() ? undefined : value, IdSchema.optional()),
  createdAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema.optional(),
  expiration: TimestampSchema.optional(),
})

export const StoredLinkSchema = LinkFieldsSchema.extend({
  id: IdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  expiration: TimestampSchema.optional(),
})

export function parseLegacyKvLink(value: unknown, slug: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return StoredLinkSchema.safeParse(value)

  const link = value as Record<string, unknown>
  const now = Math.floor(Date.now() / 1000)
  const isEmpty = (field: unknown) => field === undefined || field === null || (typeof field === 'string' && !field.trim())
  return StoredLinkSchema.safeParse({
    ...link,
    id: isEmpty(link.id) ? nanoid(10)() : link.id,
    slug: isEmpty(link.slug) ? slug : link.slug,
    createdAt: isEmpty(link.createdAt) ? now : link.createdAt,
    updatedAt: isEmpty(link.updatedAt) ? now : link.updatedAt,
  })
}

export type Link = z.infer<typeof StoredLinkSchema>
export type EditLink = z.infer<typeof EditLinkSchema>

export interface ExportData {
  version: string
  exportedAt: string
  count: number
  links: Link[]
  cursor?: string
  list_complete: boolean
}
