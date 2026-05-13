import type { BackupData } from '../../server/utils/backup'
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { postJson } from '../utils'

function getManualBackupDate(key: string) {
  const match = key.match(/^backups\/manual-links-(.+)\.json$/)
  if (!match)
    return undefined

  return new Date(match[1].replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3'))
}

describe.sequential('/api/backup', () => {
  it('returns success with auth', async () => {
    const response = await postJson('/api/backup', {})
    expect(response.status).toBe(200)

    const data = await response.json() as { success: boolean, message: string }
    expect(data.success).toBe(true)
    expect(data.message).toBe('Backup completed successfully')
  })

  it('returns 401 without auth', async () => {
    const response = await postJson('/api/backup', {}, false)
    expect(response.status).toBe(401)
  })

  it('writes latest manual backup JSON to R2', async () => {
    const slug = `backup-${crypto.randomUUID()}`
    const createResponse = await postJson('/api/link/create', {
      url: 'https://example.com/backup',
      slug,
    })
    expect(createResponse.status).toBe(201)

    const backupStartedAt = new Date()
    const backupResponse = await postJson('/api/backup', {})
    expect(backupResponse.status).toBe(200)

    const list = await env.R2.list({ prefix: 'backups/manual-links-' })
    const latestBackup = list.objects
      .filter((object) => {
        const backupDate = getManualBackupDate(object.key)
        return backupDate !== undefined && backupDate >= backupStartedAt
      })
      .toSorted((a, b) => a.key.localeCompare(b.key))
      .at(-1)
    expect(latestBackup).toBeDefined()

    const backupObject = latestBackup ? await env.R2.get(latestBackup.key) : null
    expect(backupObject).not.toBeNull()

    const backupData = await backupObject?.json() as BackupData | undefined
    expect(backupData).toHaveProperty('version')
    expect(backupData).toHaveProperty('exportedAt')
    expect(backupData).toHaveProperty('count')
    expect(backupData).toHaveProperty('links')
    expect(backupData?.links).toEqual(expect.arrayContaining([expect.objectContaining({ slug })]))
  })
})
