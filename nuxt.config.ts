import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import { currentLocales } from './i18n/i18n'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@vueuse/motion/nuxt',
    'shadcn-nuxt',
  ],
  devtools: { enabled: true },
  css: ['@/assets/css/tailwind.css'],
  colorMode: {
    classSuffix: '',
  },
  runtimeConfig: {
    siteToken: process.env.NUXT_SITE_TOKEN || crypto.randomUUID(),
    redirectStatusCode: '301',
    linkCacheTtl: 60,
    redirectWithQuery: false,
    homeURL: '',
    cfAccountId: '',
    cfApiToken: '',
    dataset: 'sink',
    aiModel: '@cf/qwen/qwen3-30b-a3b-fp8',
    aiPrompt: `You are a URL shortening assistant, please shorten the URL provided by the user into a SLUG. The SLUG information must come from the URL itself, do not make any assumptions. A SLUG is human-readable and should not exceed three words and can be validated using regular expressions {slugRegex} . Only the best one is returned, the format must be JSON reference {"slug": "example-slug"}`,
    caseSensitive: false,
    listQueryLimit: 500,
    disableBotAccessLog: false,
    disableAutoBackup: false,
    public: {
      previewMode: '',
      slugDefaultLength: '6',
      kvBatchLimit: '50',
    },
  },
  routeRules: {
    '/': {
      prerender: true,
    },
    '/dashboard/**': {
      prerender: true,
      ssr: false,
    },
    '/dashboard': {
      redirect: '/dashboard/links',
    },
    '/api/**': {
      cors: process.env.NUXT_API_CORS === 'true',
    },
  },
  experimental: {
    enforceModuleCompatibility: true,
  },
  compatibilityDate: 'latest',
  nitro: {
    preset: !import.meta.env.CI ? 'cloudflare-module' : undefined,
    experimental: {
      openAPI: true,
    },
    timing: true,
    openAPI: {
      production: 'runtime',
      meta: {
        title: 'Sink API',
        description: 'A Simple / Speedy / Secure Link Shortener with Analytics, 100% run on Cloudflare.',
      },
      route: '/_docs/openapi.json',
      ui: {
        scalar: {
          route: '/_docs/scalar',
        },
        swagger: {
          route: '/_docs/swagger',
        },
      },
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Three.js core as separate chunk
            if (id.includes('node_modules/three/')) {
              return 'three'
            }
            // Globe related libraries as separate chunk
            if (id.includes('node_modules/globe.gl') || id.includes('node_modules/three-globe')) {
              return 'globe'
            }
            // D3 scale related libraries as separate chunk
            if (id.includes('node_modules/d3-scale') || id.includes('node_modules/d3-interpolate') || id.includes('node_modules/d3-color')) {
              return 'd3'
            }
          },
        },
      },
    },
  },
  typescript: {
    strict: false,
    tsConfig: {
      include: ['../schemas/**/*'],
    },
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
  i18n: {
    locales: currentLocales,
    compilation: {
      strictMessage: false,
      escapeHtml: true,
    },
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'sink_i18n_redirected',
      redirectOn: 'root',
    },
    baseUrl: '/',
    defaultLocale: 'en-US',
  },
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './app/components/ui',
  },
})
