defineRouteMeta({
  openAPI: {
    description: 'Manually trigger a backup to R2',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async (event) => {
  const env = event.context.cloudflare.env

  requireR2Bucket(env)

  await backupKVToR2(env, true)

  return {
    success: true,
    message: 'Backup completed successfully',
  }
})
