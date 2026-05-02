import type { Link } from '#shared/schemas/link'
import type { DateValue } from '@internationalized/date'
import type { AnyFieldApi } from '@tanstack/vue-form'

export type { Link }

export type LinkUpdateType = 'create' | 'edit' | 'delete'

// Form data derived from Link, with DateValue for expiration and required strings for optional fields
type LinkFormFields = Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'expiration'> & {
  expiration: DateValue | undefined
}

export type LinkFormData = {
  [K in keyof LinkFormFields]-?: LinkFormFields[K] extends string | undefined ? string : LinkFormFields[K]
}

export type { AnyFieldApi }

export interface LinkListResponse {
  links: Link[]
  cursor: string
  list_complete: boolean
}

export type LinkSortBy = 'newest' | 'oldest' | 'az' | 'za'
