// LRU cache for parsed colors (avoids expensive canvas operations on repeated calls)
const COLOR_CACHE_MAX = 64
const colorCache = new Map<string, [number, number, number]>()

function cacheColor(key: string, value: [number, number, number]): [number, number, number] {
  // Simple LRU: delete oldest if at capacity
  if (colorCache.size >= COLOR_CACHE_MAX) {
    const firstKey = colorCache.keys().next().value
    if (firstKey !== undefined) {
      colorCache.delete(firstKey)
    }
  }
  colorCache.set(key, value)
  return value
}

export function parseColor(color: string): [number, number, number] {
  // Check cache first
  const cached = colorCache.get(color)
  if (cached) {
    // Move to end for LRU behavior
    colorCache.delete(color)
    colorCache.set(color, cached)
    return cached
  }

  if (color.startsWith('oklch')) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const data = ctx.getImageData(0, 0, 1, 1).data
    return cacheColor(color, [data[0]! / 255, data[1]! / 255, data[2]! / 255])
  }

  if (color.startsWith('#')) {
    const hex = color.slice(1)
    return cacheColor(color, [
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255,
    ])
  }

  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (match) {
    return cacheColor(color, [
      Number.parseInt(match[1]!) / 255,
      Number.parseInt(match[2]!) / 255,
      Number.parseInt(match[3]!) / 255,
    ])
  }

  return cacheColor(color, [0.5, 0.5, 0.5])
}
