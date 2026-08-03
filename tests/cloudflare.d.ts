import type { D1Migration } from 'cloudflare:test'

declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: D1Migration[]
  }

  interface GlobalProps {
    mainModule: {
      default: ExportedHandler<Env>
    }
  }
}
