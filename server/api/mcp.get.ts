// The endpoint runs the SDK's stateless Streamable HTTP transport, which has no
// standalone GET stream and mints no sessions, so POST is the only method answered.
export default eventHandler((event) => {
  setResponseHeader(event, 'Allow', 'POST')
  throw createError({ status: 405, statusText: 'Method Not Allowed' })
})
