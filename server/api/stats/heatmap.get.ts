export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, HeatmapQuerySchema.parse)
  return useWAE(event, buildHeatmapQuery(query, event))
})
