---
title: Integrations
description: Connect Sink to AI coding tools through its built-in MCP server, plus browser extensions, Raycast, Apple Shortcuts, and iOS.
---

# Integrations

Sink exposes an authenticated REST API and generated OpenAPI document for automation. The following projects and recipes provide convenient entry points; review third-party code and credential handling before use.

## AI Skills

Install the repository's AI Skills package with:

```sh
npx skills add miantiao-me/sink
```

## MCP Server

Sink serves a Model Context Protocol endpoint at `POST /api/mcp`. It implements the stateless [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) revision of the Streamable HTTP transport, and also answers the initialization-based revisions that older clients still speak, so current MCP clients work without extra configuration.

The endpoint authenticates with the same bearer token as the REST API, so no separate credential is needed. See [API authentication](/api/#authentication).

```sh
claude mcp add --transport http sink https://your-domain/api/mcp --header "Authorization: Bearer YOUR_SITE_TOKEN"
```

Any client that supports an HTTP transport with custom headers can connect the same way:

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

### Tools

| Tool                     | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `list_links`             | List links newest first, with cursor pagination.      |
| `search_links`           | Search links by keyword or exact destination URL.     |
| `get_link`               | Read a single link by slug.                           |
| `count_links`            | Count links matching a keyword, URL, tag, or status.  |
| `list_tags`              | List tags in use and how many links carry each.       |
| `create_link`            | Create a link, generating a slug when none is given.  |
| `update_link`            | Replace every writable field of an existing link.     |
| `upsert_link`            | Return the existing link for a slug, or create it.    |
| `delete_link`            | Permanently delete a link.                            |
| `get_analytics_counters` | Total visits, visitors, and referers.                 |
| `get_analytics_views`    | Visits and visitors bucketed by minute, hour, or day. |
| `get_analytics_metrics`  | Top values for one access-log dimension.              |

The write tools honor `NUXT_PUBLIC_PREVIEW_MODE` and the KV-to-D1 migration gate exactly as the REST API does, and analytics tools read the same sampled access log as the dashboard, so their counts are estimates.

The endpoint sits under `/api/` so it stays out of the short-link namespace: a slug cannot contain a slash, so no link can shadow it and no reserved slug is needed. Upgrading never takes a slug away from an instance that already uses one.

## OpenAPI to MCP

An OpenAPI proxy is an alternative when a client cannot reach the built-in endpoint, for example because it only supports stdio servers.

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
