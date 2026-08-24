import { describe, expect, it } from 'vitest'
import {
  appendPendingEvents,
  selectReplayEvents,
} from '../../app/utils/realtime-log-queue'

interface TestEvent {
  id: string
  message: string
}

function event(id: string): TestEvent {
  return { id, message: `Event ${id}` }
}

describe('realtime log queue', () => {
  it('selects the latest initial events in oldest-first order', () => {
    const snapshot = [event('5'), event('4'), event('3'), event('2'), event('1')]

    expect(selectReplayEvents(snapshot, undefined, 3).map(item => item.id)).toEqual(['3', '4', '5'])
  })

  it('selects only unknown subsequent events in oldest-first order', () => {
    const snapshot = [event('5'), event('4'), event('3'), event('2')]
    const knownIds = new Set(['2', '3'])

    expect(selectReplayEvents(snapshot, knownIds).map(item => item.id)).toEqual(['4', '5'])
  })

  it('drops the oldest pending events when capacity is exceeded', () => {
    const pending = [event('1'), event('2')]
    const incoming = [event('3'), event('4'), event('5')]

    expect(appendPendingEvents(pending, incoming, 3).map(item => item.id)).toEqual(['3', '4', '5'])
  })

  it('does not modify snapshot or queue inputs', () => {
    const snapshot = [event('3'), event('2'), event('1')]
    const pending = [event('1')]
    const incoming = [event('2'), event('3')]
    const originalSnapshot = [...snapshot]
    const originalPending = [...pending]
    const originalIncoming = [...incoming]

    selectReplayEvents(snapshot, undefined, 2)
    appendPendingEvents(pending, incoming, 2)

    expect(snapshot).toEqual(originalSnapshot)
    expect(pending).toEqual(originalPending)
    expect(incoming).toEqual(originalIncoming)
  })
})
