export function toErrorMessage(error: unknown, maxLength?: number): string {
  const message = error instanceof Error ? error.message : String(error)

  return maxLength ? message.slice(0, maxLength) : message
}
