---
title: REST API 参考
description: Sink 的 OpenAPI 文档、身份认证、CORS 与端点索引。
---

# REST API 参考

## 交互式文档

每个 Sink 实例都会发布 API 文档：

- `https://your-domain/_docs/openapi.json` — 机器可读的 OpenAPI
- `https://your-domain/_docs/scalar` — 更友好的界面
- `https://your-domain/_docs/swagger` — 经典 Swagger 界面

请用你自己的域名。公开演示：[https://sink.cool/_docs/scalar](https://sink.cool/_docs/scalar)。

## 身份认证

在请求头里发送站点密码：

```http
Authorization: Bearer YOUR_SITE_TOKEN
```

（`Bearer` 的意思是「后面是令牌」。）必须与 `NUXT_SITE_TOKEN` 完全一致（至少 8 个字符）。启用 [Cloudflare Access](/zh-CN/configuration/cloudflare-access) 后，浏览器也可以用已验证的 Access 登录访问 API。

## CORS

可选。构建时设置 `NUXT_API_CORS=true`，允许其他网站的浏览器调用 `/api/**`。仍需要登录。见[配置参考](/zh-CN/configuration/#可选配置)。

## 调用链接 API 前

::: warning 存储必须就绪
部署后若还没打开过 **Dashboard → Links**，大多数 `/api/link/**` 会失败，并提示 **「存储未就绪」（HTTP 423）**。见[存储初始化](/zh-CN/storage/kv-to-d1)。
:::

- `upsert` 空闲时创建；短链码已存在则返回已有记录且 `status: "existing"`（**不**覆盖）
- `search` 匹配短链码、URL、备注和标签
- `check` 从服务端探测目标 URL
- `verify` 检查当前如何登录
- `location` 在 Cloudflare 提供时返回大致坐标
- 图片上传需要 R2（JPEG/PNG/WebP/GIF，最大 5 MB）

## 端点分组

完整请求/响应请看 OpenAPI 界面。

| 分组       | 路由                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------- |
| 链接       | `/api/link/create`、`edit`、`upsert`、`delete`、`query`、`search`、`list`、`check`、`tags`      |
| 导入/导出  | `/api/link/import`、`/api/link/export` — [导入/导出](/zh-CN/features/import-export)             |
| 存储初始化 | `/api/link/migration/status`、`/api/link/migration/run` — [存储初始化](/zh-CN/storage/kv-to-d1) |
| AI         | `/api/link/ai`、`/api/link/og-ai` — [Workers AI](/zh-CN/features/ai)                            |
| 访问分析   | `/api/stats/**`、`/api/logs/**` — [访问分析](/zh-CN/features/analytics)                         |
| 实用工具   | `/api/verify`、`/api/location`、`/api/upload/image`、`/api/backup`                              |
