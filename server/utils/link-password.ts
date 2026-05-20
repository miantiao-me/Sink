import type { Link } from '#shared/schemas/link'
import { isHashedLinkPassword, isMaskedLinkPassword, LINK_PASSWORD_HASH_PREFIX, maskLinkPassword } from '#shared/utils/link-password'

const LINK_PASSWORD_ITERATIONS = 10_000
const LINK_PASSWORD_SALT_BYTES = 16
const LINK_PASSWORD_HASH_BITS = 256

interface StoredLinkPassword {
  iterations: number
  salt: Uint8Array
  hash: Uint8Array
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
}

function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function deriveLinkPasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(encodeText(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations,
    },
    key,
    LINK_PASSWORD_HASH_BITS,
  )

  return new Uint8Array(bits)
}

function parseStoredLinkPassword(password: string): StoredLinkPassword | undefined {
  if (!isHashedLinkPassword(password))
    return undefined

  const [iterationsValue, saltValue, hashValue, tailValue] = password.slice(LINK_PASSWORD_HASH_PREFIX.length).split(':')
  const iterations = Number(iterationsValue)

  if (!Number.isSafeInteger(iterations) || iterations < 1 || !saltValue || !hashValue || !tailValue)
    return undefined

  try {
    return {
      iterations,
      salt: base64UrlToBytes(saltValue),
      hash: base64UrlToBytes(hashValue),
    }
  }
  catch {
    return undefined
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length
  const length = Math.max(a.length, b.length)

  for (let i = 0; i < length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }

  return diff === 0
}

export async function hashLinkPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(LINK_PASSWORD_SALT_BYTES))
  const hash = await deriveLinkPasswordHash(password, salt, LINK_PASSWORD_ITERATIONS)
  const tail = bytesToBase64Url(encodeText([...password].slice(-3).join('')))

  return `${LINK_PASSWORD_HASH_PREFIX}${LINK_PASSWORD_ITERATIONS}:${bytesToBase64Url(salt)}:${bytesToBase64Url(hash)}:${tail}`
}

export async function normalizeLinkPasswordForStorage(password: string): Promise<string> {
  if (isMaskedLinkPassword(password))
    throw new Error('Masked password cannot be stored')

  if (parseStoredLinkPassword(password))
    return password

  return await hashLinkPassword(password)
}

export async function verifyLinkPassword(input: string, stored: string): Promise<boolean> {
  const parsed = parseStoredLinkPassword(stored)
  if (!parsed)
    return input === stored

  const inputHash = await deriveLinkPasswordHash(input, parsed.salt, parsed.iterations)
  return timingSafeEqual(inputHash, parsed.hash)
}

export function sanitizeLinkPassword<T extends { password?: string } | null>(link: T): T {
  if (!link?.password)
    return link

  return {
    ...link,
    password: maskLinkPassword(link.password),
  }
}

export function sanitizeLinksPassword<T extends { password?: string } | null>(links: T[]): T[] {
  return links.map(link => sanitizeLinkPassword(link))
}

export async function protectLinkPasswordForExport(link: Link): Promise<Link> {
  if (!link.password)
    return link

  return {
    ...link,
    password: await normalizeLinkPasswordForStorage(link.password),
  }
}
