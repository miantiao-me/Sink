import { applyD1Migrations, env } from 'cloudflare:test'
import { beforeAll } from 'vitest'

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
})
