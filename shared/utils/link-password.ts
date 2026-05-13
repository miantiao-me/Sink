export const LINK_PASSWORD_HASH_PREFIX = 'sink-pwd:v1:'
export const LINK_PASSWORD_MASK_PREFIX = '__SINK_MASKED__'

export function isMaskedLinkPassword(password: string): boolean {
  return password.startsWith(LINK_PASSWORD_MASK_PREFIX)
}

export function isHashedLinkPassword(password: string): boolean {
  return password.startsWith(LINK_PASSWORD_HASH_PREFIX)
}

function decodeBase64Url(value: string): string | undefined {
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }
  catch {
    return undefined
  }
}

export function getLinkPasswordTail(password: string): string {
  if (!isHashedLinkPassword(password))
    return [...password].slice(-3).join('')

  const parts = password.slice(LINK_PASSWORD_HASH_PREFIX.length).split(':')
  const tail = parts[3]
  return tail ? decodeBase64Url(tail) ?? '' : ''
}

export function maskLinkPassword(password: string): string {
  return `${LINK_PASSWORD_MASK_PREFIX}•••${getLinkPasswordTail(password)}`
}
