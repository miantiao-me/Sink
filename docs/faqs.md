# 常见问题

## 1. 为什么我无法创建链接？

请检查 Cloudflare KV 绑定，KV 环境变量名称应该全部为大写字母。

<details>
  <summary><b>截图</b></summary>
  <img alt="Cloudflare 中的 KV 绑定设置" src="/docs/images/faqs-kv.png"/>
</details>

## 2. 为什么我无法登录？

请检查 `NUXT_SITE_TOKEN` 是否设置为纯数字，Sink 不支持纯数字 Token，我们认为这是不安全的。

## 3. 为什么我看不到分析数据？

分析数据需要访问 Cloudflare 的设置：

1. 验证 `NUXT_CF_ACCOUNT_ID` 和 `NUXT_CF_API_TOKEN` 是否配置正确（确保 Account ID 与部署区域 ID 匹配）。
2. 检查 Worker 分析引擎是否已启用。

<details>
  <summary><b>截图</b></summary>
  <img alt="Cloudflare 中的分析引擎绑定设置" src="/docs/images/faqs-Analytics_engine.png"/>
</details>

## 4. 我不想要当前的首页？可以重定向到我的博客吗？

当然可以。请将环境变量 `NUXT_HOME_URL` 设置为您的博客或官方网站地址。

## 5. 为什么使用 NuxtHub 部署后看不到统计数据？

NuxtHub 的 ANALYTICS 指向其数据集，您需要设置 `NUXT_DATASET` 环境变量指向同一个数据集。

## 6. 为什么链接总是不区分大小写？

这是 Sink 的一个特性。默认情况下，我们会自动将所有链接转换为小写，以避免大小写敏感问题并提高可用性。这确保用户不会因意外的大小写差异而遇到错误。

但是，您可以通过将 `NUXT_CASE_SENSITIVE` 环境变量设置为 `true` 来禁用此功能。

### 当 `NUXT_CASE_SENSITIVE` 为 `true` 时会发生什么？

新生成的链接将区分大小写，将 `MyLink` 和 `mylink` 视为不同的链接。随机生成的 slug 将包含大写和小写字符，提供更大的唯一组合池（但不太用户友好，这就是我们默认使用不区分大小写的原因）。

## 7. 为什么 Metric 列表只显示前 500 条数据？

为了提高查询性能，我们限制了数据量。如果您需要查询更多数据，可以通过 `NUXT_LIST_QUERY_LIMIT` 进行调整。

## 8. 我不想计算机器人或爬虫流量

将 `NUXT_DISABLE_BOT_ACCESS_LOG` 设置为 `true`。

## 9. 什么是链接伪装？

链接伪装通过在浏览器地址栏中显示您的短链接域名而不是重定向到目标 URL 来掩盖您的目标 URL。目标页面在全屏 iframe 中加载。

### 如何启用它

在创建或编辑链接时，在 **链接设置** 部分切换 **启用链接伪装**。

### 限制

- **阻止 iframe 的网站**：带有 `X-Frame-Options: DENY` 或 `Content-Security-Policy: frame-ancestors 'none'` 的网站不会在 iframe 中加载。大多数主要网站（Google、GitHub、Twitter 等）都阻止 iframe 嵌入。
- **需要 HTTPS**：目标 URL 必须使用 HTTPS。混合内容（HTTPS 短链接 → HTTP 目标）会被浏览器阻止。
- **有限的交互**：某些功能如 OAuth 登录流程、`window.top` 导航和某些支付表单在 iframe 中可能无法正常工作。
- **设备重定向优先**：如果同时配置了伪装和设备重定向（iOS/Android），设备重定向将在匹配设备上优先。

### 如果目标网站阻止 iframe

如果您控制目标网站，可以通过添加以下响应头来白名单您的短链接域名：

```
Content-Security-Policy: frame-ancestors 'self' your-short-domain.com
```

## 10. 什么是带查询参数重定向？

启用后，短链接 URL 中的查询参数会被附加到目标 URL。例如，访问 `https://s.ink/my-link?ref=twitter` 会重定向到 `https://example.com/page?ref=twitter`。

### 每链接 vs 全局

- **全局设置**：设置 `NUXT_REDIRECT_WITH_QUERY=true` 以默认对所有链接启用。
- **每链接覆盖**：在创建或编辑链接时，在 **链接设置** 部分切换 **带查询参数重定向**。这会覆盖该特定链接的全局设置。

如果链接没有每链接设置，它会回退到全局配置。

## 11. 导入/导出功能如何工作？

导入和导出设计为在 Cloudflare Workers 的 KV 操作限制内工作（默认每请求 50 个）。

- **导出**：批量下载链接，自动分页直到完成。
- **导入**：批量上传链接（`NUXT_PUBLIC_KV_BATCH_LIMIT` 的一半，默认 25 个），因为每个链接需要 2 个 KV 操作（检查存在性 + 写入）。
- **过期链接**：按原样导入以支持迁移场景。
- **重复 slug**：导入期间跳过（保留现有链接）。
- **验证**：所有链接在导入开始前都要根据模式进行验证。
