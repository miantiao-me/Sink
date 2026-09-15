---
title: 存储初始化与 KV 迁移
description: 每次部署都需要的一次性存储初始化，以及如何把旧版纯 KV 实例中的链接迁到 D1。
---

# 存储初始化与 KV 迁移

::: warning 谁需要看这页？

- **新部署：** 首次部署后打开一次 **Dashboard → Links**。Sink 会做一次快速空检查并标记存储已就绪。不用导出任何数据。
- **旧部署（链接只存在 KV）：** 按下面完整步骤操作。旧版 Sink 把链接存在 KV 里；此流程会把它们复制到 D1 数据库。
  :::

## 为什么要打开一次 Links？

在正常管理链接之前，Sink 需要完成一次性的「存储就绪」初始化。

::: danger 存储就绪之前
通过 API 创建或编辑链接会失败，并提示 **「存储未就绪」（HTTP 423）**。备份也无法运行。打开 **Dashboard → Links** 会自动开始或继续初始化。
:::

完成之后，就可以正常管理链接。

## 仅旧版升级 — 开始前

- 在 Cloudflare 中保留原 KV 数据
- 升级后的部署仍把该 KV 绑定为 `KV`，D1 绑定为 `DB`
- 迁移完成前不要改链接
- 可选：先用 Cloudflare 仪表盘或 [Wrangler](https://developers.cloudflare.com/kv/api/read-key-value-pairs/)（Cloudflare 命令行工具）导出 KV

## 部署前需要配置什么

在 Cloudflare Workers Builds 或 Pages 的环境变量中配置：

- `DEPLOY_D1_DATABASE_ID`：你自己创建的 D1 数据库 ID，必填
- `DEPLOY_KV_NAMESPACE_ID`：原来存放短链接的 KV 命名空间 ID，必须保持不变
- `DEPLOY_KV_PREVIEW_NAMESPACE_ID`：可选的预览环境 KV ID；不填写时使用上面的 KV ID
- `DEPLOY_D1_DATABASE_NAME`：可选，默认是 `sink`
- `DEPLOY_ANALYTICS_DATASET`：可选，默认是 `sink`，应与 `NUXT_DATASET` 一致

如果继续使用 R2 备份或图片存储，请保留原来的 `R2` 绑定和存储桶。`NUXT_SITE_TOKEN`、`NUXT_CF_ACCOUNT_ID`、`NUXT_CF_API_TOKEN` 以及其他运行时变量也不要删除或改名。

部署时应使用新的 `master` 分支。Workers 使用 `pnpm deploy:worker`；Pages 按项目设置执行部署。部署脚本会根据 `DEPLOY_*` 变量生成实际的 Wrangler 配置，不要把生产环境的 D1 ID 或其他资源 ID 改成上游示例值。

## 仅旧版升级 — 迁移链接

1. 保留或导出原始 KV 数据
2. [升级 Sink](/zh-CN/deployment/upgrading) 并部署新的 `master`
3. 登录并打开 **Dashboard → Links** — 迁移从这里开始或继续
4. 打开 **Dashboard → Migrate → D1** 查看进度
5. 完成后先测试几条短链，再正常编辑

D1 面板用于看状态和恢复，不是主启动按钮 — 请打开 **Links** 开始或继续。

## 每条记录会怎样

迁移时，Sink 会：

- 跳过已过期的链接
- 不覆盖 D1 里已有的链接
- 不恢复已经删除的链接
- 某条失败时，保留已经成功迁过去的链接

## 如果失败了

可以安全重试。在原始 KV 数据里修好或删掉坏记录，再打开 **Dashboard → Links**。D1 里已有的链接不会被覆盖。

在 **Dashboard → Migrate → D1** 查看结果。强制重新扫描只用于正常跑完后的受控恢复；同样不会覆盖已有或已删除的 D1 链接。
