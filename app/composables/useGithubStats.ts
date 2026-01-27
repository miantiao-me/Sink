export function useGithubStats() {
  const { github } = useAppConfig()
  const repo = github.replace('https://github.com/', '')

  const { data, status } = useFetch(
    `https://api.github.com/repos/${repo}`,
    {
      key: 'github-stats',
      server: false,
      lazy: true,
      dedupe: 'defer',
      transform: (res: { stargazers_count: number, forks_count: number }) => ({
        stars: res.stargazers_count,
        forks: res.forks_count,
      }),
      getCachedData: key => useNuxtApp().payload.data[key],
    },
  )

  const formattedStats = computed(() => ({
    stars: data.value?.stars?.toLocaleString() ?? '6,000',
    forks: data.value?.forks?.toLocaleString() ?? '4,000',
  }))

  return { stats: formattedStats, status }
}
