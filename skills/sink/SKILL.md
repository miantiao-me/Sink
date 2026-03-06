---
name: sink
description: |
  Sink short link API operations via OpenAPI. Use when managing short links: creating, querying, updating, deleting, listing, importing, or exporting links. Also covers AI-powered slug generation and link analytics.
  Triggers: "create short link", "shorten URL", "delete link", "edit link", "list links", "export links", "import links", "link analytics", "AI slug".
---

# Sink API

Sink is a link shortener running on Cloudflare. Manage links via REST API.

## Authentication

All endpoints require Bearer token authentication:

```http
Authorization: Bearer YOUR_SITE_TOKEN
```

Token = `NUXT_SITE_TOKEN` environment variable.

## Base URL

```
https://your-sink-domain
```

## API Reference

### Create Link

```http
POST /api/link/create
Content-Type: application/json

{
  "url": "https://example.com/long-url",
  "slug": "custom-slug",
  "comment": "optional note",
  "expiration": 1735689599,
  "apple": "https://apps.apple.com/app/id123",
  "google": "https://play.google.com/store/apps/details?id=com.example"
}
```

**Required**: `url`
**Optional**: `slug` (auto-generated if omitted), `comment`, `expiration` (unix timestamp), `apple` (iOS redirect), `google` (Android redirect), `password`, `unsafe`, `title`, `description`, `image`, `cloaking`, `redirectWithQuery`

> If `NUXT_SAFE_BROWSING_DOH` is configured and `unsafe` is not explicitly set, the server auto-detects via DoH and marks unsafe links automatically.

**Response** (201):

```json
{
  "link": {
    "id": "abc123",
    "url": "https://example.com/long-url",
    "slug": "custom-slug",
    "createdAt": 1718119809,
    "updatedAt": 1718119809
  },
  "shortLink": "https://your-domain/custom-slug"
}
```

**Errors**: 409 (slug exists)

### Query Link

```http
GET /api/link/query?slug=custom-slug
```

**Response** (200):

```json
{
  "id": "abc123",
  "url": "https://example.com",
  "slug": "custom-slug",
  "createdAt": 1718119809,
  "updatedAt": 1718119809
}
```

**Errors**: 404 (not found)

### Edit Link

```http
PUT /api/link/edit
Content-Type: application/json

{
  "slug": "existing-slug",
  "url": "https://new-url.com",
  "comment": "updated note"
}
```

**Required**: `slug` (identifies which link to edit), `url`
**Optional**: other fields to update

**Response** (201): Same as create

**Errors**: 404 (not found)

### Delete Link

```http
POST /api/link/delete
Content-Type: application/json

{
  "slug": "slug-to-delete"
}
```

**Response**: 200 (empty body)

### List Links

```http
GET /api/link/list?limit=20&cursor=abc123
```

**Parameters**:

- `limit`: max 1024, default 20
- `cursor`: pagination cursor from previous response

**Response**:

```json
{
  "keys": [],
  "list_complete": false,
  "cursor": "next-cursor"
}
```

### Export Links

```http
GET /api/link/export
```

**Response**:

```json
{
  "version": "1.0",
  "exportedAt": "2024-01-01T00:00:00Z",
  "count": 100,
  "links": [],
  "list_complete": true
}
```

### Import Links

```http
POST /api/link/import
Content-Type: application/json

{
  "links": [
    {"url": "https://example1.com", "slug": "ex1"},
    {"url": "https://example2.com", "slug": "ex2"}
  ]
}
```

**Response**: imported links array

### AI Slug Generation

```http
GET /api/link/ai?url=https://example.com/article
```

**Response**:

```json
{
  "slug": "ai-generated-slug"
}
```

### Verify Token

```http
GET /api/verify
```

Verify if the site token is valid.

**Response** (200):

```json
{
  "name": "Sink",
  "url": "https://sink.cool"
}
```

**Errors**: 401 (invalid token)

## Link Fields

| Field               | Type    | Required | Description                                                                          |
| ------------------- | ------- | -------- | ------------------------------------------------------------------------------------ |
| `url`               | string  | Yes      | Target URL (max 2048)                                                                |
| `slug`              | string  | No       | Custom slug (auto-generated)                                                         |
| `comment`           | string  | No       | Internal note                                                                        |
| `expiration`        | number  | No       | Unix timestamp                                                                       |
| `apple`             | string  | No       | iOS/macOS redirect URL                                                               |
| `google`            | string  | No       | Android redirect URL                                                                 |
| `title`             | string  | No       | Custom title (max 256)                                                               |
| `description`       | string  | No       | Custom description                                                                   |
| `image`             | string  | No       | Custom image path                                                                    |
| `cloaking`          | boolean | No       | Enable link cloaking                                                                 |
| `redirectWithQuery` | boolean | No       | Append query params to destination URL (overrides global `NUXT_REDIRECT_WITH_QUERY`) |
| `password`          | string  | No       | Password protection for the link                                                     |
| `unsafe`            | boolean | No       | Mark as unsafe (shows warning page before redirect)                                  |

## Analytics Endpoints

### Summary

```http
GET /api/stats/summary
```

### Metrics

```http
GET /api/stats/metrics
```

### Realtime

```http
GET /api/stats/realtime
```

## OpenAPI Docs

- JSON: `/_docs/openapi.json`
- Scalar UI: `/_docs/scalar`
- Swagger UI: `/_docs/swagger`

## cURL Examples

Create link:

```bash
curl -X POST https://your-domain/api/link/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/example"}'
```

List links:

```bash
curl https://your-domain/api/link/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Delete link:

```bash
curl -X POST https://your-domain/api/link/delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug": "my-slug"}'
```
