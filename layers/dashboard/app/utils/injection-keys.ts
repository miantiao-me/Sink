import type { ComputedRef, InjectionKey } from 'vue'

export const LINK_ID_KEY: InjectionKey<ComputedRef<string | undefined>> = Symbol('linkId')

// eslint-disable-next-line symbol-description
export const FORM_ITEM_INJECTION_KEY = Symbol() as InjectionKey<string>
