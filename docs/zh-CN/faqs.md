---
title: 故障排查
description: 解决常见的部署、登录、访问分析、重定向、导入、备份和功能问题。
---

# 故障排查

## 无法创建或打开短链接

1. 确认 D1 和 KV 已用准确名称 `DB` 和 `KV` 绑定
2. 重新部署最新的 `master` 分支
3. 打开一次 **Dashboard → Links**（一次性存储初始化）

如果看到 **「存储未就绪」（HTTP 423）**，说明第 3 步还没做。新部署只需打开一次。很旧的纯 KV 实例需要[存储迁移](/zh-CN/storage/kv-to-d1)。

<details>
  <summary><b>KV 绑定截图</b></summary>
  <img alt="Cloudflare 中的 KV 绑定设置" src="../images/faqs-kv.png">
</details>

## 无法登录或调用 API

密码必须与 `NUXT_SITE_TOKEN` 完全一致（不要有多余空格）。至少 8 个字符。如果从未设置过，可能用了构建时的随机密码 — 请显式设置密钥并重新部署。

如果使用了 Cloudflare Access：

- `NUXT_CF_ACCESS_TEAM_DOMAIN` 与 `NUXT_CF_ACCESS_AUD` 都已设置
- AUD 来自该 Access 应用
- Access Cookie 能到达 `/api`（不要把 Cookie Path 只限在 `/dashboard`）

## 访问分析为空

请逐项确认：

1. Analytics Engine 已绑定为 `ANALYTICS`
2. 数据集名称一致（默认 `sink`，或与 `NUXT_DATASET` 相同）
3. `NUXT_CF_ACCOUNT_ID` 是承载本应用的账户
4. `NUXT_CF_API_TOKEN` 是仅含 **Account → Account Analytics → Read** 的 Custom Token
5. 机器人过滤或仪表盘筛选没有把流量藏起来

完整步骤见[访问分析](/zh-CN/features/analytics)。

<details>
  <summary><b>Analytics Engine 绑定截图</b></summary>
  <img alt="Cloudflare 中的 Analytics Engine 绑定设置" src="../images/faqs-Analytics_engine.png">
</details>

## 近实时事件成批到达或感觉有延迟

这是预期行为。页面大约每 10 秒刷新一次，并以大约每秒 1 个事件回放。它不是 WebSocket 实时流。同时确认视图未暂停、标签页可见。

## 自定义短链码不保留大写

设置 `NUXT_CASE_SENSITIVE=true` 并重新部署。只影响**自定义**码；自动生成的码始终小写。已有码不会自动改名。

## 隐匿页面空白或拒绝加载

目标站很可能禁止被嵌入。请关闭隐匿；若你控制目标站，也可改其策略。OAuth 和支付页通常会拒绝嵌入。

## 安全浏览没有更改 unsafe 标志

仅当创建/编辑时**未设置** `unsafe` 才会自动检测。显式的 `true` 或 `false` 始终优先。DNS 检查失败时，Sink 会放行链接。

## 导入跳过或拒绝记录

- 活动短链码冲突会跳过
- 格式错误会失败
- 过期记录允许导入（有意为之）

每个请求不要超过导出分页大小的一半。请使用导出得到的受保护密码，不要用仪表盘里遮盖后的占位符。

## 没有创建备份

1. 确认已绑定 `R2`
2. 若存储尚未就绪，先打开一次 **Dashboard → Links**（此前备份会返回 423）
3. Workers 计划备份：检查 `NUXT_DISABLE_AUTO_BACKUP` 与 Cron
4. Pages：本仓库只支持手动备份

## 重定向看起来仍是旧值

浏览器、CDN 或 KV 缓存可能延迟可见变更。在[配置参考](/zh-CN/configuration/#高级默认值)中查看 `NUXT_LINK_CACHE_TTL` 和 `NUXT_REDIRECT_NO_STORE`，再在仪表盘确认链接。

未知短链码（`NUXT_NOT_FOUND_REDIRECT`）始终使用 **302**，即使普通跳转是 `301`。
