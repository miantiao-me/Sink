import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import { loadEnv } from 'vite'

export default defineWorkersConfig(({ mode }) => ({
  test: {
    env: loadEnv(mode, process.cwd(), ''),
    poolOptions: {
      workers: {
        singleWorker: true,
        isolatedStorage: false,
        wrangler: {
          configPath: './wrangler.jsonc',
        },
        miniflare: {
          cf: true,
        },
      },
    },
  },
}))
