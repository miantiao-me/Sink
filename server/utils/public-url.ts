export function isPublicHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      return false

    const rawHostname = parsed.hostname.toLowerCase()
    const hostname = rawHostname.startsWith('[') && rawHostname.endsWith(']')
      ? rawHostname.slice(1, -1)
      : rawHostname.replace(/\.+$/, '')
    if (hostname === 'localhost' || hostname.endsWith('.localhost'))
      return false

    return !isBlockedIp(hostname)
  }
  catch {
    return false
  }
}

function isBlockedIp(hostname: string): boolean {
  if (hostname.includes(':'))
    return isBlockedIpv6(hostname)

  return isBlockedIpv4(hostname)
}

function isBlockedIpv4(hostname: string): boolean {
  const parts = hostname.split('.')
  if (parts.length !== 4)
    return false

  const bytes = parts.map((part) => {
    if (!/^\d+$/.test(part))
      return Number.NaN

    const value = Number(part)
    return value >= 0 && value <= 255 ? value : Number.NaN
  })

  if (bytes.some(Number.isNaN))
    return false

  const [a, b] = bytes as [number, number, number, number]

  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224
}

// Embedded dotted-decimal IPv4 tail, e.g. ::ffff:10.0.0.1
const IPV4_TAIL_RE = /:(\d+\.\d+\.\d+\.\d+)$/

function ipv6Segments(hostname: string): number[] | undefined {
  const ipv4Tail = hostname.match(IPV4_TAIL_RE)
  if (ipv4Tail) {
    const parts = ipv4Tail[1]!.split('.').map(Number)
    if (parts.some(part => !Number.isInteger(part) || part < 0 || part > 255))
      return undefined
    const rest = hostname.slice(0, -ipv4Tail[0].length)
    const value = parts.reduce((acc, part) => acc * 256 + part, 0)
    return ipv6Segments(`${rest}:${(value >>> 16).toString(16)}:${(value & 0xFFFF).toString(16)}`)
  }

  if (!/^(?:[\da-f]*:)+[\da-f]*$/i.test(hostname))
    return undefined

  const halves = hostname.split('::')
  if (halves.length > 2)
    return undefined

  const parseHalf = (half: string) => {
    if (!half)
      return []
    const parts = half.split(':')
    if (parts.some(part => !/^[\da-f]{1,4}$/i.test(part)))
      return undefined
    return parts.map(part => Number.parseInt(part, 16))
  }

  let segments: number[] | undefined
  if (halves.length === 2) {
    const head = parseHalf(halves[0]!)
    const tail = parseHalf(halves[1]!)
    if (!head || !tail || head.length + tail.length >= 8)
      return undefined
    segments = [...head, ...Array.from<number>({ length: 8 - head.length - tail.length }).fill(0), ...tail]
  }
  else {
    segments = parseHalf(hostname)
  }

  if (!segments || segments.length !== 8)
    return undefined
  return segments
}

function embeddedIpv4(high: number, low: number): string {
  return `${high >> 8}.${high & 0xFF}.${low >> 8}.${low & 0xFF}`
}

function isBlockedIpv6(hostname: string): boolean {
  const segments = ipv6Segments(hostname)
  // Fail closed on unparseable IPv6 literals
  if (!segments)
    return true

  const [s0, s1, s2, s3, s4, s5, s6, s7] = segments as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]

  // :: (unspecified), ::1 (loopback), fc00::/7 (ULA), fe80::/10 (link-local),
  // ff00::/8 (multicast)
  if (segments.every(s => s === 0)
    || (s0 === 0 && s1 === 0 && s2 === 0 && s3 === 0 && s4 === 0 && s5 === 0 && s6 === 0 && s7 === 1)
    || (s0 & 0xFE00) === 0xFC00
    || (s0 & 0xFFC0) === 0xFE80
    || (s0 & 0xFF00) === 0xFF00) {
    return true
  }

  // IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d literals
  if (s0 === 0 && s1 === 0 && s2 === 0 && s3 === 0 && s4 === 0 && (s5 === 0xFFFF || s5 === 0))
    return isBlockedIpv4(embeddedIpv4(s6, s7))

  // 6to4 (2002::/16) and NAT64 (64:ff9b::/96) embed an IPv4 address
  if (s0 === 0x2002)
    return isBlockedIpv4(embeddedIpv4(s1, s2))
  if (s0 === 0x64 && s1 === 0xFF9B && s2 === 0 && s3 === 0 && s4 === 0)
    return isBlockedIpv4(embeddedIpv4(s6, s7))

  // Teredo (2001::/32) tunnels to arbitrary IPv4 endpoints
  if (s0 === 0x2001 && s1 === 0)
    return true

  return false
}
