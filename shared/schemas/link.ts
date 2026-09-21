import { customAlphabet } from 'nanoid'
import { z } from 'zod'
import { LINK_PASSWORD_MASK_PREFIX } from '../utils/link-password'

const { slugRegex } = useAppConfig()

const slugDefaultLength = +useRuntimeConfig().public.slugDefaultLength

export const nanoid = (length: number = slugDefaultLength) => customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', length)

const GeoSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, url]) => [key.trim().toUpperCase(), url]),
  )
}, z.record(z.string().trim().regex(/^[A-Z]{2}$/), z.string().trim().url().max(2048)))

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
export const UrlSchema = z.string().trim().url().max(2048)
export const SlugSchema = z.string().trim().max(2048).regex(new RegExp(slugRegex))
const TimestampSchema = z.number().int().safe()
const ExpirationSchema = TimestampSchema.refine(expiration => expiration > Math.floor(Date.now() / 1000), {
  message: 'expiration must be greater than current time',
  path: ['expiration'],
})

/** The writable link fields. Descriptions carry into the generated MCP tool schemas. */
export const LinkFieldsSchema = z.object({
  url: UrlSchema,
  slug: SlugSchema,
  comment: z.string().trim().max(2048).optional(),
  expiration: ExpirationSchema.optional().describe('Unix seconds. Must be in the future.'),
  title: z.string().trim().max(256).optional().describe('Overrides the title in the link preview.'),
  description: z.string().trim().max(2048).optional().describe('Overrides the description in the link preview.'),
  image: z.string().trim().max(128).optional().describe('Overrides the image in the link preview.'),
  apple: z.string().trim().url().max(2048).optional().describe('Apple App Store redirect URL.'),
  google: z.string().trim().url().max(2048).optional().describe('Google Play Store redirect URL.'),
  cloaking: z.boolean().optional().describe('Mask the destination URL behind the short link.'),
  redirectWithQuery: z.boolean().optional().describe('Append incoming query parameters to the destination URL.'),
  password: LinkPasswordSchema.optional(),
  unsafe: z.boolean().optional().describe('Show a warning page before redirecting.'),
  geo: GeoSchema.optional().describe('Geo-routing rules mapping a two-letter country code to a URL.'),
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

const LinkKeywordSchema = z.string().trim().refine(
  value => new TextEncoder().encode(value.toLowerCase().replace(/[!%_]/g, '!$&')).length <= 48,
  { message: 'Search query must not exceed 48 UTF-8 bytes' },
).describe('Case-insensitive substring matched against slug, URL, comment, or tag. Limited to 48 UTF-8 bytes.')

const LinkTagFilterSchema = z.string().trim().toLowerCase().min(1).max(32).describe('Exact tag match, normalized to lowercase.')
const LinkStatusFilterSchema = z.enum(['active', 'expired', 'all']).default('active')
const LinkQueryLimitSchema = z.coerce.number().int().min(1).max(1000).default(20).describe('Maximum number of results, 1-1000.')

/** Read contracts shared by the REST link routes and the MCP link tools. */
export const LinkFilterQuerySchema = z.object({
  q: LinkKeywordSchema.optional(),
  url: z.string().trim().url().max(2048).optional().describe('Target URL matched exactly.'),
  tag: LinkTagFilterSchema.optional(),
  status: LinkStatusFilterSchema,
})

export const SearchLinksQuerySchema = LinkFilterQuerySchema.extend({
  limit: LinkQueryLimitSchema,
})

export const ListLinksQuerySchema = z.object({
  limit: LinkQueryLimitSchema,
  cursor: z.string().trim().max(1024).optional().describe('Pagination cursor returned by a previous call.'),
  sort: z.enum(['az', 'za', 'newest', 'oldest']).default('newest'),
  tag: LinkTagFilterSchema.optional(),
  status: LinkStatusFilterSchema,
})

export const LinkSlugQuerySchema = z.object({
  slug: z.string().trim().min(1).max(2048),
})

export const DeleteLinkSchema = z.object({
  slug: SlugSchema.min(1),
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
