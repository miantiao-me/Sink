import { LinkSchema } from '@@/schemas/link'

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)

  link.slug = normalizeSlug(event, link.slug)

  const existingLink = await getLink(event, link.slug)
  if (existingLink) {
    const shortLink = buildShortLink(event, link.slug)
    return { link: existingLink, shortLink, status: 'existing' }
  }

  await putLink(event, link)
  setResponseStatus(event, 201)
  const shortLink = buildShortLink(event, link.slug)
  return { link, shortLink, status: 'created' }
})
