// Dashboard Layer - Client-side only rendering
export default defineNuxtConfig({
  ssr: false,

  routeRules: {
    '/dashboard/**': {
      prerender: false,
    },
    '/dashboard': {
      redirect: '/dashboard/links',
    },
  },
})
