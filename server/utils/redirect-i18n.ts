import type { H3Event } from 'h3'
import { parseAcceptLanguage } from 'intl-parse-accept-language'

interface RedirectTranslation {
  passwordTitle: string
  passwordLabel: string
  passwordPlaceholder: string
  passwordError: string
  continue: string
  unsafeTitle: string
  unsafeDesc: string
  goBack: string
}

const REDIRECT_LOCALES = [
  'de-DE',
  'en-US',
  'fr-FR',
  'id-ID',
  'it-IT',
  'pt-BR',
  'pt-PT',
  'vi-VN',
  'zh-CN',
  'zh-TW',
] as const

export type RedirectLocale = typeof REDIRECT_LOCALES[number]

const DEFAULT_REDIRECT_LOCALE = 'en-US' satisfies RedirectLocale
const REDIRECT_LOCALE_COOKIE = 'sink_i18n_redirected'

export const REDIRECT_TRANSLATIONS = {
  'de-DE': {
    passwordTitle: 'Passwort erforderlich',
    passwordLabel: 'Passwort',
    passwordPlaceholder: 'Passwort eingeben',
    passwordError: 'Falsches Passwort',
    continue: 'Weiter',
    unsafeTitle: 'Potenziell unsicherer Link',
    unsafeDesc: 'Dieser Link wurde als potenziell unsicher markiert. Gehen Sie mit Vorsicht vor.',
    goBack: 'Zurück',
  },
  'en-US': {
    passwordTitle: 'Password Required',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    passwordError: 'Incorrect password',
    continue: 'Continue',
    unsafeTitle: 'Potentially Unsafe Link',
    unsafeDesc: 'This link has been flagged as potentially unsafe. Proceed with caution.',
    goBack: 'Go Back',
  },
  'fr-FR': {
    passwordTitle: 'Mot de passe requis',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Entrez le mot de passe',
    passwordError: 'Mot de passe incorrect',
    continue: 'Continuer',
    unsafeTitle: 'Lien potentiellement dangereux',
    unsafeDesc: 'Ce lien a été signalé comme potentiellement dangereux. Procédez avec prudence.',
    goBack: 'Retour',
  },
  'id-ID': {
    passwordTitle: 'Diperlukan Kata Sandi',
    passwordLabel: 'Kata Sandi',
    passwordPlaceholder: 'Masukkan kata sandi',
    passwordError: 'Kata sandi salah',
    continue: 'Lanjutkan',
    unsafeTitle: 'Tautan Berpotensi Tidak Aman',
    unsafeDesc: 'Tautan ini telah ditandai berpotensi tidak aman. Lanjutkan dengan hati-hati.',
    goBack: 'Kembali',
  },
  'it-IT': {
    passwordTitle: 'Password richiesta',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Inserisci la password',
    passwordError: 'Password errata',
    continue: 'Continua',
    unsafeTitle: 'Link potenzialmente non sicuro',
    unsafeDesc: 'Questo link è stato contrassegnato come potenzialmente non sicuro. Procedi con cautela.',
    goBack: 'Indietro',
  },
  'pt-BR': {
    passwordTitle: 'Senha necessária',
    passwordLabel: 'Senha',
    passwordPlaceholder: 'Digite a senha',
    passwordError: 'Senha incorreta',
    continue: 'Continuar',
    unsafeTitle: 'Link potencialmente inseguro',
    unsafeDesc: 'Este link foi sinalizado como potencialmente inseguro. Prossiga com cuidado.',
    goBack: 'Voltar',
  },
  'pt-PT': {
    passwordTitle: 'Palavra-passe necessária',
    passwordLabel: 'Palavra-passe',
    passwordPlaceholder: 'Introduza a palavra-passe',
    passwordError: 'Palavra-passe incorreta',
    continue: 'Continuar',
    unsafeTitle: 'Ligação potencialmente insegura',
    unsafeDesc: 'Esta ligação foi assinalada como potencialmente insegura. Prossiga com cuidado.',
    goBack: 'Voltar',
  },
  'vi-VN': {
    passwordTitle: 'Yêu cầu mật khẩu',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Nhập mật khẩu',
    passwordError: 'Mật khẩu không đúng',
    continue: 'Tiếp tục',
    unsafeTitle: 'Liên kết có thể không an toàn',
    unsafeDesc: 'Liên kết này đã bị đánh dấu là có thể không an toàn. Hãy thận trọng khi tiếp tục.',
    goBack: 'Quay lại',
  },
  'zh-CN': {
    passwordTitle: '需要密码',
    passwordLabel: '密码',
    passwordPlaceholder: '请输入密码',
    passwordError: '密码错误',
    continue: '继续',
    unsafeTitle: '潜在不安全链接',
    unsafeDesc: '此链接已被标记为潜在不安全。请谨慎访问。',
    goBack: '返回',
  },
  'zh-TW': {
    passwordTitle: '需要密碼',
    passwordLabel: '密碼',
    passwordPlaceholder: '請輸入密碼',
    passwordError: '密碼錯誤',
    continue: '繼續',
    unsafeTitle: '潛在不安全連結',
    unsafeDesc: '此連結已被標記為潛在不安全。請謹慎訪問。',
    goBack: '返回',
  },
} as const satisfies Record<RedirectLocale, RedirectTranslation>

const SUPPORTED_LOCALES = [...REDIRECT_LOCALES]

const LOCALE_ALIASES: Record<string, RedirectLocale> = {
  'de': 'de-DE',
  'en': 'en-US',
  'fr': 'fr-FR',
  'id': 'id-ID',
  'it': 'it-IT',
  'pt': 'pt-BR',
  'vi': 'vi-VN',
  'zh': 'zh-CN',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  'zh-HK': 'zh-TW',
  'zh-MO': 'zh-TW',
}

function normalizeLocaleCode(code: string): string {
  const normalized = code.replace('_', '-')
  try {
    return Intl.getCanonicalLocales(normalized)[0] || ''
  }
  catch {
    return ''
  }
}

function resolveLocaleCode(code: string | undefined): RedirectLocale | undefined {
  if (!code)
    return undefined

  const normalized = normalizeLocaleCode(code)
  if (!normalized)
    return undefined

  if (SUPPORTED_LOCALES.includes(normalized as RedirectLocale))
    return normalized as RedirectLocale

  const alias = LOCALE_ALIASES[normalized]
  if (alias)
    return alias

  const prefix = normalized.split('-')[0]
  return prefix ? LOCALE_ALIASES[prefix] : undefined
}

export function resolveRedirectLocale(event: H3Event): RedirectLocale {
  const cookieLocale = resolveLocaleCode(getCookie(event, REDIRECT_LOCALE_COOKIE))
  if (cookieLocale)
    return cookieLocale

  const header = getHeader(event, 'accept-language')
  if (!header)
    return DEFAULT_REDIRECT_LOCALE

  for (const code of parseAcceptLanguage(header)) {
    const locale = resolveLocaleCode(code)
    if (locale)
      return locale
  }

  return DEFAULT_REDIRECT_LOCALE
}
