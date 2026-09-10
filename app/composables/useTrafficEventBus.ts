import type { LogEvent } from '@/types'
import { useEventBus } from '@vueuse/core'

const trafficEventBus = useEventBus<LogEvent>(Symbol('traffic'))
let ready = false

function emit(event: LogEvent) {
  if (ready)
    trafficEventBus.emit(event)
}

function setReady(value: boolean) {
  ready = value
}

/**
 * Traffic event bus for globe arc/ripple animations.
 * Wraps global event bus for testability and explicit dependency.
 */
export function useTrafficEventBus() {
  return {
    on: trafficEventBus.on,
    off: trafficEventBus.off,
    emit,
    setReady,
  }
}
