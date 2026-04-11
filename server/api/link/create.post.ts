import { LinkSchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    $global: {
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: '使用 NUXT_SITE_TOKEN 作为 bearer token',
          },
        },
      },
    },
    description: '创建新的短链接',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['url'],
            properties: {
              url: { type: 'string', description: '目标 URL' },
              slug: { type: 'string', description: '自定义 slug（未提供则自动生成）' },
              comment: { type: 'string', description: '可选注释' },
              expiration: { type: 'integer', description: '过期时间戳（Unix 秒）' },
              title: { type: 'string', description: '链接预览的自定义标题' },
              description: { type: 'string', description: '链接预览的自定义描述' },
              image: { type: 'string', description: '链接预览的自定义图片' },
              apple: { type: 'string', description: 'Apple App Store 重定向 URL' },
              google: { type: 'string', description: 'Google Play Store 重定向 URL' },
              cloaking: { type: 'boolean', description: '启用链接伪装（掩盖目标 URL）' },
              redirectWithQuery: { type: 'boolean', description: '将查询参数附加到目标 URL' },
              password: { type: 'string', description: '链接的密码保护' },
              unsafe: { type: 'boolean', description: '标记链接为不安全，在重定向前显示警告页面' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)

  link.slug = normalizeSlug(event, link.slug)

  // 通过 Safe Browsing DoH 自动检测不安全的 URL
  if (link.unsafe === undefined) {
    const safe = await isSafeUrl(event, link.url)
    if (!safe) {
      link.unsafe = true
    }
  }

  const existingLink = await getLink(event, link.slug)
  if (existingLink) {
    throw createError({
      status: 409,
      statusText: 'Link already exists',
    })
  }

  await putLink(event, link)
  setResponseStatus(event, 201)
  const shortLink = buildShortLink(event, link.slug)
  return { link, shortLink }
})
