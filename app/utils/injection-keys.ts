import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { CounterData } from '@/types'

export const LINK_ID_KEY: InjectionKey<ComputedRef<string | undefined>> = Symbol('linkId')
export const REALTIME_PAUSED_KEY: InjectionKey<Ref<boolean>> = Symbol('realtimePaused')
export const LINKS_COUNTERS_MAP_KEY: InjectionKey<Ref<Record<string, CounterData>>> = Symbol('linksCountersMap')
export const LINKS_COUNTER_ERROR_IDS_KEY: InjectionKey<Ref<Set<string>>> = Symbol('linksCounterErrorIds')
export const RETRY_LINK_COUNTERS_KEY: InjectionKey<(id: string) => void> = Symbol('retryLinkCounters')
