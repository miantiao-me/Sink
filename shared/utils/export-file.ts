export function createExportFilename(prefix: string, extension: string, date = new Date()): string {
  const normalizedExtension = extension.replace(/^\./, '')
  const timestamp = date.toISOString().replaceAll(':', '-').replaceAll('.', '-')

  return `${prefix}-${timestamp}.${normalizedExtension}`
}
