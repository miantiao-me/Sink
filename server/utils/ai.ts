export interface AiChatResponse {
  response?: string
  choices?: { message?: { content?: string } }[]
}

export function stripCodeFence(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```') || !trimmed.endsWith('```')) {
    return trimmed
  }

  const lines = trimmed.split('\n')
  const firstLine = lines[0]?.trim()
  if (lines.length < 2 || (firstLine !== '```' && firstLine !== '```json')) {
    return trimmed
  }

  lines.shift()
  lines.pop()
  return lines.join('\n').trim()
}
