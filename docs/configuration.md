# Sink 配置

Sink 提供了一些配置选项，可参考 [.env.example](../.env.example)。

> 使用 Worker 部署时，请注意带有 `NUXT_PUBLIC_` 前缀的变量需要在 Workers 的 **Settings** -> **Build** -> **Variables and Secrets** 和 **Settings** -> **Variables and Secrets** 中配置。

## `NUXT_PUBLIC_PREVIEW_MODE`

> 如果您使用 Worker 部署，此变量需要在 **Settings** -> **Build** -> **Variables and Secrets** 和 **Settings** -> **Variables and Secrets** 中配置。

将站点设置为演示模式，生成的链接将在 5 分钟后过期，且无法编辑或删除链接。

## `NUXT_PUBLIC_SLUG_DEFAULT_LENGTH`

> 如果您使用 Worker 部署，此变量需要在 **Settings** -> **Build** -> **Variables and Secrets** 和 **Settings** -> **Variables and Secrets** 中配置。

设置生成的 SLUG 的默认长度。

## `NUXT_PUBLIC_KV_BATCH_LIMIT`

> 如果您使用 Worker 部署，此变量需要在 **Settings** -> **Build** -> **Variables and Secrets** 和 **Settings** -> **Variables and Secrets** 中配置。

设置导入/导出时每个请求的最大 KV 操作数。默认值为 50（Cloudflare Workers 每个请求的限制）。导入操作使用此值的一半，因为每个链接需要 2 个 KV 操作（检查存在性 + 写入）。

## `NUXT_REDIRECT_STATUS_CODE`

重定向默认使用 HTTP 301 状态码，您可以将其设置为 `302`/`307`/`308`。

## `NUXT_LINK_CACHE_TTL`

缓存链接可以加快访问速度，但设置过长可能导致更改生效缓慢。默认值为 60 秒。

## `NUXT_REDIRECT_WITH_QUERY`

默认情况下，链接重定向时不携带 URL 参数，不建议启用此功能。这是全局默认设置；单个链接可以通过 **链接设置** 中的 **附加查询参数重定向** 开关覆盖此设置。

## `NUXT_HOME_URL`

> 如果您使用 Worker 部署，此变量需要在 **Settings** -> **Build** -> **Variables and Secrets** 和 **Settings** -> **Variables and Secrets** 中配置。

默认的 Sink 首页是介绍页面，您可以将其替换为自己的网站。

## `NUXT_DATASET`

Analytics Engine 数据集，除非需要切换数据库并清除历史数据，否则不建议修改。

## `NUXT_AI_MODEL`

您可以自行修改大模型。支持的名称可在 [Workers AI 模型](https://developers.cloudflare.com/workers-ai/models/#text-generation) 中查看。

## `NUXT_AI_PROMPT`

支持自定义提示，建议保留占位符 {slugRegex}。

默认提示：

```txt
你是一个 URL 缩短助手，请将用户提供的 URL 缩短为一个 SLUG。SLUG 信息必须来自 URL 本身，不要做任何假设。SLUG 应该是人类可读的，不超过三个单词，并且可以使用正则表达式 {slugRegex} 进行验证。只返回最好的一个，格式必须是 JSON 格式 {"slug": "example-slug"}
```

## `NUXT_CASE_SENSITIVE`

设置 URL 大小写敏感性。

## `NUXT_LIST_QUERY_LIMIT`

设置 Metric 列表的最大查询数据量。

## `NUXT_DISABLE_BOT_ACCESS_LOG`

访问统计不计算机器人流量。

## `NUXT_API_CORS`

在构建期间设置环境变量 `NUXT_API_CORS=true` 以启用 API 的 CORS 支持。

## `NUXT_DISABLE_AUTO_BACKUP`

设置为 `true` 以禁用自动每日 KV 备份到 R2 存储。默认值为 `false`。

此功能需要：

1. 在 `wrangler.jsonc` 中配置 R2 存储桶绑定
2. 创建 R2 存储桶：`wrangler r2 bucket create sink`

备份存储在 R2 中，路径为 `backups/links-{timestamp}.json`，每天在 UTC 00:00 运行。

## `NUXT_SAFE_BROWSING_DOH`

设置为 DNS over HTTPS (DoH) 端点 URL，以在创建或编辑链接时启用自动不安全链接检测。启用后，Sink 会查询 DoH 服务以检查目标域名是否被标记为恶意。如果域名解析为 `0.0.0.0`，链接会被自动标记为不安全，访问者在重定向前会看到警告页面。

推荐值：

- `https://family.cloudflare-dns.com/dns-query` — Cloudflare Family DNS（阻止恶意软件和成人内容）
- 自定义 [Cloudflare Zero Trust Gateway](https://developers.cloudflare.com/cloudflare-one/policies/gateway/) DoH URL — 支持自定义阻止列表、域名风险类别和更精细的控制

默认为空（禁用）。无论此设置如何，用户仍然可以在仪表板中手动将链接标记为不安全。

## `NUXT_NOT_FOUND_REDIRECT`

当 slug 未找到时的可选自定义重定向目标。
如果未设置，Sink 将回退到其默认的 404 页面。
