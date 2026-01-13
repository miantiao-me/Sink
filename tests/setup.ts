import { execSync } from 'node:child_process'
import fs from 'node:fs'

export default function () {
  // Integration tests expect the Worker bundle referenced by `wrangler.jsonc` to exist.
  // Build it on-demand for clean environments.
  if (!fs.existsSync('dist/server/index.mjs'))
    execSync('pnpm build', { stdio: 'inherit' })

  // Wrangler's Miniflare options require this path to exist when assets are configured.
  fs.mkdirSync('dist/public', { recursive: true })

  // Keep tests runnable in clean environments (CI/local) where `.env` is not committed.
  if (fs.existsSync('.env'))
    fs.copyFileSync('.env', '.dev.vars')
  else if (fs.existsSync('.env.example'))
    fs.copyFileSync('.env.example', '.dev.vars')
  else
    fs.writeFileSync('.dev.vars', '')

  return () => {
    fs.rmSync('.dev.vars', { force: true })
  }
}
