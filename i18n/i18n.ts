import type { LocaleObject } from '@nuxtjs/i18n'

const locales: LocaleObject[] = [
  {
    code: 'en-US',
    file: 'en-US.json',
    name: 'English',
    emoji: '🇺🇸',
  },
  {
    code: 'zh-CN',
    file: 'zh-CN.json',
    name: '简体中文',
    emoji: '🇨🇳',
  },
  {
    code: 'zh-TW',
    file: 'zh-TW.json',
    name: '繁體中文',
    emoji: '🇹🇼',
  },
  {
    code: 'fr-FR',
    file: 'fr-FR.json',
    name: 'Français',
    emoji: '🇫🇷',
  },
  {
    code: 'it-IT',
    file: 'it-IT.json',
    name: 'Italiano',
    emoji: '🇮🇹',
  },
  {
    code: 'vi-VN',
    file: 'vi-VN.json',
    name: 'Tiếng Việt',
    emoji: '🇻🇳',
  },
  {
    code: 'de-DE',
    file: 'de-DE.json',
    name: 'Deutsch',
    emoji: '🇩🇪',
  },
  {
    code: 'pt-PT',
    file: 'pt-PT.json',
    name: 'Português (PT)',
    emoji: '🇵🇹',
  },
  {
    code: 'pt-BR',
    file: 'pt-BR.json',
    name: 'Português (BR)',
    emoji: '🇧🇷',
  },
]

function buildLocales() {
  const useLocales = Object.values(locales).reduce((acc, data) => {
    acc.push(data)

    return acc
  }, <LocaleObject[]>[])

  return useLocales.sort((a, b) => a.code.localeCompare(b.code))
}

export const currentLocales = buildLocales()
