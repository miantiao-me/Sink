import { z } from 'zod'
import { ImportLinkSchema } from './link'

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
