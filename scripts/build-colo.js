import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

async function main() {
  const locations = await fetch('https://raw.githubusercontent.com/Netrvin/cloudflare-colo-list/refs/heads/main/locations.json', {
    signal: AbortSignal.timeout(10_000),
  })
  if (!locations.ok) {
    throw new Error('Failed to fetch locations')
  }
  const colos = await locations.json()
  writeFileSync(join(import.meta.dirname, '../public/colos.json'), JSON.stringify(colos.reduce((acc, c) => {
    acc[c.iata] = {
      lat: c.lat,
      lon: c.lon,
    }
    return acc
  }, {}), 'utf8'))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
