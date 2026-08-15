---
title: 链接备份
description: 把链接快照存到 R2、包含什么、如何计划执行，以及恢复限制。
---

# 链接备份

Sink 备份是存在 **R2**（Cloudflare 文件存储）里的**链接 JSON 快照**。它不是完整数据库转储。

## 需要什么

1. 绑定 **R2**
2. 完成一次性存储初始化：部署后打开 **Dashboard → Links**。在此之前备份会失败，并提示「存储未就绪」（HTTP 423）。见[存储初始化](/zh-CN/storage/kv-to-d1)
3. 在仪表盘或通过 `POST /api/backup` 创建快照

每日自动备份需要 Workers 定时任务（本仓库：**UTC 00:00**）。可用 `NUXT_DISABLE_AUTO_BACKUP=true` 关闭。Pages 只支持**手动**快照。

文件名：

- 自动：`backups/links-<timestamp>.json`
- 手动：`backups/manual-links-<timestamp>.json`

## 里面有什么

D1 里的全部链接记录，包括过期链接和密码材料。请把每个快照当作**机密**。

::: warning 快照是敏感数据
严格限制谁能读 R2 桶。快照可能包含密码材料和完整目标 URL。
:::

不包含：数据库结构、删除标记、迁移历史、访问分析数据。

## 恢复限制

Sink 不会自动清理旧快照，也不提供一键完整恢复。你可以从快照[导入](./import-export)记录（仍走普通导入规则）。数据库级恢复见 Cloudflare D1 [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)。
