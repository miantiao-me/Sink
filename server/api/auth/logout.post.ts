export default eventHandler(async (event) => {
  assertSameOriginUnsafeRequest(event)
  clearOidcSession(event)
  setResponseStatus(event, 204)
})
