export function formatNumber(number: number, locale?: string): string {
  if (!number || typeof Intl === 'undefined')
    return String(number)

  return new Intl.NumberFormat(locale).format(number)
}
