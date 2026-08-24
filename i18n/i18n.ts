import type { LocaleObject } from '@nuxtjs/i18n'
import localeConfig from './config.json'

function localeFiles(code: string): string[] {
  return localeConfig.modules.map(module => `${code}/${module}.json`)
}

const locales: LocaleObject[] = localeConfig.locales.map(locale => ({
  ...locale,
  code: locale.code as LocaleObject['code'],
  files: localeFiles(locale.code),
}))

export const currentLocales = [...locales].sort((a, b) => a.code.localeCompare(b.code))
