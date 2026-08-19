---
title: 快速开始
description: 准备 Cloudflare 资源、部署 Sink 并创建第一个短链接。
---

# 快速开始

Sink 是一款自托管短链接应用，带访问分析。它跑在 Cloudflare 上（不需要自己买服务器）。

## 1. Fork Sink

在你的 GitHub 账户中 [Fork Sink 仓库](https://github.com/miantiao-me/Sink/fork)。

## 2. 选择部署方式

- [Cloudflare Workers](/zh-CN/deployment/workers) — 推荐
- [Cloudflare Pages](/zh-CN/deployment/pages) — 已废弃

两者都通过 Git：Cloudflare 从你的 Fork 构建并发布应用。

## 3. 创建 Cloudflare 资源

在 [Cloudflare 仪表盘](https://dash.cloudflare.com/) 中创建 Sink 要用的服务。稍后会把它们**绑定**到项目——绑定的意思是：「把这个数据库/存储，用固定名称接到 Sink」。

| 绑定名称    | Cloudflare 产品                  | 是否必需 | 是什么              |
| ----------- | -------------------------------- | -------- | ------------------- |
| `DB`        | **D1**（数据库）                 | 必需     | 保存链接            |
| `KV`        | **KV**（键值存储）               | 必需     | 加速短链跳转        |
| `ANALYTICS` | **Analytics Engine**（分析引擎） | 推荐     | 访问统计与日志      |
| `R2`        | **R2**（对象存储，类似网盘）     | 可选     | 备份与社交分享图片  |
| `AI`        | **Workers AI**                   | 可选     | AI 建议短链码和标题 |

如需完整体验，建议创建以上五项。访问分析也可以稍后添加 — 见[访问分析与近实时视图](/zh-CN/features/analytics)。

创建 D1 和 KV 后，打开各自详情页，复制 **ID**（部署时要填）。

## 4. 配置并部署

按 Workers 或 Pages 指南连接 Fork、添加绑定并填写变量。

::: warning 请自行设置 `NUXT_SITE_TOKEN`
这是**仪表盘登录密码**，也是 API 工具使用的密码。请用足够长的随机字符串（至少 8 个字符），并保持稳定 — 改了之后所有人都会退出登录。

如果跳过，Sink 可能在构建时随机生成密码，下次部署可能变化，导致无法稳定登录。
:::

其他设置见[配置参考](/zh-CN/configuration/)。

## 5. 首次登录并创建链接

1. 打开 `https://你的域名/dashboard`
2. 用你设置的 `NUXT_SITE_TOKEN` 登录
3. 打开一次 **Dashboard → Links**

::: tip 为什么要先打开一次 Links？
第一次打开会完成一次性的存储初始化。在此之前，创建链接或备份可能失败，并提示「存储未就绪」（HTTP 423）。新部署只是快速空检查；旧版只用 KV 存链接的实例会在这里迁移数据 — 见[存储初始化 / 迁移](/zh-CN/storage/kv-to-d1)。
:::

4. 创建第一个短链接

仪表盘支持多语言。产品文档提供英文与简体中文。
