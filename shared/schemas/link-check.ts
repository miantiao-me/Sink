import { z } from 'zod'

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  }
  catch {
    return false
  }
}

export const LinkCheckTargetSchema = z.object({
  slug: z.string().trim().min(1).max(2048),
  url: z.string().trim().url().max(2048).refine(isHttpUrl, 'URL must use HTTP or HTTPS'),
})

export const LinkCheckRequestSchema = z.object({
  links: z.array(LinkCheckTargetSchema).min(1).max(10),
  timeout: z.coerce.number().int().min(1).max(30).default(6),
})

export const LinkCheckConfigSchema = z.object({
  timeout: z.coerce.number().int().min(1).max(30).default(6),
  batchSize: z.coerce.number().int().min(1).max(10).default(6),
})

export type LinkCheckTarget = z.infer<typeof LinkCheckTargetSchema>
export type LinkCheckRequest = z.infer<typeof LinkCheckRequestSchema>
export type LinkCheckConfig = z.infer<typeof LinkCheckConfigSchema>
export type LinkCheckConfigInput = z.input<typeof LinkCheckConfigSchema>
