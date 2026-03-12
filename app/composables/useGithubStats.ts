import { useAppConfig, useFetch } from '#imports'
import { computed } from 'vue'

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
      getCachedData: (key, nuxtApp) => nuxtApp.payload?.data?.[key] ?? nuxtApp.static?.data?.[key],
      onResponseError: ({ response }) => {
        // Silently handle GitHub API errors (rate limit, network issues, etc.)
        console.warn(`[useGithubStats] GitHub API error: ${response.status}`)
      },
    },
  )

  const formattedStats = computed(() => ({
    stars: data.value?.stars?.toLocaleString() ?? '6,000',
    forks: data.value?.forks?.toLocaleString() ?? '4,000',
  }))

  return { stats: formattedStats, status }
}
