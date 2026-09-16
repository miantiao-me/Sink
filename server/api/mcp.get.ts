// The 2026-07-28 revision removed the standalone GET stream and protocol-level
// sessions, so POST is the only method this endpoint answers.
export default eventHandler((event) => {
  setResponseHeader(event, 'Allow', 'POST')
  throw createError({ status: 405, statusText: 'Method Not Allowed' })
})
