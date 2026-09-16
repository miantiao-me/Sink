---
title: 集成
description: 通过内置 MCP Server 将 Sink 连接到 AI 编码工具，以及浏览器扩展、Raycast、Apple 快捷指令和 iOS。
---

# 集成

Sink 提供已认证的 REST API 和自动生成的 OpenAPI 文档，便于自动化操作。以下项目和示例提供了便捷的入口；使用前请检查第三方代码及其凭据处理方式。

## AI Skills

使用以下命令安装仓库的 AI Skills 包：

```sh
npx skills add miantiao-me/sink
```

## MCP Server

Sink 在 `POST /api/mcp` 提供 Model Context Protocol 端点。它实现了 Streamable HTTP 传输的无状态 [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) 修订版，同时兼容旧客户端仍在使用的基于初始化握手的修订版，因此现有 MCP 客户端无需额外配置即可使用。

该端点使用与 REST API 相同的 Bearer 令牌进行认证，无需单独的凭据。详见 [API 身份认证](/zh-CN/api/#身份认证)。

```sh
claude mcp add --transport http sink https://your-domain/api/mcp --header "Authorization: Bearer YOUR_SITE_TOKEN"
```

任何支持 HTTP 传输与自定义请求头的客户端都可以用同样的方式连接：

```json
{
  "mcpServers": {
    "sink": {
      "type": "http",
      "url": "https://your-domain/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SITE_TOKEN"
      }
    }
  }
}
```

### 工具

| 工具                     | 说明                                        |
| ------------------------ | ------------------------------------------- |
| `list_links`             | 按最新优先列出链接，支持游标分页。          |
| `search_links`           | 按关键字或精确目标 URL 搜索链接。           |
| `get_link`               | 按 slug 读取单个链接。                      |
| `count_links`            | 统计匹配关键字、URL、标签或状态的链接数量。 |
| `list_tags`              | 列出正在使用的标签及其链接数量。            |
| `create_link`            | 创建链接，未提供 slug 时自动生成。          |
| `update_link`            | 替换现有链接的全部可写字段。                |
| `upsert_link`            | 返回该 slug 的现有链接，不存在时创建。      |
| `delete_link`            | 永久删除链接。                              |
| `get_analytics_counters` | 总访问量、访客数与来源数。                  |
| `get_analytics_views`    | 按分钟、小时或天分桶的访问量与访客数。      |
| `get_analytics_metrics`  | 某个访问日志维度的 Top 值。                 |

写入类工具与 REST API 一样遵循 `NUXT_PUBLIC_PREVIEW_MODE` 和 KV 到 D1 的迁移门控；分析类工具读取与仪表盘相同的采样访问日志，因此结果为估算值。

该端点位于 `/api/` 之下，因此不占用短链接命名空间：slug 不能包含斜杠，所以没有短链接会遮蔽它，也无需保留 slug。升级不会夺走实例上已在使用的任何 slug。

## OpenAPI 转 MCP

当客户端无法访问内置端点时（例如仅支持 stdio 服务端），可以改用 OpenAPI 代理。

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
