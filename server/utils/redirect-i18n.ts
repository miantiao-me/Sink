export const REDIRECT_TRANSLATIONS = {
  'en': {
    passwordTitle: 'Password Required',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    passwordError: 'Incorrect password',
    continue: 'Continue',
    unsafeTitle: 'Potentially Unsafe Link',
    unsafeDesc: 'This link has been flagged as potentially unsafe. Proceed with caution.',
    goBack: 'Go Back',
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
  'ja': {
    passwordTitle: 'パスワードが必要です',
    passwordLabel: 'パスワード',
    passwordPlaceholder: 'パスワードを入力',
    passwordError: 'パスワードが間違っています',
    continue: '続ける',
    unsafeTitle: '安全でない可能性のあるリンク',
    unsafeDesc: 'このリンクは安全でない可能性があるとしてフラグが付けられています。注意して進んでください。',
    goBack: '戻る',
  },
  'ko': {
    passwordTitle: '비밀번호 필요',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '비밀번호 입력',
    passwordError: '비밀번호가 올바르지 않습니다',
    continue: '계속',
    unsafeTitle: '잠재적으로 안전하지 않은 링크',
    unsafeDesc: '이 링크는 잠재적으로 안전하지 않은 것으로 표시되었습니다. 주의해서 진행하십시오.',
    goBack: '뒤로 가기',
  },
  'fr': {
    passwordTitle: 'Mot de passe requis',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Entrez le mot de passe',
    passwordError: 'Mot de passe incorrect',
    continue: 'Continuer',
    unsafeTitle: 'Lien potentiellement dangereux',
    unsafeDesc: 'Ce lien a été signalé comme potentiellement dangereux. Procédez avec prudence.',
    goBack: 'Retour',
  },
  'de': {
    passwordTitle: 'Passwort erforderlich',
    passwordLabel: 'Passwort',
    passwordPlaceholder: 'Passwort eingeben',
    passwordError: 'Falsches Passwort',
    continue: 'Weiter',
    unsafeTitle: 'Potenziell unsicherer Link',
    unsafeDesc: 'Dieser Link wurde als potenziell unsicher markiert. Gehen Sie mit Vorsicht vor.',
    goBack: 'Zurück',
  },
  'es': {
    passwordTitle: 'Contraseña requerida',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Introducir contraseña',
    passwordError: 'Contraseña incorrecta',
    continue: 'Continuar',
    unsafeTitle: 'Enlace potencialmente inseguro',
    unsafeDesc: 'Este enlace ha sido marcado como potencialmente inseguro. Proceda con precaución.',
    goBack: 'Volver',
  },
  'pt': {
    passwordTitle: 'Senha necessária',
    passwordLabel: 'Senha',
    passwordPlaceholder: 'Digite a senha',
    passwordError: 'Senha incorreta',
    continue: 'Continuar',
    unsafeTitle: 'Link potencialmente inseguro',
    unsafeDesc: 'Este link foi sinalizado como potencialmente inseguro. Prossiga com cuidado.',
    goBack: 'Voltar',
  },
  'ru': {
    passwordTitle: 'Требуется пароль',
    passwordLabel: 'Пароль',
    passwordPlaceholder: 'Введите пароль',
    passwordError: 'Неверный пароль',
    continue: 'Продолжить',
    unsafeTitle: 'Потенциально небезопасная ссылка',
    unsafeDesc: 'Эта ссылка была отмечена как потенциально небезопасная. Будьте осторожны.',
    goBack: 'Назад',
  },
} as const

export type RedirectLocale = keyof typeof REDIRECT_TRANSLATIONS

const SUPPORTED_LOCALES = Object.keys(REDIRECT_TRANSLATIONS) as RedirectLocale[]

// Normalize locale codes that may use underscores or inconsistent casing (e.g. zh_cn -> zh-CN)
function normalizeLocaleCode(code: string): string {
  const normalized = code.replace('_', '-')
  try {
    return Intl.getCanonicalLocales(normalized)[0] || ''
  }
  catch {
    return ''
  }
}

export function resolveRedirectLocale(header: string | undefined): RedirectLocale {
  if (!header)
    return 'en'

  const languages = header.split(',')
    .map((lang) => {
      const parts = lang.trim().split(';q=')
      const code = parts[0] || ''
      const q = parts[1]
      return { code: normalizeLocaleCode(code), q: q ? Number.parseFloat(q) : 1.0 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { code } of languages) {
    if (!code)
      continue
    // Exact match (e.g. zh-CN)
    if (SUPPORTED_LOCALES.includes(code as RedirectLocale))
      return code as RedirectLocale
    // Prefix match (e.g. en-US -> en)
    const prefix = code.split('-')[0]
    if (prefix && SUPPORTED_LOCALES.includes(prefix as RedirectLocale))
      return prefix as RedirectLocale
  }

  return 'en'
}
