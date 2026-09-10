---
title: Cloudflare Access 身份认证
description: 为 Sink 仪表盘启用可选的 Zero Trust 登录，同时保持短链接公开、API 客户端可用。
---

# Cloudflare Access 身份认证

Cloudflare Access 是**可选**功能。适合希望用公司身份（Google、邮箱 OTP、SSO 等）登录仪表盘，而不是只靠分享 `NUXT_SITE_TOKEN` 的场景。

无论是否启用 Access，短链接都保持公开。Access 只影响谁能打开仪表盘、谁能调用 API。

## 启用后会发生什么

| 路径                   | 未启用 Access          | 推荐的 Access 配置                                        |
| ---------------------- | ---------------------- | --------------------------------------------------------- |
| 短链接（`/abc`）       | 公开                   | 仍然公开                                                  |
| 仪表盘（`/dashboard`） | 知道站点令牌即可       | 先通过 Cloudflare Access，再使用仪表盘                    |
| API（`/api/**`）       | 站点令牌（`Bearer …`） | 站点令牌 **或** 有效的 Access 登录（浏览器 Cookie / JWT） |
| API 文档（`/_docs`）   | 在你的域名上公开       | 仍公开；若不想公开，需在 Access 中单独保护                |

Sink **不会**因为「有 Cookie」就放行。它会校验 Access **JWT** — 可以把它想成一张有时效的电子通行证（会检查签名、签发者、受众和过期时间）。

## 推荐配置（大多数人用这个）

目标：用 Access 保护仪表盘，短链接保持公开，脚本/扩展仍可用站点令牌调用 `/api`。

### 1. 创建 Access 应用

在 Cloudflare Zero Trust 中，为 Sink 域名（例如 `links.example.com`）创建一个 **Self-hosted** Access 应用。

### 2. 选择 Access 保护哪些路径

在 Access 应用的路径规则中：

| 路径                    | 是否用 Access 保护 | 原因                                              |
| ----------------------- | ------------------ | ------------------------------------------------- |
| `/dashboard` 及其子路径 | **是**             | 管理后台                                          |
| `/api`                  | **否**（推荐）     | 让脚本、扩展仍可用站点令牌调 API，不必再过 Access |
| 短链接路径              | **否**             | 访客必须能直接打开短链                            |
| `/_docs`                | 可选               | 只有不想公开 OpenAPI 时才保护                     |

### 3. 不要限制 Cookie Path

在 Access 应用设置中，保持 **Cookie Path** 为空/未限制，这样浏览器从仪表盘调用 `/api` 时，已签名的 Access Cookie 才能带上。

如果 Cookie Path 只限 `/dashboard`，可能出现：仪表盘能打开，但 API 一直 401。

### 4. 配置 Sink 环境变量

两个值都要填。**同时设置**后才会启用 Access：

```ini
NUXT_CF_ACCESS_TEAM_DOMAIN=https://your-team.cloudflareaccess.com
NUXT_CF_ACCESS_AUD=paste-application-aud-here
```

| 变量                         | 从哪里拿                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `NUXT_CF_ACCESS_TEAM_DOMAIN` | Zero Trust 团队域名。用完整源地址、不要带路径：`https://<team>.cloudflareaccess.com` |
| `NUXT_CF_ACCESS_AUD`         | Access 应用 → **Application Audience (AUD) Tag**                                     |

设置后重新部署。

### 5. 仍然保留高强度站点令牌

启用 Access 后，仍要设置高强度的 `NUXT_SITE_TOKEN`：

- API 客户端和集成仍会用它
- 它是备用管理凭据
- 任何能打到这个 Worker/Pages 的域名，只要边缘没拦，仍可能接受站点令牌

## 人和工具分别怎么登录

```txt
浏览器 → Access 登录页 → 仪表盘
         ↘ Access Cookie/JWT → Sink 校验通过 → /api 可用

脚本/扩展 → Authorization: Bearer <NUXT_SITE_TOKEN> → /api 可用
```

- **人（浏览器）：** 先过 Access，再正常使用仪表盘。退出登录走 Cloudflare（`/cdn-cgi/access/logout`）。
- **工具（API）：** 发送 `Authorization: Bearer YOUR_SITE_TOKEN`。自动化优先用这种方式。
- **Access 服务令牌：** 若 Access 策略允许，Sink 会把它当作完整管理员（`root`）。只允许受信任的服务令牌。

## 更严格的选项：连 `/api` 也保护

你也可以把 **`/dashboard` 和 `/api` 都**放进 Access。

这样未通过 Access 的请求会在 Cloudflare 边缘被拦下，到不了 Sink。只带站点令牌、不过 Access 的客户端，将无法调用该域名。

如果既要：

- 人用 Access 登录仪表盘，又要
- 自动化只靠 Bearer 令牌、不过 Access，

请用上面的推荐配置，或给自动化单独准备一个不走 Access 的域名。

## 重要限制

::: warning 保护每一个域名
如果 `app.example.com` 开了 Access，但 `old.example.com` 也指向同一套 Sink 且没开 Access，旧域名的安全性仍只取决于 `NUXT_SITE_TOKEN`。所有能访问应用的域名都要保护。
:::

::: tip 会话时长仍然重要
Sink 在本地校验 JWT。你在 Access 里撤销会话后，旧 JWT 在过期前仍可能可用。请按风险选择合适的 Access 会话时长。
:::

## Cloudflare 参考资料

- [验证 Access JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Access 应用路径](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Access 会话管理](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
