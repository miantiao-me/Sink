import type { AnyFieldApi } from '@/types'

export function useFieldHelpers() {
  function isInvalid(field: AnyFieldApi) {
    return field.state.meta.isTouched && !field.state.meta.isValid
  }

  function getAriaInvalid(field: AnyFieldApi) {
    return isInvalid(field) ? 'true' : undefined
  }

  return {
    isInvalid,
    getAriaInvalid,
  }
}
