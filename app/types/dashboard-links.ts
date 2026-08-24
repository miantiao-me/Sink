import type { Link, LinkFormData, LinkListResponse, LinkSearchItem } from '@/types'

export type DashboardLinkStatus = 'active' | 'expired'

export type DashboardLink = Link & {
  tags?: string[]
}

export type DashboardLinkFormData = Omit<LinkFormData, 'tags'> & {
  tags: string[]
}

export type DashboardLinkSearchItem = LinkSearchItem & {
  expiration?: number
  tags?: string[]
}

export type DashboardLinkListResponse = Omit<LinkListResponse, 'links'> & {
  links: DashboardLink[]
}
