import { useFetch } from '#imports'
import { version as currentVersion } from '@@/package.json'
import { computed } from 'vue'

export function useVersionCheck() {
  const { data } = useFetch<{ version: string }>('https://cdn.jsdelivr.net/gh/miantiao-me/Sink@master/package.json')

  const latestVersion = computed(() => data.value?.version)
  const hasUpdate = computed(() => latestVersion.value ? compareVersion(latestVersion.value, currentVersion) > 0 : false)

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
