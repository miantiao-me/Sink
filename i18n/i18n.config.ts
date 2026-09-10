export default defineI18nConfig(() => {
  return {
    legacy: false,
    fallbackLocale: 'en-US',
    fallbackWarn: import.meta.dev,
    missingWarn: import.meta.dev,
  }
})
