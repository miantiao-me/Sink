defineRouteMeta({
  openAPI: {
    description: 'Manually trigger a backup to R2',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async (event) => {
  const env = event.context.cloudflare.env

  if (!env.R2) {
    throw createError({
      status: 500,
      message: 'R2 binding not configured',
    })
  }

  await backupKVToR2(env, true)

  return {
    success: true,
    message: 'Backup completed successfully',
  }
})
