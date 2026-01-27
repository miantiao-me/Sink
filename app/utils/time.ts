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
  const shortDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
  })
  return shortDate.format(unix * 1000)
}

export function longDate(unix = 0) {
  const longDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
  })
  return longDate.format(unix * 1000)
}

export function shortTime(unix = 0) {
  const shortTime = new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  })
  return shortTime.format(unix * 1000)
}

export function longTime(unix = 0) {
  const longTime = new Intl.DateTimeFormat(undefined, {
    timeStyle: 'long',
  })
  return longTime.format(unix * 1000)
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
