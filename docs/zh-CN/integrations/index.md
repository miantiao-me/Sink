---
title: 集成
description: 将 Sink 连接到 AI 编码工具、OpenAPI 转 MCP 客户端、浏览器扩展、Raycast、Apple 快捷指令和 iOS。
---

# 集成

Sink 提供已认证的 REST API 和自动生成的 OpenAPI 文档，便于自动化操作。以下项目和示例提供了便捷的入口；使用前请检查第三方代码及其凭据处理方式。

## AI Skills

使用以下命令安装仓库的 AI Skills 包：

```sh
npx skills add miantiao-me/sink
```

## OpenAPI 转 MCP

Sink 不提供原生 MCP Server。OpenAPI 代理可以向 MCP 客户端公开选定的路由。

需要先安装 [`uv`](https://github.com/astral-sh/uv)，以便使用 `uvx` 命令：

```json
{
  "mcpServers": {
    "sink": {
      "command": "uvx",
      "args": ["mcp-openapi-proxy"],
      "env": {
        "OPENAPI_SPEC_URL": "https://your-domain/_docs/openapi.json",
        "API_KEY": "YOUR_SITE_TOKEN",
        "TOOL_WHITELIST": "/api/link"
      }
    }
  }
}
```

使用你自己的实例 URL 和站点令牌。将公开的路由范围限制为客户端所需的操作，并将客户端配置作为密钥保护。详见 [API 身份认证](/zh-CN/api/#身份认证)。

## 应用与扩展

- [Sink Tool 浏览器扩展](https://github.com/zhuzhuyule/sink-extension)
- [Sink Quick Shorten for Chrome](https://chromewebstore.google.com/detail/sink-quick-shorten/emlojomjpenjgkaphajcokijobpkejih)
- [Raycast-Sink](https://github.com/foru17/raycast-sink)
- [Sink Apple 快捷指令](https://s.search1api.com/sink001)
- [Sink for iOS](https://apps.apple.com/app/id6745417598)

这些集成可能独立于 Sink 核心仓库维护。请通过实例的 [OpenAPI 参考](/zh-CN/api/)确认其与你部署的 API 版本兼容。
