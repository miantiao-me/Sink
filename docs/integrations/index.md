---
title: Integrations
description: Connect Sink to AI coding tools, OpenAPI-to-MCP clients, browser extensions, Raycast, Apple Shortcuts, and iOS.
---

# Integrations

Sink exposes an authenticated REST API and generated OpenAPI document for automation. The following projects and recipes provide convenient entry points; review third-party code and credential handling before use.

## AI Skills

Install the repository's AI Skills package with:

```sh
npx skills add miantiao-me/sink
```

## OpenAPI to MCP

Sink does not ship a native MCP server. An OpenAPI proxy can expose selected routes to an MCP client.

Requires [`uv`](https://github.com/astral-sh/uv) so the `uvx` command is available:

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

Use your own instance URL and site token. Restrict the exposed route set to the operations the client needs, and protect the client configuration as a secret. See [API authentication](/api/#authentication).

## Apps and extensions

- [Sink Tool browser extension](https://github.com/zhuzhuyule/sink-extension)
- [Sink Quick Shorten for Chrome](https://chromewebstore.google.com/detail/sink-quick-shorten/emlojomjpenjgkaphajcokijobpkejih)
- [Raycast-Sink](https://github.com/foru17/raycast-sink)
- [Sink Apple Shortcuts](https://s.search1api.com/sink001)
- [Sink for iOS](https://apps.apple.com/app/id6745417598)

These integrations may be maintained independently of the core Sink repository. Confirm their compatibility with your deployed API version in your instance's [OpenAPI reference](/api/).
