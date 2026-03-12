import { z } from 'zod'

import { LinkSchema } from './link'

// Import uses LinkSchema but:
// - Removes defaults (id, slug, createdAt, updatedAt have defaults in LinkSchema)
// - Removes expiration refinement (imported links may have past expiration)
// - Makes id optional, slug required
const ImportLinkSchema = LinkSchema
  .omit({ expiration: true })
  .extend({
    id: z.string().trim().max(26).optional(),
    expiration: z.number().int().safe().optional(),
  })

export const ImportDataSchema = z.object({
  version: z.string(),
  exportedAt: z.string().optional(),
  count: z.number().int().optional(),
  links: z.array(ImportLinkSchema).min(1),
})

export type ImportData = z.infer<typeof ImportDataSchema>
export type ImportLink = z.infer<typeof ImportLinkSchema>

export interface ImportResultItem {
  index: number
  slug: string
  url: string
}

export interface ImportResult {
  success: number
  skipped: number
  failed: number
  successItems: ImportResultItem[]
  skippedItems: ImportResultItem[]
  failedItems: (ImportResultItem & { reason: string })[]
}
