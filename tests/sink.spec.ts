import { describe, expect, it } from 'vitest'
import { fetch } from './utils'

describe('/', () => {
  it('returns 200 for homepage request', async () => {
    const response = await fetch('/')
    expect(response.status).toBe(200)
  })
})
