---
title: 环境变量与密钥安全指南
description: 面向初学者的 .env、本地开发、GitHub 和 Cloudflare Workers/Pages 配置说明。
---

# 环境变量与密钥安全指南

## 先记住一句话

GitHub 仓库只保存代码和公开占位符。真实的密码、API Token 和 Webhook Secret 放在 Cloudflare 的 **Variables and Secrets** 中，不要放进公开仓库。

GitHub 只是代码来源，不需要保存你的 Cloudflare 密钥。Cloudflare 连接 GitHub 后，会在自己的构建环境中读取你配置的变量和密钥。

## 哪些值可以公开，哪些绝对不能公开

### 可以出现在公开配置中的值

下面这些通常是资源标识符或名称，不是访问凭据：

- D1 Database ID
- KV Namespace ID
- R2 Bucket 名称
- Analytics Dataset 名称
- Cloudflare Account ID

它们可以帮助定位资源，但单独不能登录 Cloudflare，也不能直接读写数据库。真正的访问权限来自 Cloudflare 的登录状态、API Token 和绑定权限。

仓库中的 `wrangler.jsonc` 现在只保留 `YOUR_...` 占位符。部署时，项目脚本会用 `DEPLOY_*` 变量生成被 Git 忽略的 `wrangler.deploy.jsonc`。

### 绝对不能提交到 GitHub 的值

- `NUXT_SITE_TOKEN`：网站后台登录密码和 API 密码
- `CLOUDFLARE_API_TOKEN`：部署或远程迁移使用的 Cloudflare API Token
- `NUXT_CF_API_TOKEN`：访问分析使用的 API Token
- `NUXT_WEBHOOK_SECRET`：Webhook 签名密钥
- R2 S3 Secret Access Key
- GitHub Personal Access Token

如果这类值曾经提交过，即使后来删除文件，也应立即撤销旧 Token 并重新生成。公开 Git 历史可能已经被复制或缓存。

## 本地开发：如何使用 `.env`

`.env` 只放在自己的电脑上，不上传 GitHub。

1. 在项目根目录复制 `.env.example`，重命名为 `.env`。
2. 在 `.env` 中填写自己的 D1、KV、R2 和运行时配置。
3. 运行本地命令，例如 `pnpm deploy:worker` 或本地开发命令。
4. 不要执行 `git add -f .env`。

本项目的 `.gitignore` 已经忽略 `.env`、`.env.*` 和 `wrangler.deploy.jsonc`，但仍建议提交前检查：

```powershell
git status
git diff --cached
```

如果看到 `.env` 或 `wrangler.deploy.jsonc` 出现在待提交文件中，请先移除它们，再提交代码。

不要把 `.env` 内容发到 GitHub Issue、Pull Request、截图、聊天窗口或构建日志中。

## 推荐方式：GitHub → Cloudflare Workers Builds

这是 Workers 部署最简单、也最适合公开仓库的方式。

### 第一步：连接 GitHub

在 Cloudflare 仪表盘中创建或打开 Worker，连接公开 GitHub 仓库，并设置：

- 生产分支：`master`
- 构建命令：`pnpm build`
- 部署命令：`pnpm deploy:worker`

### 第二步：添加构建变量

进入 **Settings → Builds → Variables and Secrets**，添加以下普通变量：

| 变量                             | 内容                                   |
| -------------------------------- | -------------------------------------- |
| `DEPLOY_D1_DATABASE_ID`          | 你的 D1 Database ID                    |
| `DEPLOY_KV_NAMESPACE_ID`         | 你的 KV Namespace ID                   |
| `DEPLOY_KV_PREVIEW_NAMESPACE_ID` | 可选；预览 KV ID，不填则使用生产 KV ID |
| `DEPLOY_R2_BUCKET_NAME`          | 可选；你的 R2 Bucket 名称              |
| `DEPLOY_D1_DATABASE_NAME`        | 可选；默认 `sink`                      |
| `DEPLOY_ANALYTICS_DATASET`       | 可选；默认 `sink`                      |

这些是资源信息，不是密码，可以作为普通变量保存，但仍建议只配置在 Cloudflare，不写入仓库。

### 第三步：添加加密密钥

在同一页面添加以下 **Encrypted** 变量：

| 密钥                  | 用途                |
| --------------------- | ------------------- |
| `NUXT_SITE_TOKEN`     | 后台登录和 API 认证 |
| `NUXT_CF_API_TOKEN`   | 可选；访问分析      |
| `NUXT_WEBHOOK_SECRET` | 可选；Webhook 签名  |

Git 集成通常会由 Cloudflare 管理部署授权，不需要把 Cloudflare API Token 写进 GitHub 仓库。

### 第四步：配置绑定

在 **Settings → Bindings** 中绑定：

- D1，名称必须是 `DB`
- KV，名称必须是 `KV`
- Analytics Engine，名称必须是 `ANALYTICS`
- 可选 R2，名称必须是 `R2`
- 可选 Workers AI，名称必须是 `AI`

保存后，从 `master` 发起一次部署即可。

## 另一种方式：GitHub → Cloudflare Pages

如果使用 Pages，流程类似：

1. Pages 项目连接 GitHub 仓库。
2. 在 **Settings → Variables and Secrets** 中配置变量。
3. 在 **Settings → Bindings** 中绑定 `DB`、`KV`、`ANALYTICS`、`R2` 和 `AI`。
4. 生产分支选择 `master`，重新部署。

Pages 还需要以下部署鉴权配置：

| 变量                    | 类型     | 说明                          |
| ----------------------- | -------- | ----------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | 普通变量 | Cloudflare 账户 ID            |
| `CLOUDFLARE_API_TOKEN`  | 加密密钥 | 用于远程 D1 迁移和 Pages 部署 |
| `NUXT_SITE_TOKEN`       | 加密密钥 | 网站后台和 API 密码           |
| `NUXT_CF_API_TOKEN`     | 加密密钥 | 可选；访问分析                |

`CLOUDFLARE_API_TOKEN` 不要写入 `wrangler.jsonc`，也不要写入 GitHub Actions 的 YAML 文件。Token 至少需要 D1 编辑权限；如果还要从外部执行 Pages 部署，再增加 Pages 编辑权限。

## 如果一定要使用 GitHub Actions

只有在你不使用 Cloudflare 原生 Git 集成时，才需要让 GitHub Actions 执行 Wrangler：

1. 打开 GitHub 仓库的 **Settings → Secrets and variables → Actions**。
2. 创建 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。
3. 在 Workflow 中通过 `${{ secrets.CLOUDFLARE_API_TOKEN }}` 使用，不要直接写 Token。
4. 不要使用 `echo`、`printenv` 或 `set -x` 输出环境变量。
5. 为生产环境启用 Environment 审批和分支限制。

对本项目来说，优先使用 Cloudflare Workers Builds 或 Pages 的 Git 集成，这样 GitHub 只负责存放代码，密钥完全留在 Cloudflare。

## 部署前检查清单

- [ ] `wrangler.jsonc` 中没有真实生产 ID 或密码
- [ ] `.env` 没有被 Git 跟踪
- [ ] `wrangler.deploy.jsonc` 没有被 Git 跟踪
- [ ] `NUXT_SITE_TOKEN` 已设置为高强度密码
- [ ] API Token 已设置为最小权限
- [ ] R2 没有误开启公开访问
- [ ] Workers/Pages 的绑定名称是 `DB`、`KV`、`ANALYTICS`、`R2`、`AI`
- [ ] 部署分支是 `master`
- [ ] 首次部署后打开一次 **Dashboard → Links** 完成存储初始化
