export default defineAppConfig({
  title: 'Sink',
  github: 'https://github.com/miantiao-me/sink',
  twitter: 'https://sink.cool/x',
  telegram: 'https://sink.cool/telegram',
  description: 'A Simple / Speedy / Secure Link Shortener with Analytics, 100% run on Cloudflare.',
  image: 'https://sink.cool/banner.png',
  previewTTL: 300, // 5 minutes
  slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  reserveSlug: [
    'dashboard',
  ],
})
