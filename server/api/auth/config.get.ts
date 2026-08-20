export default eventHandler(event => ({
  enabled: isOidcConfigured(event),
}))
