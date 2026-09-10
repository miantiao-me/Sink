export function requireR2Bucket(env: Cloudflare.Env): R2Bucket {
  if (!env.R2) {
    throw createError({
      statusCode: 503,
      statusMessage: 'R2 binding not configured',
    })
  }

  return env.R2
}
