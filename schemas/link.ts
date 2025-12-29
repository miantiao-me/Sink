import { customAlphabet } from 'nanoid'
import { z } from 'zod'

const { slugRegex } = useAppConfig()

const slugDefaultLength = +useRuntimeConfig().public.slugDefaultLength

export const nanoid = (length: number = slugDefaultLength) => customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', length)

export const UtmSchema = z.object({
  source: z.string().trim().max(2048).optional(),
  medium: z.string().trim().max(2048).optional(),
  campaign: z.string().trim().max(2048).optional(),
  term: z.string().trim().max(2048).optional(),
  content: z.string().trim().max(2048).optional(),
}).optional()

export const LinkSchema = z.object({
  id: z.string().trim().max(26).default(nanoid(10)),
  url: z.string().trim().url().max(2048),
  slug: z.string().trim().max(2048).regex(new RegExp(slugRegex)).default(nanoid()),
  comment: z.string().trim().max(2048).optional(),
  utm: UtmSchema,
  tags: z.array(z.string().trim().min(1).max(64)).default([]),
  createdAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  updatedAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  expiration: z.number().int().safe().refine(expiration => expiration > Math.floor(Date.now() / 1000), {
    message: 'expiration must be greater than current time',
    path: ['expiration'],
  }).optional(),
  title: z.string().trim().max(2048).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().url().max(2048).optional(),
})
