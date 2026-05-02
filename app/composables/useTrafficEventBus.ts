import type { TrafficEventParams } from '@/types'
import { useEventBus } from '@vueuse/core'

const trafficEventBus = useEventBus<TrafficEventParams>(Symbol('traffic'))

/**
 * Traffic event bus for globe arc/ripple animations.
 * Wraps global event bus for testability and explicit dependency.
 */
export function useTrafficEventBus() {
  return trafficEventBus
}
