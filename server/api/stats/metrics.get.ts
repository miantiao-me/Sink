export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, MetricsQuerySchema.parse)
  return useWAE(event, buildMetricsQuery(query, event))
})
