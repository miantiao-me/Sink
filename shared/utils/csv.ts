function escapeCsvCell(value: unknown): string {
  let text = String(value ?? '')

  if (/^[=+\-@\t\r]/.test(text))
    text = `'${text}`

  if (/[",\n\r]/.test(text))
    return `"${text.replaceAll('"', '""')}"`

  return text
}

export function generateCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(',')),
  ]

  return `\uFEFF${lines.join('\n')}\n`
}
