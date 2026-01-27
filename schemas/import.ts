import { z } from 'zod'

const { slugRegex } = useAppConfig()

const ImportLinkSchema = z.object({
  id: z.string().trim().max(26).optional(),
  url: z.string().trim().url().max(2048),
  slug: z.string().trim().max(2048).regex(new RegExp(slugRegex)),
  comment: z.string().trim().max(2048).optional(),
  createdAt: z.number().int().safe().optional(),
  updatedAt: z.number().int().safe().optional(),
  expiration: z.number().int().safe().optional(),
  title: z.string().trim().max(2048).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().url().max(2048).optional(),
})

export const ImportDataSchema = z.object({
  version: z.string(),
  exportedAt: z.string().optional(),
  count: z.number().int().optional(),
  links: z.array(ImportLinkSchema).min(1),
})

export type ImportData = z.infer<typeof ImportDataSchema>
export type ImportLink = z.infer<typeof ImportLinkSchema>
