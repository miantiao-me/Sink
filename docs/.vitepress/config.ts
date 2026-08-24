import { defineConfig } from 'vitepress'

const siteUrl = 'https://docs.sink.cool'
const socialLinks = [
  { icon: 'github' as const, link: 'https://github.com/miantiao-me/Sink', ariaLabel: 'Sink on GitHub' },
]
const chineseSocialLinks = [
  { icon: 'github' as const, link: 'https://github.com/miantiao-me/Sink', ariaLabel: 'GitHub 上的 Sink' },
]

function routeFromRelativePath(relativePath: string): string {
  const isIndex = /(?:^|\/)index\.md$/.test(relativePath)
  const route = relativePath
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, '')
    .replace(/\/$/, '')
  const pathname = `/${route}`.replace(/\/+/g, '/')
  return isIndex && pathname !== '/' ? `${pathname}/` : pathname
}

export default defineConfig({
  title: 'Sink Documentation',
  description: 'A Simple / Speedy / Secure Link Shortener with Analytics, 100% run on Cloudflare.',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: siteUrl,
  },
  head: [
    ['link', { rel: 'icon', href: 'https://sink.cool/favicon.ico', sizes: 'any' }],
  ],
  locales: {
    'root': {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Deployment', link: '/deployment/workers' },
          { text: 'Features', link: '/features/links' },
          { text: 'Operations', link: '/features/import-export' },
          { text: 'Integrations', link: '/integrations/' },
          { text: 'API', link: '/api/' },
          { text: 'Website', link: 'https://sink.cool' },
        ],
        sidebar: {
          '/': [
            { text: 'Introduction', link: '/' },
            { text: 'Guide', items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Architecture', link: '/guide/architecture' },
            ] },
            { text: 'Deployment', items: [
              { text: 'Cloudflare Workers', link: '/deployment/workers' },
              { text: 'Cloudflare Pages', link: '/deployment/pages' },
              { text: 'Upgrading Sink', link: '/deployment/upgrading' },
            ] },
            { text: 'Configuration', items: [
              { text: 'Environment Variables', link: '/configuration/' },
              { text: 'Cloudflare Access', link: '/configuration/cloudflare-access' },
              { text: 'Webhooks', link: '/configuration/webhooks' },
            ] },
            { text: 'Features', items: [
              { text: 'Links', link: '/features/links' },
              { text: 'Analytics and Realtime', link: '/features/analytics' },
              { text: 'Workers AI', link: '/features/ai' },
            ] },
            { text: 'Operations', items: [
              { text: 'Import and Export', link: '/features/import-export' },
              { text: 'Link Backups', link: '/features/backups' },
              { text: 'Storage setup / migration', link: '/storage/kv-to-d1' },
            ] },
            { text: 'Integrations', items: [
              { text: 'Integrations', link: '/integrations/' },
            ] },
            { text: 'Reference', items: [
              { text: 'API', link: '/api/' },
              { text: 'Troubleshooting', link: '/faqs' },
            ] },
          ],
        },
        editLink: {
          pattern: 'https://github.com/miantiao-me/Sink/edit/master/docs/:path',
          text: 'Edit this page on GitHub',
        },
        socialLinks,
      },
    },
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh-CN/',
      title: 'Sink 文档',
      description: 'A Simple / Speedy / Secure Link Shortener with Analytics, 100% run on Cloudflare.',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh-CN/guide/getting-started' },
          { text: '部署', link: '/zh-CN/deployment/workers' },
          { text: '功能', link: '/zh-CN/features/links' },
          { text: '运维', link: '/zh-CN/features/import-export' },
          { text: '集成', link: '/zh-CN/integrations/' },
          { text: 'API', link: '/zh-CN/api/' },
          { text: '官网', link: 'https://sink.cool' },
        ],
        sidebar: {
          '/zh-CN/': [
            { text: '简介', link: '/zh-CN/' },
            { text: '指南', items: [
              { text: '快速开始', link: '/zh-CN/guide/getting-started' },
              { text: '架构', link: '/zh-CN/guide/architecture' },
            ] },
            { text: '部署', items: [
              { text: 'Cloudflare Workers', link: '/zh-CN/deployment/workers' },
              { text: 'Cloudflare Pages', link: '/zh-CN/deployment/pages' },
              { text: '升级 Sink', link: '/zh-CN/deployment/upgrading' },
            ] },
            { text: '配置', items: [
              { text: '环境变量', link: '/zh-CN/configuration/' },
              { text: 'Cloudflare Access', link: '/zh-CN/configuration/cloudflare-access' },
              { text: 'Webhook', link: '/zh-CN/configuration/webhooks' },
            ] },
            { text: '功能', items: [
              { text: '链接', link: '/zh-CN/features/links' },
              { text: '分析与实时视图', link: '/zh-CN/features/analytics' },
              { text: 'Workers AI', link: '/zh-CN/features/ai' },
            ] },
            { text: '运维', items: [
              { text: '导入与导出', link: '/zh-CN/features/import-export' },
              { text: '链接备份', link: '/zh-CN/features/backups' },
              { text: '存储初始化 / 迁移', link: '/zh-CN/storage/kv-to-d1' },
            ] },
            { text: '集成', items: [
              { text: '集成', link: '/zh-CN/integrations/' },
            ] },
            { text: '参考', items: [
              { text: 'API', link: '/zh-CN/api/' },
              { text: '故障排除', link: '/zh-CN/faqs' },
            ] },
          ],
        },
        editLink: {
          pattern: 'https://github.com/miantiao-me/Sink/edit/master/docs/:path',
          text: '在 GitHub 上编辑此页',
        },
        lastUpdated: { text: '最后更新于' },
        outline: { label: '页面导航' },
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳到主要内容',
        socialLinks: chineseSocialLinks,
      },
    },
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          'zh-CN': {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
        },
      },
    },
  },
  transformPageData(pageData) {
    const currentPath = routeFromRelativePath(pageData.relativePath)
    const isChinese = currentPath.startsWith('/zh-CN/')
    const englishPath = isChinese ? currentPath.replace(/^\/zh-CN/, '') : currentPath
    const chinesePath = isChinese ? currentPath : `/zh-CN${currentPath}`
    const canonical = `${siteUrl}${currentPath}`
    const pageTitle = pageData.frontmatter.title
    const title = pageData.frontmatter.layout === 'home'
      ? pageTitle
      : `${pageTitle} | ${isChinese ? 'Sink 文档' : 'Sink Documentation'}`
    const description = pageData.frontmatter.description
    const locale = isChinese ? 'zh_CN' : 'en_US'

    pageData.frontmatter.head = [
      ...(pageData.frontmatter.head ?? []),
      ['link', { rel: 'canonical', href: canonical }],
      ['link', { rel: 'alternate', hreflang: 'en-US', href: `${siteUrl}${englishPath}` }],
      ['link', { rel: 'alternate', hreflang: 'zh-CN', href: `${siteUrl}${chinesePath}` }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: `${siteUrl}${englishPath}` }],
      ['meta', { name: 'description', content: description }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:image', content: 'https://sink.cool/banner.png' }],
      ['meta', { property: 'og:locale', content: locale }],
      ['meta', { property: 'og:locale:alternate', content: isChinese ? 'en_US' : 'zh_CN' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
      ['meta', { name: 'twitter:image', content: 'https://sink.cool/banner.png' }],
    ]
  },
})
