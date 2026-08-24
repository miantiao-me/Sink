import { computed } from 'vue'
import { useAppConfig, useFetch } from '#imports'

export function useGithubStats() {
  const { github } = useAppConfig()
  const repo = github.replace('https://github.com/', '')

  const { data } = useFetch(
    `https://api.github.com/repos/${repo}`,
    {
      transform: (res: { stargazers_count: number, forks_count: number }) => ({
        stars: res.stargazers_count,
        forks: res.forks_count,
      }),
    },
  )

  const rawStats = computed(() => ({
    stars: data.value?.stars ?? 6000,
    forks: data.value?.forks ?? 4000,
  }))

  return { rawStats }
}
