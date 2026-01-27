<script setup lang="ts">
import {
  Globe,
  Laptop,
  MonitorCheck,
  Smartphone,
  Tablet,
  Terminal,
} from 'lucide-vue-next'

import {
  AndroidIcon,
  AppleIcon,
  DebianIcon,
  FacebookIcon,
  FirefoxBrowserIcon,
  GnuIcon,
  GoogleChromeIcon,
  GoogleIcon,
  HuaweiIcon,
  IOsIcon,
  LinuxIcon,
  MacOsIcon,
  OperaIcon,
  SafariIcon,
  SamsungIcon,
  UbuntuIcon,
  VivoIcon,
  WearOsIcon,
  WeChatIcon,
  XiaomiIcon,
  XIcon,
  YandexCloudIcon,
} from 'vue3-simple-icons'

withDefaults(defineProps<{
  name: string
  type?: string
}>(), {
  type: 'browser',
})

const iconMaps: Record<string, Component> = {
  'android': AndroidIcon,
  'android browser': AndroidIcon,
  'browser': Globe,
  'chrome': GoogleChromeIcon,
  'chrome headless': GoogleChromeIcon,
  'chrome webview': GoogleChromeIcon,
  'chromium': GoogleChromeIcon,
  'curl': Terminal,
  'debian': DebianIcon,
  'desktop': MonitorCheck,
  'facebook': FacebookIcon,
  'facebookexternalhit': FacebookIcon,
  'firefox': FirefoxBrowserIcon,
  'googlebot': GoogleIcon,
  'googlebot-image': GoogleIcon,
  'gnu': GnuIcon,
  'harmonyos': HuaweiIcon,
  'huawei browser': HuaweiIcon,
  'ios': IOsIcon,
  'ipad': AppleIcon,
  'iphone': AppleIcon,
  'ipod': AppleIcon,
  'laptop': Laptop,
  'linux': LinuxIcon,
  'macintosh': AppleIcon,
  'macos': MacOsIcon,
  'miui browser': XiaomiIcon,
  'mobile': Smartphone,
  'mobile chrome': GoogleChromeIcon,
  'mobile firefox': FirefoxBrowserIcon,
  'mobile safari': SafariIcon,
  'opera': OperaIcon,
  'os': MonitorCheck,
  'safari': SafariIcon,
  'samsung internet': SamsungIcon,
  'tablet': Tablet,
  'twitterbot': XIcon,
  'ubuntu': UbuntuIcon,
  'vivo browser': VivoIcon,
  'wechat': WeChatIcon,
  'wearable': WearOsIcon,
  'yandex': YandexCloudIcon,
}
</script>

<template>
  <div class="w-full truncate">
    <component
      :is="iconMaps[name.toLowerCase()] || iconMaps[type]"
      class="float-left h-5 w-5 py-0.5"
    />
    <span>{{ name }}</span>
  </div>
</template>
