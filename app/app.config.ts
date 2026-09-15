export default defineAppConfig({
  title: 'ToShort - To.cd',
  github: 'https://github.com/miantiao-me/sink',
  coffee: 'https://to.cd/coffee',
  twitter: 'https://to.cd/x',
  telegram: 'https://to.cd/telegram',
  description: 'To.cd is a concise and efficient URL shortening service platform that provides fast, secure, and stable link shortening services, supporting features like custom short links, data statistics, and QR code generation, 100% run on Cloudflare.',
  image: 'https://sink.cool/banner.png',
  previewTTL: 300, // 5 minutes
  slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  reserveSlug: [
    'dashboard',
  ],
})
