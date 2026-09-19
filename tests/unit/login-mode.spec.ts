import { describe, expect, it } from 'vitest'
import { resolveLoginMode } from '../../app/utils/login-mode'

describe('login mode presentation', () => {
  it('does not expose single-user login while configuration is loading', () => {
    expect(resolveLoginMode('idle')).toBe('loading')
    expect(resolveLoginMode('pending')).toBe('loading')
  })

  it('shows exactly the configured authentication mode', () => {
    expect(resolveLoginMode('success', true)).toBe('oidc')
    expect(resolveLoginMode('success', false)).toBe('single-user')
  })

  it('does not fall back to single-user login when configuration fails', () => {
    expect(resolveLoginMode('error')).toBe('error')
  })
})
