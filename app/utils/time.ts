import type { DateValue } from '@internationalized/date'
import { fromAbsolute, toCalendarDate } from '@internationalized/date'

export function getTimeZone() {
  if (typeof Intl === 'undefined')
    return 'Etc/UTC'

  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function getLocale() {
  if (typeof Intl === 'undefined')
    return navigator.language

  return Intl.DateTimeFormat().resolvedOptions().locale
}

export function shortDate(unix = 0) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(unix * 1000)
}

export function longDate(unix = 0) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(unix * 1000)
}

export function shortTime(unix = 0) {
  return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(unix * 1000)
}

export function longTime(unix = 0) {
  return new Intl.DateTimeFormat(undefined, { timeStyle: 'long' }).format(unix * 1000)
}

export function date2unix(dateValue: DateValue | Date, type?: string) {
  const date = dateValue instanceof Date ? dateValue : dateValue.toDate(getTimeZone())
  if (type === 'start')
    return Math.floor(date.setHours(0, 0, 0) / 1000)

  if (type === 'end')
    return Math.floor(date.setHours(23, 59, 59) / 1000)

  return Math.floor(date.getTime() / 1000)
}

export function unix2date(unix: number) {
  return toCalendarDate(fromAbsolute(unix * 1000, getTimeZone()))
}

export function getWeekdayNames(style: 'long' | 'short' | 'narrow' = 'short') {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: style })
  // 2024-01-01 is Monday
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, 1 + i)
    return formatter.format(date)
  })
}
