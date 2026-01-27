import type { LinkSchema } from '@@/schemas/link'
import type { z } from 'zod'

export type Link = z.infer<typeof LinkSchema>

export type LinkUpdateType = 'create' | 'edit' | 'delete'

export interface LinkListResponse {
  links: Link[]
  cursor: string
  list_complete: boolean
}

export type LinkSortBy = 'newest' | 'oldest' | 'az' | 'za'
