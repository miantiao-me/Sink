import { readdir, readFile } from 'node:fs/promises'

const i18nDir = new URL('../i18n/', import.meta.url)
const configPath = new URL('config.json', i18nDir)
const localesDir = new URL('locales/', i18nDir)
const referenceLocale = 'en-US'
const placeholderPattern = /\{([^{}]+)\}/g
const errors = []

function valueType(value) {
  if (value === null)
    return 'null'
  if (Array.isArray(value))
    return 'array'
  return typeof value
}

function getLeafValues(value, filePath, prefix = '', leaves = new Map()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value)

    if (entries.length > 0) {
      for (const [key, child] of entries)
        getLeafValues(child, filePath, prefix ? `${prefix}.${key}` : key, leaves)
      return leaves
    }
  }

  const valuePath = prefix ? `${filePath}:${prefix}` : filePath

  if (typeof value !== 'string') {
    errors.push(`${valuePath}: locale leaf must be a string, got ${valueType(value)}`)
    return leaves
  }

  leaves.set(prefix, value)
  return leaves
}

function getPlaceholders(value) {
  return [...value.matchAll(placeholderPattern)]
    .map(match => match[1])
    .filter((name, index, names) => names.indexOf(name) === index)
    .sort()
}

function formatSet(values) {
  return values.length > 0 ? values.join(', ') : '(none)'
}

function findDuplicates(values) {
  const seen = new Set()
  const duplicates = new Set()

  for (const value of values) {
    if (seen.has(value))
      duplicates.add(value)
    seen.add(value)
  }

  return [...duplicates].sort()
}

let config

try {
  config = JSON.parse(await readFile(configPath, 'utf8'))
}
catch (error) {
  errors.push(`i18n/config.json: invalid JSON (${error.message})`)
}

let configuredModules = []
let configuredLocales = []

if (config) {
  if (!Array.isArray(config.modules)) {
    errors.push('i18n/config.json: modules must be an array')
  }
  else {
    configuredModules = config.modules.filter((module, index) => {
      if (typeof module === 'string' && module.length > 0)
        return true
      errors.push(`i18n/config.json:modules.${index}: module must be a non-empty string`)
      return false
    })

    for (const module of findDuplicates(configuredModules))
      errors.push(`i18n/config.json:modules: duplicate module "${module}"`)
  }

  if (!Array.isArray(config.locales)) {
    errors.push('i18n/config.json: locales must be an array')
  }
  else {
    configuredLocales = config.locales.flatMap((locale, index) => {
      if (!locale || typeof locale !== 'object' || Array.isArray(locale)) {
        errors.push(`i18n/config.json:locales.${index}: locale must be an object`)
        return []
      }

      for (const field of ['code', 'name', 'emoji']) {
        if (typeof locale[field] !== 'string' || locale[field].length === 0)
          errors.push(`i18n/config.json:locales.${index}.${field}: must be a non-empty string`)
      }

      return typeof locale.code === 'string' && locale.code.length > 0 ? [locale.code] : []
    })

    for (const code of findDuplicates(configuredLocales))
      errors.push(`i18n/config.json:locales: duplicate locale code "${code}"`)
  }
}

if (!configuredLocales.includes(referenceLocale))
  errors.push(`i18n/config.json:locales: reference locale "${referenceLocale}" is missing`)

const localeEntries = await readdir(localesDir, { withFileTypes: true })
const localeNames = localeEntries
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()
const localeNameSet = new Set(localeNames)
const configuredLocaleSet = new Set(configuredLocales)

for (const locale of configuredLocales) {
  if (!localeNameSet.has(locale))
    errors.push(`i18n/locales/${locale}: configured locale directory is missing`)
}

for (const locale of localeNames) {
  if (!configuredLocaleSet.has(locale))
    errors.push(`i18n/locales/${locale}: unexpected locale directory`)
}

const expectedModuleNames = configuredModules.map(module => `${module}.json`)
const expectedModuleNameSet = new Set(expectedModuleNames)
const locales = new Map()

for (const locale of localeNames) {
  const localeDir = new URL(`${locale}/`, localesDir)
  const moduleNames = (await readdir(localeDir, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name)
    .sort()
  const moduleNameSet = new Set(moduleNames)
  const modules = new Map()

  for (const moduleName of expectedModuleNames) {
    if (!moduleNameSet.has(moduleName))
      errors.push(`i18n/locales/${locale}/${moduleName}: configured module file is missing`)
  }

  for (const moduleName of moduleNames) {
    if (!expectedModuleNameSet.has(moduleName))
      errors.push(`i18n/locales/${locale}/${moduleName}: unexpected module file`)
  }

  for (const moduleName of moduleNames) {
    const filePath = `i18n/locales/${locale}/${moduleName}`

    try {
      const value = JSON.parse(await readFile(new URL(moduleName, localeDir), 'utf8'))
      modules.set(moduleName, getLeafValues(value, filePath))
    }
    catch (error) {
      errors.push(`${filePath}: invalid JSON (${error.message})`)
    }
  }

  locales.set(locale, modules)
}

const reference = locales.get(referenceLocale)

if (reference) {
  for (const [locale, modules] of locales) {
    if (locale === referenceLocale)
      continue

    for (const moduleName of expectedModuleNames) {
      const referenceLeaves = reference.get(moduleName)
      const leaves = modules.get(moduleName)

      if (!referenceLeaves || !leaves)
        continue

      for (const key of referenceLeaves.keys()) {
        const keyPath = `i18n/locales/${locale}/${moduleName}:${key}`

        if (!leaves.has(key)) {
          errors.push(`${keyPath}: key is missing`)
          continue
        }

        const expected = getPlaceholders(referenceLeaves.get(key))
        const actual = getPlaceholders(leaves.get(key))

        if (expected.join('\0') !== actual.join('\0')) {
          errors.push(
            `${keyPath}: placeholders differ; expected ${formatSet(expected)}, got ${formatSet(actual)}`,
          )
        }
      }

      for (const key of leaves.keys()) {
        if (!referenceLeaves.has(key))
          errors.push(`i18n/locales/${locale}/${moduleName}:${key}: unexpected key`)
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Locale contract check failed with ${errors.length} error(s):`)
  for (const error of errors)
    console.error(`- ${error}`)
  process.exitCode = 1
}
else {
  console.log(
    `Locale contracts valid: ${configuredLocales.length} locales, ${configuredModules.length} modules.`,
  )
}
