---
title: 配置参考
description: Sink 支持的全部环境变量——做什么、填在哪、什么时候需要。
---

# 配置参考

所有值都是字符串。布尔开关除非另有说明，使用 `true`。

**大多数人需要的**

- 必配：`NUXT_SITE_TOKEN`、D1（`DB`）、KV（`KV`）以及它们的 ID
- 访问分析：`ANALYTICS` 绑定 + `NUXT_CF_ACCOUNT_ID` + `NUXT_CF_API_TOKEN` — 见[访问分析](/zh-CN/features/analytics)
- 其余都是可选

## 变量填在哪里

可以想成两个时机：

| 时机         | 含义                                           | Workers                                     | Pages                                    |
| ------------ | ---------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| **构建时**   | Cloudflare 构建/发布应用时用到                 | Workers Builds → Variables                  | **Settings → Variables and Secrets**     |
| **运行时**   | 线上应用运行时用到                             | Worker **Settings → Variables and Secrets** | 同一套 **Variables and Secrets**（共用） |
| **两者都要** | 构建出的页面和运行时都要用（例如公开 UI 设置） | 在 Builds **和** Worker 设置里填**相同**值  | 只填一次                                 |

::: tip 改了公开/构建变量后
请重新部署一次，让应用重新构建。Workers 上「两者都要」的变量必须在两处一致。
:::

以 `DEPLOY_*` 开头的名字只在部署时连接资源用。它们会把仓库里 `wrangler.jsonc` 的占位值写进被 gitignore 的 `wrangler.deploy.jsonc` — 请在 `.env` 或 Cloudflare 构建变量里设置 `DEPLOY_*`，不要把生产环境 ID 写进 `wrangler.jsonc`。以 `NUXT_*` 开头的名字配置正在运行的应用。

## Cloudflare 绑定

**绑定** = 把 Cloudflare 产品用固定名称接到 Sink。

| 绑定        | 是否必需 | 白话说明                                                                                           |
| ----------- | -------- | -------------------------------------------------------------------------------------------------- |
| `DB`        | 必需     | D1 数据库 — 保存链接                                                                               |
| `KV`        | 必需     | 加速跳转的缓存（+ 存储就绪标记）                                                                   |
| `ANALYTICS` | 推荐     | 访问事件，供分析使用                                                                               |
| `R2`        | 可选     | 文件存储，用于备份和社交图片。Workers 可用 `DEPLOY_R2_BUCKET_NAME`；Pages 在仪表盘 Bindings 里添加 |
| `AI`        | 可选     | Workers AI 建议                                                                                    |
| `ASSETS`    | 自动     | 静态文件 — 系统自动提供                                                                            |

访问分析是可选的。不配也能用短链和仪表盘；图表会是空的。启用步骤见[访问分析](/zh-CN/features/analytics)。

## 必须配置

::: warning `NUXT_SITE_TOKEN`
请自己设置。这是**仪表盘登录密码**，也是 **API 密码**。至少 8 个字符，越长越好。保持稳定。

如果留空，Sink 可能在构建时随机生成密码，下次部署可能变化。
:::

| 变量                     | 时机           | 放哪里                       | 用途                           |
| ------------------------ | -------------- | ---------------------------- | ------------------------------ |
| `NUXT_SITE_TOKEN`        | 运行时（密钥） | Workers 或 Pages 的加密密钥  | 登录 + API 密码                |
| `DEPLOY_D1_DATABASE_ID`  | 构建时         | Workers Builds 或 Pages 变量 | D1 数据库 ID（在 D1 详情页）   |
| `DEPLOY_KV_NAMESPACE_ID` | 构建时         | Workers Builds 或 Pages 变量 | KV 命名空间 ID（在 KV 详情页） |

## 推荐配置（访问分析）

| 变量                 | 时机           | 放哪里               | 用途                                                        |
| -------------------- | -------------- | -------------------- | ----------------------------------------------------------- |
| `NUXT_CF_ACCOUNT_ID` | 运行时         | Worker 或 Pages 变量 | 你的 Cloudflare 账户 ID                                     |
| `NUXT_CF_API_TOKEN`  | 运行时（密钥） | 加密密钥             | 仅含 **Account → Account Analytics → Read** 的 Custom Token |

同时绑定 `ANALYTICS`。备份加 `R2`，AI 加 `AI`。令牌步骤见[访问分析](/zh-CN/features/analytics)。

## 公开覆盖值（只在改默认时）

Workers 要在 Builds 和运行时填相同值。Pages 只填一次，然后重新部署。

