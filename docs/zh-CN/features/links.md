---
title: 链接功能
description: 自定义短链码、路由、过期、密码、安全检查、社交预览、隐匿、标签、健康检查和重定向。
---

# 链接功能

在仪表盘或通过 API 创建链接。链接必须有目标 URL，其他都是可选的。

## 短链码（Slug）与标签

不填短链码时，会生成随机小写码。区分大小写模式只影响**自定义**码：`Docs` 与 `docs` 可以不同。自动生成的码始终小写。

标签会转成小写。每个链接最多 10 个标签，每个 1–32 个字符。

## 过期时间与预览模式

如果设置过期时间，必须是未来时间。过期后链接失效。导入允许已过期记录（为了保留历史）。

::: warning 预览模式
实例级演示开关。新建链接只活五分钟，且不能编辑或删除。只在可随时扔掉的公开演示里用。
:::

## 密码与不安全警告

带密码的链接会在浏览器显示密码框。API 可在 `x-link-password` 请求头里传密码。

在仪表盘/API 设置的密码会使用 PBKDF2 哈希存储。例外：从很旧的 KV 迁过来的链接，在你编辑密码前可能仍是旧格式。

`unsafe` 控制警告页：

- 自己设置可强制开/关警告
- 若配置了安全浏览且未设置 `unsafe`，Sink 会通过安全 DNS 检查域名
- 被判定拦截则标为不安全

::: tip 安全浏览检查失败时放行
DNS 检查失败时，Sink 会放行链接，而不是拦截。
:::

没有密码的不安全链接，访客必须用带 `confirm=true` 的 `POST` 确认。密码 + 不安全时，同时发送 `x-link-password` 和 `x-link-confirm: true`。

## 智能路由

- **查询参数：** 可选把访客的 `?…` 接到目标 URL
- **按国家/地区：** 把国家代码（如 `US`、`JP`）映射到不同 URL
- **按设备：** Apple iOS 移动设备（iPhone、iPad、iPod，不含 macOS）与 Android 目标优先于默认或国家目标

## 社交预览（OpenGraph）、机器人与隐匿

自定义标题、描述和图片，控制链接在社交应用里分享时的样子。配置 R2 后可上传图片（JPEG/PNG/WebP/GIF，最大 5 MB）。

社交机器人访问带有预览字段的链接时，Sink 返回预览页而不是直接跳转。

::: warning 隐匿不是隐私功能
隐匿会在页面里打开目标站，地址栏仍显示短链接。浏览器和开发者工具仍能看到真实 URL。禁止被嵌入的网站（以及多数 OAuth/支付页）无法加载。
:::

## 反向代理模式

开启反向代理模式后，访问短链（`/:slug`）时，Cloudflare Worker 会在边缘直接请求目标 URL 并把响应流式返回给客户端，而不会返回 HTTP 301/302 重定向。

Sink 采用极简代理设计，不做全站代理，也不使用额外域名或子域名，仅对短链本身的单次请求进行转发。

### 适用场景

- **API 接口：** 转发 API 请求或 Webhook，透传 `Authorization` 及自定义请求头，调用方直接获取接口响应。
- **Shell 安装脚本：** 支持形如 `curl -fsSL https://sink.example/install | bash` 的一键安装命令。
- **原始文本与配置：** 托管 Raw 文本片段、JSON 数据或远程客户端订阅配置。
- **单文件下载：** 直链下载单个文件，无需跳转到原始存储或外部网盘地址。

### 不适用场景与限制

反向代理模式**不适合普通多资源网页**。

代理只作用于短链本身这单次请求，Sink 具备以下明确边界：

- **不改写资源路径：** 不会改写 HTML 或 CSS 中的相对路径与根路径引用。
- **不处理子路径：** 请求 `/:slug/subpath` 不会被转发到目标地址。
- **不转发运行时请求：** 不会代理网页运行时的动态 `import()`、`fetch()` 或 WebSocket 连接。

例如，若代理的目标网页包含 `<script src="/assets/app.js">` 或 `<link rel="stylesheet" href="./style.css">`，浏览器在加载这些资源时会直接请求 Sink 自身的域名（如 `https://sink.example/assets/app.js`），导致 404 错误、样式丢失及脚本执行异常。只有所有静态资源均使用绝对外部 URL（例如完整 CDN 链接）的独立页面才可能正常展示。

### 如何开启

反向代理模式**默认关闭**。

1. **设置环境变量：** 在部署环境中添加 `NUXT_PUBLIC_LINK_PROXY_ENABLED=true`。
2. **重新构建与部署：** 该项属于客户端公开配置（`NUXT_PUBLIC_*`），修改后需重新构建并部署实例，前端才能生效。

该配置仅影响访问行为：当未开启该环境变量时，已配置代理的短链在访问时会自动退化为普通的 HTTP 重定向。

### 安全说明与防护机制

::: warning 同源安全风险
被代理的内容直接在你的 Sink 域名下提供，且**不包含 CSP sandbox 隔离**。

这意味着上游返回的活动内容（HTML、JavaScript、SVG 等）会直接在 Sink 的**同源环境**中执行，可以读取该域名下的 Cookie 和 localStorage（包括管理后台的认证 Token）。**切勿代理不受信或不可控的目标。**
:::

Sink 保留了以下防护机制：

- **私网目标拦截：** 仅允许代理公网 `http(s)` 目标，拦截 `localhost`、IPv4 私网与保留段，以及 IPv6 的 `::`、`::1`、ULA、链路本地、组播和 `::ffff:` 映射地址。字面 IP 检查无法防御针对域名的 DNS rebinding。上游重定向由运行时自动跟随，仅对初始目标进行公网校验。
- **请求头过滤：** 客户端请求中的 `cookie`、`host`、hop-by-hop 头、`content-length`、`cf-*`、`x-forwarded-*`、`x-real-ip` 与 `x-link-*` 不会转发给上游；`authorization` 及其他自定义请求头会透传。Sink 会自动补全 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host`。
- **响应头过滤：** 剥离上游返回的 hop-by-hop 头与 `set-cookie`。响应始终附加 `X-Content-Type-Options: nosniff`。
- **受保护链接隔离：** 密码验证或不安全警告表单确认后，会在同一次请求中以不带请求体的 GET 请求上游，表单中的密码绝不会发往上游。API 客户端可直接通过 `x-link-password` 和 `x-link-confirm: true` 请求头透传请求体（JSON/二进制）。带有密码或 unsafe 的链接响应统一附加 `Cache-Control: private, no-store`。

## 健康检查

**Dashboard → Check**（以及 `/api/link/check`）从服务端探测目标 URL（每次最多 10 条，超时 1–30 秒）。私有/本机地址会被拦截。

## 全站重定向选项

可改默认跳转状态码（默认 `301`）、要求浏览器不缓存跳转、重定向首页（`NUXT_PUBLIC_HOME_URL`），以及未知短链码去向（`NUXT_NOT_FOUND_REDIRECT`，始终 **302**）。见[配置参考](/zh-CN/configuration/#高级默认值)。
