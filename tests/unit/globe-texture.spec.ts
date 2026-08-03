import { describe, expect, it } from 'vitest'
import { calculateHeatmapHexDensities } from '../../app/composables/globe/texture'

const HEX_SIZE = 10
const WIDTH = 150
const HEIGHT = 100

function densityAt(densities: ReturnType<typeof calculateHeatmapHexDensities>, cx: number, cy: number) {
  return densities.find(hex => hex.cx === cx && hex.cy === cy)?.density
}

describe('heatmap hex densities', () => {
  it('adds density from overlapping locations', () => {
    const densities = calculateHeatmapHexDensities(WIDTH, HEIGHT, HEX_SIZE, [
      { px: 30, py: 0, count: 4 },
      { px: 30, py: 0, count: 6 },
    ])

    expect(densityAt(densities, 30, 0)).toBe(10)
  })

  it('does not affect cells outside the influence radius', () => {
    const densities = calculateHeatmapHexDensities(WIDTH, HEIGHT, HEX_SIZE, [
      { px: 30, py: 0, count: 10 },
    ])

    expect(densityAt(densities, 60, 0)).toBeUndefined()
  })

  it('wraps influence continuously across the texture seam', () => {
    const fromLeft = calculateHeatmapHexDensities(WIDTH, HEIGHT, HEX_SIZE, [
      { px: 1, py: 0, count: 10 },
    ])
    const fromRight = calculateHeatmapHexDensities(WIDTH, HEIGHT, HEX_SIZE, [
      { px: WIDTH + 1, py: 0, count: 10 },
    ])

    expect(fromRight).toEqual(fromLeft)
    expect(fromLeft.some(hex => hex.cx === WIDTH - 15 && hex.density > 0)).toBe(true)
  })
})
