// Dashboard Layer - Client-side only rendering
export default defineNuxtConfig({
  ssr: false,

  routeRules: {
    '/dashboard/**': {
      prerender: true,
    },
    '/dashboard': {
      redirect: '/dashboard/links',
    },
  },
})
