defineRouteMeta({
  openAPI: {
    description: 'List distinct link owners with counts, including unassigned pre-migration links. Admin only.',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async (event) => {
  if (!isAdmin(event)) {
    throw createError({ status: 403, statusText: 'Forbidden' })
  }

  return await listOwners(event)
})
