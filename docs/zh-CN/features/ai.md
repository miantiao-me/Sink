---
title: Workers AI 辅助
description: 可选的 AI 帮助：建议短链码和社交预览文案。
---

# Workers AI 辅助

Sink 可以使用 Cloudflare **Workers AI** 建议短链码和社交预览标题/描述。可选 — 不用 AI 也能正常创建链接。

## 启用

将 Workers AI 绑定为 `AI`。可在[配置参考](/zh-CN/configuration/#高级默认值)中改模型或提示词。自定义短链提示词必须保留 `{slugRegex}` 占位符。

如果没有绑定 AI，相关接口会返回 **501**（未启用）。

## 行为

对于一个 URL，Sink 会尽量读取页面内容，并让模型返回结构化结果：

- `/api/link/ai` — 短链码建议
- `/api/link/og-ai` — 标题与描述；可用 `locale` 查询参数指定语言

模型失败时，Sink 会回退到基于 URL 的简单建议。保存前请人工检查。

::: warning 会向 Workers AI 发送数据
页面内容和目标 URL 可能会发送到 Cloudflare Workers AI。使用前请确认敏感性和策略。
:::
