export function normalizeTags(tags?: string[]) {
  if (!tags?.length)
    return []

  const normalized = tags
    .map(tag => tag.trim())
    .filter(tag => tag.length)

  return Array.from(new Set(normalized))
}
