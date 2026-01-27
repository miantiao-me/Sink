export function formatNumber(number: number): string {
  if (!number || typeof Intl === 'undefined')
    return String(number)

  return new Intl.NumberFormat('en').format(number)
}
