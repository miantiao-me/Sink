import type { LinkCheckConfig, LinkCheckConfigInput, LinkCheckRequest, LinkCheckTarget } from '#shared/schemas/link-check'

export type { LinkCheckConfig, LinkCheckConfigInput, LinkCheckRequest, LinkCheckTarget }

export interface LinkCheckResult extends LinkCheckTarget {
  status: number
  ok: boolean
  duration: number
  checkedAt: string
  error?: string
}

export interface LinkCheckResponse {
  results: LinkCheckResult[]
}
