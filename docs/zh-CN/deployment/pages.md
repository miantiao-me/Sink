---
title: 部署到 Cloudflare Pages
description: 通过 Git 集成和仪表盘管理的绑定将 Sink 部署到 Cloudflare Pages。
---

# 部署到 Cloudflare Pages

## 1. 创建 Pages 项目

[Fork Sink 仓库](https://github.com/miantiao-me/Sink/fork)。在 Cloudflare 仪表盘中创建 **Pages** 项目，导入该 Fork，并设置：

- **生产分支：** `master`
- **框架预设：** Nuxt
- **构建命令：** `pnpm build`
- **构建输出目录：** `dist`

先创建项目，才能进入设置。

::: tip 必要时取消首次自动部署
如果绑定和变量还没配完就已开始部署，请打开部署列表点 **Cancel**，配完后再重新部署。
:::

## 2. 创建资源并绑定

创建需要的 Cloudflare 资源，然后打开 Pages 项目 → **Settings → Bindings** 添加。绑定 = 把资源用固定名称接到 Sink。

| 绑定名称    | 产品             | 是否必需 | 是什么         |
| ----------- | ---------------- | -------- | -------------- |
| `DB`        | D1               | 必需     | 保存链接       |
| `KV`        | KV               | 必需     | 加速跳转       |
| `ANALYTICS` | Analytics Engine | 推荐     | 访问统计       |
| `R2`        | R2               | 可选     | 备份与社交图片 |
| `AI`        | Workers AI       | 可选     | AI 建议        |

访问分析是可选的。启用步骤见[访问分析与近实时视图](/zh-CN/features/analytics)。

::: warning 必须加兼容性标志
在 **Settings → Functions → Compatibility Flags** 中，为 **Production** 和 **Preview** 都添加 `nodejs_compat`。Pages 上运行 Sink 需要这个标志。
:::

## 3. 变量和密钥

在 **Settings → Variables and Secrets** 中添加以下构建部署配置。D1 迁移和生成部署配置必须使用两个 ID。

| 构建变量                          | 是否必需 | 填什么                                                                    |
| --------------------------------- | -------- | ------------------------------------------------------------------------- |
| `DEPLOY_D1_DATABASE_ID`           | 必需     | D1 数据库 ID（在 D1 详情页）                                              |
| `DEPLOY_KV_NAMESPACE_ID`          | 必需     | KV 命名空间 ID（在 KV 详情页）                                            |
| `DEPLOY_KV_PREVIEW_NAMESPACE_ID`  | 可选     | 预览 KV 命名空间 ID；默认等于 `DEPLOY_KV_NAMESPACE_ID`                    |
| `DEPLOY_D1_DATABASE_NAME`         | 可选     | D1 数据库名称；默认 `sink`                                                |
| `DEPLOY_ANALYTICS_DATASET`        | 可选     | Analytics Engine 数据集；默认 `sink`（请与 `NUXT_DATASET` 保持一致）       |

还需为 Production 环境配置 Pages Build / Wrangler 鉴权变量。Pages 不会自动提供以下变量：

| 鉴权变量                  | 类型     | 填什么                                                                                                                                                                                    |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`    | 加密密钥 | `postbuild` 远程 D1 迁移使用的令牌。Git 构建最低需要 **Account → D1 → Edit**；若在外部使用同一令牌执行 `pnpm deploy:pages`，还需 **Account → Cloudflare Pages → Edit**                     |
| `CLOUDFLARE_ACCOUNT_ID`   | 变量     | Cloudflare 账户 ID。Wrangler 官方将其定义为可选，但本项目未配置 `account_id`，因此建议设置，以保证非交互构建稳定                                                                           |

`CLOUDFLARE_ACCOUNT_ID` 可以与 `NUXT_CF_ACCOUNT_ID` 使用相同的值，但两个变量名必须分别设置。预览构建会跳过迁移，因此 Preview 环境不需要这两个鉴权变量。

在仪表盘的同一位置另行添加运行时配置：

| 运行时变量                 | 类型     | 填什么                                                      |
| -------------------------- | -------- | ----------------------------------------------------------- |
| `NUXT_SITE_TOKEN`          | 加密密钥 | 仪表盘登录密码和 API 密码（高强度、稳定，至少 8 个字符）    |
| `NUXT_CF_ACCOUNT_ID`       | 变量     | Cloudflare 账户 ID（访问分析用）                            |
| `NUXT_CF_API_TOKEN`        | 加密密钥 | 仅含 **Account → Account Analytics → Read** 的 Custom Token |

创建访问分析令牌：Cloudflare 仪表盘 → 右上角头像 → **My Profile** → **API Tokens** → **Create Token** → **Custom Token** → 权限选 **Account → Account Analytics → Read**。

Pages 会把仪表盘中的这套变量同时提供给构建和运行环境，但各组用途不同：`DEPLOY_*` 值用于生成部署配置，`CLOUDFLARE_*` 值用于 Wrangler 鉴权，`NUXT_*` 值用于配置运行中的应用。Pages 的 R2 只能在 **Bindings** 中添加，不要添加 R2 `DEPLOY_*` 变量。更多选项见[配置参考](/zh-CN/configuration/)。

仓库的 `postbuild` 脚本仅在 Pages 构建 `master` 分支时（`CF_PAGES=1` 且 `CF_PAGES_BRANCH=master`）执行远程 D1 迁移。因此，Pages 主分支构建成功时会自动更新 D1 数据库结构；预览分支构建不会迁移。

## 4. 部署并首次使用

从 `master` 启动部署并等待完成。

如需通过 CLI 手动部署，请先完成构建。`pnpm deploy:pages` 假定 `dist` 已存在：它先根据 `DEPLOY_*` 值生成 `wrangler.deploy.jsonc` 并执行远程 D1 迁移，再通过 Wrangler 上传 `dist`；该命令不会执行应用构建。

1. 打开 `/dashboard`，用 `NUXT_SITE_TOKEN` 登录
2. 打开一次 **Dashboard → Links**（一次性存储初始化）
3. 创建链接

::: tip 必须先打开一次 Links
存储初始化完成前，创建链接可能失败，并提示「存储未就绪」（HTTP 423）。
:::

Pages 支持手动[备份](/zh-CN/features/backups)；本仓库里每日自动备份只为 Workers 配置。
