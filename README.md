# ⚡ Sink

**A Simple / Speedy / Secure Link Shortener with Analytics, 100% run on Cloudflare.**

[Website](https://sink.cool) · [Documentation](https://docs.sink.cool) · [API Reference](https://sink.cool/_docs/scalar)

<a href="https://trendshift.io/repositories/20331" target="_blank">
  <img
    src="https://trendshift.io/api/badge/repositories/20331"
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

## ✨ Features

- **🔗 URL Shortening:** Compress your URLs to their minimal length.
- **📈 Analytics:** Monitor link analytics and gather insightful statistics.
- **☁️ Serverless:** Deploy without the need for traditional servers.
- **🎨 Customizable Slug:** Support personalized slugs, UTM parameters, and optional case-sensitive slug matching through configuration.
- **🪄 AI Assistance:** Optionally use Cloudflare Workers AI to generate slugs and OpenGraph metadata from page content.
- **⏰ Link Control:** Set expirations, passwords, and unsafe-link warning pages.
- **📱 Smart Routing:** Redirect visitors by device or country.
- **🖼️ Social Preview:** Customize social previews with titles, descriptions, and images.
- **📊 Near-real-time Analytics:** Display a live 3D globe and event logs using 10-second analytics polling and client-side replay, not SSE or WebSocket.
- **🔲 QR Code:** Generate QR codes for your short links.
- **📦 Import/Export:** Transfer links via JSON and export access analytics via CSV.
- **🌍 Multi-language:** Full i18n support for dashboard and redirect pages.

> [!TIP]
> **Who is Sink for?**
>
> Sink focuses on **individuals and small teams** who want a simple, self-hosted shortener on Cloudflare.
>
> For professional / business needs (managed service, multi-user, SLA, and more), use **[S.EE](https://sink.cool/see)**.

## 🪧 Demo

Experience the demo at [Sink.Cool](https://sink.cool/dashboard). Log in using the Site Token below:

```txt
Site Token: SinkCool
```

<details>
  <summary><b>Screenshots</b></summary>
  <img alt="Analytics" src="./docs/images/sink.cool_dashboard.png"/>
  <img alt="Links" src="./docs/images/sink.cool_dashboard_links.png"/>
  <img alt="Link Analytics" src="./docs/images/sink.cool_dashboard_link_slug.png"/>
</details>

## 🧱 Technologies Used

- **Framework**: [Nuxt 4](https://nuxt.com/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) is the authoritative link store; [Workers KV](https://developers.cloudflare.com/kv/) is a write-through read cache
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Analytics Engine**: [Cloudflare Workers Analytics Engine](https://developers.cloudflare.com/analytics/)
- **Object Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) for optional logical JSON snapshots
- **AI**: Optional [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- **UI Components**: [shadcn-vue](https://www.shadcn-vue.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Deployment**: [Cloudflare](https://www.cloudflare.com/)

## 🚗 Roadmap [WIP]

We welcome your contributions and PRs.

- [x] Browser Extension - [Sink Tool](https://github.com/zhuzhuyule/sink-extension)
- [x] Chrome Extension - [Sink Quick Shorten](https://chromewebstore.google.com/detail/sink-quick-shorten/emlojomjpenjgkaphajcokijobpkejih)
- [x] Raycast Extension - [Raycast-Sink](https://github.com/foru17/raycast-sink)
- [x] Apple Shortcuts - [Sink Shortcuts](https://s.search1api.com/sink001)
- [x] iOS App - [Sink](https://apps.apple.com/app/id6745417598)
- [x] Enhanced Link Management (with Cloudflare D1)
- [x] Analytics Enhancements (Multi-link filtering)
- [x] Dashboard Performance Optimization (Infinite loading)
- [x] API, migration, backup, and redirect tests

## 🏗️ Deployment

> Video tutorial: [Watch here](https://www.youtube.com/watch?v=MkU23U2VE9E)

We currently support deployment to [Cloudflare Workers](https://docs.sink.cool/deployment/workers) (recommended) and [Cloudflare Pages](https://docs.sink.cool/deployment/pages) (deprecated).

## ⚒️ Configuration

[Configuration Docs](https://docs.sink.cool/configuration/)

## 🔌 API

[API Docs](https://docs.sink.cool/api/) · [Live Scalar Reference for the public demo instance](https://sink.cool/_docs/scalar)

## 🤖 AI Skills

Install Sink AI Skills for enhanced coding assistance:

```bash
npx skills add miantiao-me/sink
```

## 🧰 MCP

We currently do not support native MCP Server, but we have OpenAPI documentation, and you can use the following method to support MCP.

> Replace the domain name in `OPENAPI_SPEC_URL` and the `API_KEY` below with your own instance configuration.
>
> The `API_KEY` is the same as the `NUXT_SITE_TOKEN` in your instance's environment variables.

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

## 🙋🏻 FAQs

[FAQs](https://docs.sink.cool/faqs)

## 💖 Credits

1. [**Cloudflare**](https://www.cloudflare.com/)
2. [**NuxtHub**](https://hub.nuxt.com/)
3. [**Astroship**](https://astroship.web3templates.com/)
4. [**Tailark**](https://tailark.com/)

## ☕ Sponsor

1. [Follow Me on X(Twitter)](https://404.li/x).
2. [Become a sponsor to on GitHub](https://github.com/sponsors/miantiao-me).
