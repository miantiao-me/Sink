# ⚡ Sink

**一个简单/快速/安全的链接缩短器，带有分析功能，100% 运行在 Cloudflare 上。**

<a href="https://trendshift.io/repositories/10421" target="_blank">
  <img
    src="https://trendshift.io/api/badge/repositories/10421"
    alt="miantiao-me/Sink | Trendshift"
    width="250"
    height="55"
  />
</a>
<a href="https://news.ycombinator.com/item?id=40843683" target="_blank">
  <img
    src="https://hackernews-badge.vercel.app/api?id=40843683"
    alt="Featured on Hacker News"
    width="250"
    height="55"
  />
</a>
<a href="https://hellogithub.com/repository/57771fd91d1542c7a470959b677a9944" target="_blank">
  <img
    src="https://abroad.hellogithub.com/v1/widgets/recommend.svg?rid=57771fd91d1542c7a470959b677a9944&claim_uid=qi74Zp23wYKeAVB&theme=neutral"
    alt="Featured｜HelloGitHub"
    width="250"
    height="55"
  />
</a>
<a href="https://www.uneed.best/tool/sink" target="_blank">
  <img
    src="https://www.uneed.best/POTW1.png"
    alt="Uneed Badge"
    width="250"
    height="55"
  />
</a>

[<img src="https://devin.ai/assets/deepwiki-badge.png" alt="DeepWiki" height="20"/>](https://deepwiki.com/miantiao-me/Sink)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F69652?style=flat&logo=cloudflare&logoColor=white)
![Nuxt](https://img.shields.io/badge/Nuxt-00DC82?style=flat&logo=nuxtdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?style=flat&logo=shadcnui&logoColor=white)

![Hero](./public/image.png)

---

## ✨ 特性

- **🔗 URL 缩短：** 将您的 URL 压缩到最短长度。
- **📈 分析：** 监控链接分析并收集有洞察力的统计数据。
- **☁️ 无服务器：** 无需传统服务器即可部署。
- **🎨 可自定义 Slug：** 支持个性化 slug 和大小写敏感性。
- **🪄 AI Slug：** 利用 AI 生成 slug。
- **⏰ 链接过期：** 为您的链接设置过期日期。
- **📱 设备路由：** 将 iOS/Android 用户重定向到不同的 URL（App Store 链接）。
- **🖼️ OpenGraph 预览：** 带有标题、描述和图片的自定义社交媒体预览。
- **📊 实时分析：** 实时 3D 地球可视化和实时事件日志。
- **🔲 QR 码：** 为您的短链接生成 QR 码。
- **📦 导入/导出：** 通过 JSON/CSV 文件进行批量迁移。
- **🌍 多语言：** 仪表板的完整 i18n 支持。
- **🌙 深色模式：** 支持浅色、深色和系统主题。

## 🪧 演示

在 [Sink.Cool](https://sink.cool/dashboard) 体验演示。使用以下站点令牌登录：

```txt
站点令牌: SinkCool
```

<details>
  <summary><b>截图</b></summary>
  <img alt="Analytics" src="./docs/images/sink.cool_dashboard.png"/>
  <img alt="Links" src="./docs/images/sink.cool_dashboard_links.png"/>
  <img alt="Link Analytics" src="./docs/images/sink.cool_dashboard_link_slug.png"/>
</details>

## 🧱 使用的技术

- **框架**: [Nuxt](https://nuxt.com/)
- **数据库**: [Cloudflare Workers KV](https://developers.cloudflare.com/kv/)
- **分析引擎**: [Cloudflare Workers Analytics Engine](https://developers.cloudflare.com/analytics/)
- **UI 组件**: [shadcn-vue](https://www.shadcn-vue.com/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **部署**: [Cloudflare](https://www.cloudflare.com/)

## 🚗 路线图 [进行中]

我们欢迎您的贡献和 PR。

- [x] 浏览器扩展 - [Sink Tool](https://github.com/zhuzhuyule/sink-extension)
- [x] Chrome 扩展 - [Sink Quick Shorten](https://chromewebstore.google.com/detail/sink-quick-shorten/emlojomjpenjgkaphajcokijobpkejih)
- [x] Raycast 扩展 - [Raycast-Sink](https://github.com/foru17/raycast-sink)
- [x] Apple 快捷指令 - [Sink Shortcuts](https://s.search1api.com/sink001)
- [x] iOS 应用 - [Sink](https://apps.apple.com/app/id6745417598)
- [ ] 增强的链接管理（使用 Cloudflare D1）
- [ ] 分析增强（支持合并过滤条件）
- [ ] 仪表板性能优化（无限加载）
- [ ] 单元测试

## 🏗️ 部署

> 视频教程：[点击观看](https://www.youtube.com/watch?v=MkU23U2VE9E)

我们目前支持部署到 [Cloudflare Workers](./docs/deployment/workers.md)（推荐）和 [Cloudflare Pages](./docs/deployment/pages.md)。

## ⚒️ 配置

[配置文档](./docs/configuration.md)

## 🔌 API

[API 文档](./docs/api.md)

## 🤖 AI 技能

安装 Sink AI 技能以获得增强的编码辅助：

```bash
npx skills add miantiao-me/sink
```

## 🧰 MCP

我们目前不支持原生 MCP 服务器，但我们有 OpenAPI 文档，您可以使用以下方法来支持 MCP。

> 将 `OPENAPI_SPEC_URL` 中的域名替换为您自己的域名。
>
> `API_KEY` 与环境变量中的 `NUXT_SITE_TOKEN` 相同。

```json
{
  "mcpServers": {
    "sink": {
      "command": "uvx",
      "args": [
        "mcp-openapi-proxy"
      ],
      "env": {
        "OPENAPI_SPEC_URL": "https://sink.cool/_docs/openapi.json",
        "API_KEY": "SinkCool",
        "TOOL_WHITELIST": "/api/link"
      }
    }
  }
}
```

## 🙋🏻 常见问题

[常见问题](./docs/faqs.md)

## 💖 致谢

1. [**Cloudflare**](https://www.cloudflare.com/)
2. [**NuxtHub**](https://hub.nuxt.com/)
3. [**Astroship**](https://astroship.web3templates.com/)
4. [**Tailark**](https://tailark.com/)

## ☕ 赞助

1. [在 X(Twitter) 上关注我](https://404.li/x)。
2. [成为 GitHub 上的赞助者](https://github.com/sponsors/miantiao-me)。
