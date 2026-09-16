export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, ViewsQuerySchema.parse)
  return useWAE(event, buildViewsQuery(query, event))
})
