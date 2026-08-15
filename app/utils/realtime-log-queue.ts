export interface RealtimeLogEvent {
  id: string
}

export function selectReplayEvents<T extends RealtimeLogEvent>(
  snapshot: readonly T[],
  knownIds?: ReadonlySet<string>,
  initialLimit = 20,
): T[] {
  const events = knownIds
    ? snapshot.filter(event => !knownIds.has(event.id))
    : snapshot.slice(0, Math.max(0, initialLimit))

  return events.reverse()
}

export function appendPendingEvents<T>(
  pending: readonly T[],
  events: readonly T[],
  maxLength = 100,
): T[] {
  if (maxLength <= 0)
    return []

  return [...pending, ...events].slice(-maxLength)
}
