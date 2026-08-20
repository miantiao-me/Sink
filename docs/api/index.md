---
title: REST API
description: OpenAPI docs, authentication, CORS, and endpoint index for Sink.
---

# REST API

## Interactive docs

Every Sink instance publishes API docs at:

- `https://your-domain/_docs/openapi.json` — machine-readable OpenAPI
- `https://your-domain/_docs/scalar` — friendly UI
- `https://your-domain/_docs/swagger` — classic Swagger UI

Use your own domain. Public demo: [https://sink.cool/_docs/scalar](https://sink.cool/_docs/scalar).

## Authentication

Send your site password in the `Authorization` header:

```http
Authorization: Bearer YOUR_SITE_TOKEN
```

(`Bearer` means “here is the token”.) In single-user mode it must match `NUXT_SITE_TOKEN` exactly (at least 8 characters). In OIDC multi-user mode, protected APIs require the browser's OIDC session and reject the site token. OIDC access and ID tokens remain on the server and are never stored by the browser.

## CORS

Optional. Set `NUXT_API_CORS=true` at build time to allow browser apps on other sites to call `/api/**`. Login is still required. See [configuration](/configuration/#optional).

## Before you call link APIs

::: warning Storage must be ready
Until you open **Dashboard → Links** once after deploy, most `/api/link/**` calls fail with **“storage not ready” (HTTP 423)**. See [storage setup](/storage/kv-to-d1).
:::

- `upsert` creates when free; if the short code exists, returns it with `status: "existing"` (does **not** overwrite)
- `search` matches short code, URL, comment, and tags
- `check` probes target URLs from the server
- `verify` checks how you are authenticated
- `location` returns approximate coordinates when Cloudflare provides them
- Image upload needs R2 (JPEG/PNG/WebP/GIF, max 5 MB)

## Endpoint groups

Use the OpenAPI UI for full request/response details.

| Group         | Routes                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------- |
| Links         | `/api/link/create`, `edit`, `upsert`, `delete`, `query`, `search`, `list`, `check`, `tags`   |
| Import/export | `/api/link/import`, `/api/link/export` — [Import and Export](/features/import-export)        |
| Storage setup | `/api/link/migration/status`, `/api/link/migration/run` — [storage setup](/storage/kv-to-d1) |
| AI            | `/api/link/ai`, `/api/link/og-ai` — [Workers AI](/features/ai)                               |
| Analytics     | `/api/stats/**`, `/api/logs/**` — [Analytics](/features/analytics)                           |
| Utilities     | `/api/verify`, `/api/location`, `/api/upload/image`, `/api/backup`                           |
