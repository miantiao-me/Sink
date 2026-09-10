import { z } from 'zod'

export const LinkMigrationRunSchema = z.object({
  cursor: z.string().trim().max(2048).optional(),
  force: z.preprocess(value => value === true || value === 'true', z.boolean()).default(false),
})

export const LinkMigrationMarkerSchema = z.object({
  version: z.literal(1),
  completedAt: z.iso.datetime(),
  scanned: z.number().int().nonnegative(),
  inserted: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
})

export type LinkMigrationMarker = z.infer<typeof LinkMigrationMarkerSchema>

export interface LinkMigrationFailedItem {
  key: string
  reason: string
}

export interface LinkMigrationRunResult {
  completed: boolean
  list_complete: boolean
  cursor?: string
  scanned: number
  inserted: number
  skipped: number
  expired: number
  failed: number
  failedItems: LinkMigrationFailedItem[]
}

export interface LinkMigrationStatus {
  completed: boolean
  marker: LinkMigrationMarker | null
}
