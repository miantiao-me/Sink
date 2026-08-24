import { version as currentVersion } from '@@/package.json'
import { computed } from 'vue'
import { useFetch } from '#imports'

export function useVersionCheck() {
  const { data, status } = useFetch<{ version: string }>('https://cdn.jsdelivr.net/gh/miantiao-me/Sink@master/package.json', {
    key: 'latest-sink-version',
    server: false,
    lazy: true,
    dedupe: 'defer',
  })

  const latestVersion = computed(() => data.value?.version)
  const hasUpdate = computed(() => status.value === 'success'
    && latestVersion.value !== undefined
    && compareVersion(latestVersion.value, currentVersion) > 0)

  return { hasUpdate, currentVersion, latestVersion }
}

function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0))
      return 1
    if ((pa[i] || 0) < (pb[i] || 0))
      return -1
  }
  return 0
}
