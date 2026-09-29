import type { H3Event } from 'h3'

/**
 * Cloudflare bindings are absent when the request runs outside a Worker, or when
 * the dev platform proxy starts without them. `Cloudflare.Env` types them as
 * always present, so every binding read goes through an accessor here.
 */
export function requireCloudflareEnv(event: H3Event): Cloudflare.Env {
  const env = event.context.cloudflare?.env
  if (!env) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Cloudflare bindings unavailable',
    })
  }

  return env
}

/** D1 is the authoritative link store, so a missing binding has no fallback. */
export function requireD1Database(env: Cloudflare.Env): D1Database {
  if (!env.DB) {
    throw createError({
      statusCode: 503,
      statusMessage: 'D1 binding not configured',
    })
  }

  return env.DB
}

/**
 * KV is a read cache, so callers on the redirect path degrade to D1 instead of
 * failing. Use {@link requireKvNamespace} where KV holds data D1 does not.
 */
export function getKvNamespace(env: Cloudflare.Env): KVNamespace | null {
  return env.KV ?? null
}

export function requireKvNamespace(env: Cloudflare.Env): KVNamespace {
  if (!env.KV) {
    throw createError({
      statusCode: 503,
      statusMessage: 'KV binding not configured',
    })
  }

  return env.KV
}
