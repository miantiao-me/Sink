import { describe, expect, it } from 'vitest'
import { fetch } from './utils'

describe('/', () => {
  it('redirects homepage request', async () => {
    const response = await fetch('/')
    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    expect(response.headers.get('location')).toBe('https://www.krossys.com/')
  })
})
