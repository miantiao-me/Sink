---
title: 升级 Sink
description: 通过同步 GitHub Fork 并重新部署来升级 Sink。
---

# 升级 Sink

## 升级前

1. 看一眼上游版本说明
2. 不要删除 Cloudflare 绑定、密钥和环境变量
3. 如果已配置 R2，可先手动[备份](/zh-CN/features/backups)

## 普通升级（当前 D1 部署）

1. 在 GitHub 打开你的 Fork → 点 **Sync fork** 同步最新 `master`。如果自己改过文件，先解决冲突
2. 在 Cloudflare（Workers Builds 或 Pages）重新部署更新后的 `master`
3. 等待部署完成（数据库更新会在部署过程中自动执行）

## 可选：给仪表盘单独的域名

除非你主动配置，否则行为不变：仪表盘仍在 `/dashboard/links`，`dashboard` 仍是保留 slug。

设置 [`NUXT_PUBLIC_DASHBOARD_URL`](/zh-CN/configuration/#给仪表盘单独的子域名) 并把该域名添加到同一个 Worker 或 Pages 项目后，仪表盘移到该域名的根路径（`dash.example.com/links`），`/dashboard` 可以用作短链接 slug，并且只有该域名响应 `/api/**`，因此请重新指向 API 客户端和 MCP 集成。原有的 `/dashboard/...` 书签会失效；首页的 **Dashboard** 按钮始终指向正确位置。

## 升级很旧的实例（链接只存在 KV 里）

如果旧版本只用 KV 存链接，请先保留该 KV 数据，再按[存储初始化 / 迁移](/zh-CN/storage/kv-to-d1)操作。

## 升级后快速检查

- 能登录仪表盘
- 打开一次 **Dashboard → Links**（如需会完成存储初始化）
- 创建、打开、编辑、删除一个测试链接
- 若用了访问分析，确认能看到数据
