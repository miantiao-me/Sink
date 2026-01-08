export default defineAppConfig({
  title: 'Trueleap',
  email: '',
  github: '',
  twitter: '',
  telegram: '',
  mastodon: '',
  blog: '',
  description: 'A Simple / Speedy / Secure Link Shortener with Analytics.',
  image: '',
  previewTTL: 300, // 5 minutes
  slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  reserveSlug: [
    'dashboard',
  ],
})
