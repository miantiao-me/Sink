import { useAppConfig, useFetch, useI18n } from '#imports'
import { computed } from 'vue'
import { formatNumber } from '@/utils/number'

export function useGithubStats() {
  const { github } = useAppConfig()
  const { locale } = useI18n()
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

  const rawStats = computed(() => ({
    stars: data.value?.stars ?? 6000,
    forks: data.value?.forks ?? 4000,
  }))

  const formattedStats = computed(() => ({
    stars: formatNumber(rawStats.value.stars, locale.value),
    forks: formatNumber(rawStats.value.forks, locale.value),
  }))

  return { stats: formattedStats, rawStats, status }
}
