---
title: 点击 Webhook
description: 启用点击 Webhook，并了解其 HMAC 签名验证、投递行为、负载和隐私边界。
---

# 点击 Webhook

可选功能。有人点击短链接时，Sink 可以向你的 URL 发送一条 JSON 事件。在[配置参考](./)中设置 `NUXT_WEBHOOK_URL`（以及可选的 `NUXT_WEBHOOK_SECRET`）。

从访问分析中排除的机器人点击，这里也不会发送。

## 签名（可选，建议开启）

如果设置密钥，必须以 `whsec_` 开头。在已安装 OpenSSL 的电脑上生成：

```sh
printf 'whsec_%s\n' "$(openssl rand -base64 32)"
```

每个请求包含 `webhook-id` 和 `webhook-timestamp`。已签名请求还包含 `webhook-signature: v1,<base64>`，签名内容为：

```txt
<webhook-id>.<webhook-timestamp>.<raw-body>
```

请在解析 JSON **之前**校验原始请求体。密钥填错会导致投递失败（不会回退成未签名）。

## 负载

事件类型 `link.clicked` 包含事件 ID/时间、链接 ID/短链码，以及点击属性（国家、城市、设备、浏览器、系统、来源）。

**不包含** IP、坐标、完整 User-Agent、查询参数、密码或目标 URL。

## 投递限制

::: tip 尽力投递
投递是异步的，绝不会阻塞跳转。失败**不会**重试。你的服务器必须在 10 秒内返回 2xx。请优先使用 HTTPS。
:::