| 变量                              | 默认 | 用途                                 |
| --------------------------------- | ---- | ------------------------------------ |
| `NUXT_PUBLIC_PREVIEW_MODE`        | 空   | `true` = 演示模式（链接只活 5 分钟） |
| `NUXT_PUBLIC_SLUG_DEFAULT_LENGTH` | `6`  | 自动生成短链码的长度                 |
| `NUXT_PUBLIC_KV_BATCH_LIMIT`      | `50` | 导出每页条数；导入每次最多一半       |

## 可选配置

### 构建时选项

| 变量                             | 放哪里                  | 何时生效                                                                        |
| -------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| `NUXT_API_CORS`                  | Builds 或 Pages         | 严格等于 `true` 时，允许其他网站的浏览器调用 `/api/**`（CORS）。仍需要登录      |
| `DEPLOY_R2_BUCKET_NAME`          | 仅 Workers Builds       | 填已有 R2 桶名以挂上 R2（`bucket_name`）。Pages：在 Bindings 里添加             |
| `DEPLOY_KV_PREVIEW_NAMESPACE_ID` | Workers Builds 或 Pages | 可选 Wrangler `preview_id`；默认等于 `DEPLOY_KV_NAMESPACE_ID`                   |
| `DEPLOY_R2_PREVIEW_BUCKET_NAME`  | 仅 Workers Builds       | 可选 Wrangler `preview_bucket_name`；启用 R2 时默认等于 `DEPLOY_R2_BUCKET_NAME` |

### 运行时选项

| 变量                                                | 用途                                                           |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `NUXT_HOME_URL`                                     | 非空则把 `/` 重定向到该 URL；空则显示 Sink 首页                |
| `NUXT_NOT_FOUND_REDIRECT`                           | 未知短链码跳到哪里（**始终 HTTP 302**）                        |
| `NUXT_CF_ACCESS_TEAM_DOMAIN` + `NUXT_CF_ACCESS_AUD` | 两个都设 → 启用 [Cloudflare Access](./cloudflare-access)       |
| `NUXT_SAFE_BROWSING_DOH`                            | 用于检查不安全域名的 DNS-over-HTTPS 地址（未设置 `unsafe` 时） |
| `NUXT_WEBHOOK_URL`                                  | [点击 Webhook](./webhooks) 的 HTTP(S) 地址                     |
| `NUXT_WEBHOOK_SECRET`                               | 可选签名密钥，以 `whsec_` 开头                                 |

安全浏览示例：Cloudflare Family DNS `https://family.cloudflare-dns.com/dns-query`。另见[链接功能](/zh-CN/features/links)。

## 高级默认值（通常不用改）

| 变量                          | 默认                         | 用途                                                                                     |
| ----------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `NUXT_REDIRECT_STATUS_CODE`   | `301`                        | 普通跳转状态码（也可用 `302`/`307`/`308`）。未知短链仍用 302                             |
| `NUXT_LINK_CACHE_TTL`         | `60`                         | KV 缓存链接的秒数                                                                        |
| `NUXT_REDIRECT_WITH_QUERY`    | `false`                      | `true` 时把访客查询参数接到目标 URL                                                      |
| `NUXT_REDIRECT_NO_STORE`      | `false`                      | `true` 时要求浏览器不要缓存这次跳转                                                      |
| `NUXT_CASE_SENSITIVE`         | `false`                      | `true` 时自定义短链码区分大小写（`Docs` ≠ `docs`）                                       |
| `NUXT_DATASET`                | `sink`                       | 访问分析数据集名；必须与 `ANALYTICS` 绑定一致                                            |
| `NUXT_LIST_QUERY_LIMIT`       | `500`                        | 分析列表最大行数                                                                         |
| `NUXT_DISABLE_BOT_ACCESS_LOG` | `false`                      | `true` 时从分析和 Webhook 排除机器人                                                     |
| `NUXT_DISABLE_AUTO_BACKUP`    | `false`                      | `true` 时关闭计划 R2 备份                                                                |
| `NUXT_AI_MODEL`               | `@cf/qwen/qwen3-30b-a3b-fp8` | Workers AI 模型                                                                          |
| `NUXT_AI_PROMPT`              | 内置                         | 自定义短链提示词必须保留 `{slugRegex}`                                                   |
| `NUXT_AI_OG_PROMPT`           | 内置                         | 自定义社交预览提示词                                                                     |
| `DEPLOY_D1_DATABASE_NAME`     | `sink`                       | 覆盖生成部署配置中的 `d1_databases[].database_name`                                      |
| `DEPLOY_ANALYTICS_DATASET`    | `sink`                       | 覆盖生成部署配置中的 `analytics_engine_datasets[].dataset`；请与 `NUXT_DATASET` 保持一致 |

详见[访问分析](/zh-CN/features/analytics)和 [API](/zh-CN/api/)。
