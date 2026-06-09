# Sink API

Sink provides a complete RESTful API for managing short links. Full API documentation is available via OpenAPI.

## OpenAPI Documentation

- **OpenAPI JSON**: `/_docs/openapi.json`
- **Scalar UI**: `/_docs/scalar`
- **Swagger UI**: `/_docs/swagger`

Visit your Sink instance at `https://your-domain/_docs/scalar` for interactive API documentation.

## Authentication

All API endpoints require authentication via Bearer token in the `Authorization` header:

```http
Authorization: Bearer YOUR_SITE_TOKEN
```

The token is the same as `NUXT_SITE_TOKEN` configured in your environment variables.

## API Endpoints

### Links

| Method | Endpoint            | Description                            |
| ------ | ------------------- | -------------------------------------- |
| `POST` | `/api/link/create`  | Create a new short link                |
| `PUT`  | `/api/link/edit`    | Update an existing link                |
| `POST` | `/api/link/upsert`  | Create or update a link by slug        |
| `POST` | `/api/link/delete`  | Delete a link                          |
| `GET`  | `/api/link/query`   | Get a link by slug                     |
| `GET`  | `/api/link/search`  | Search links                           |
| `GET`  | `/api/link/list`    | List all links (paginated)             |
| `GET`  | `/api/link/export`  | Export all links as paginated JSON     |
| `POST` | `/api/link/import`  | Import links from exported JSON        |
| `GET`  | `/api/link/ai`      | Generate an AI-powered slug suggestion |
| `GET`  | `/api/link/og-ai`   | Generate AI-powered OpenGraph metadata |
| `POST` | `/api/upload/image` | Upload an OpenGraph image to R2        |
| `POST` | `/api/backup`       | Trigger a manual KV backup to R2       |

### Analytics

| Method | Endpoint              | Description                       |
| ------ | --------------------- | --------------------------------- |
| `GET`  | `/api/stats/counters` | Get analytics counters            |
| `GET`  | `/api/stats/metrics`  | Get detailed metrics by dimension |
| `GET`  | `/api/stats/views`    | Get time-series view counts       |
| `GET`  | `/api/stats/heatmap`  | Get heatmap data                  |
| `GET`  | `/api/stats/export`   | Export access analytics as CSV    |
| `GET`  | `/api/logs/events`    | Get real-time event logs          |
| `GET`  | `/api/logs/locations` | Get recent access locations       |

## Example: Create Short Link

```http
POST /api/link/create
Authorization: Bearer SinkCool
Content-Type: application/json

{
  "url": "https://github.com/miantiao-me/Sink",
  "slug": "sink",
  "comment": "GitHub repo",
  "expiration": 1767225599,
  "apple": "https://apps.apple.com/app/id6745417598",
  "google": "https://play.google.com/store/apps/details?id=com.example",
  "geo": {
    "US": "https://example.com/us",
    "JP": "https://example.com/jp"
  },
  "title": "Sink - Link Shortener",
  "description": "A simple, speedy, secure link shortener",
  "image": "/_assets/images/sink/cover.webp",
  "password": "correct-horse-battery-staple",
  "unsafe": false,
  "redirectWithQuery": true
}
```

### Response

```json
{
  "link": {
    "id": "01jxyz...",
    "url": "https://github.com/miantiao-me/Sink",
    "slug": "sink",
    "comment": "GitHub repo",
    "createdAt": 1718119809,
    "updatedAt": 1718119809
  }
}
```

## Request Body Fields

| Field               | Type      | Required | Description                                                           |
| ------------------- | --------- | -------- | --------------------------------------------------------------------- |
| `url`               | `string`  | ✅       | Target URL (max 2048 chars)                                           |
| `slug`              | `string`  | ❌       | Custom slug (auto-generated if omitted)                               |
| `comment`           | `string`  | ❌       | Internal note for the link                                            |
| `expiration`        | `number`  | ❌       | Unix timestamp in seconds; must be in the future                      |
| `apple`             | `string`  | ❌       | Apple device redirect URL                                             |
| `google`            | `string`  | ❌       | Android/Google Play redirect URL                                      |
| `geo`               | `object`  | ❌       | Country-specific routing map, for example `{ "US": "https://..." }`   |
| `title`             | `string`  | ❌       | OpenGraph title                                                       |
| `description`       | `string`  | ❌       | OpenGraph description                                                 |
| `image`             | `string`  | ❌       | OpenGraph image URL or uploaded asset path                            |
| `cloaking`          | `boolean` | ❌       | Enable link cloaking (mask destination URL with short link)           |
| `redirectWithQuery` | `boolean` | ❌       | Append query parameters to destination URL (overrides global setting) |
| `password`          | `string`  | ❌       | Password protection for the link (stored hashed)                      |
| `unsafe`            | `boolean` | ❌       | Mark link as unsafe (shows warning page before redirect)              |

### Routing Behavior

- Geo-routing uses Cloudflare's `request.cf.country` value and two-letter ISO country codes. Keys are normalized to uppercase.
- Device routing takes precedence over the default or geo-routed target when the visitor matches Apple or Android user agents.
- If `redirectWithQuery` is enabled, query parameters from the short link are appended to the final target URL.

### Password-Protected and Unsafe Links

Password-protected links render an HTML password form for browser visitors. API or scripted clients can pass `x-link-password` when requesting the short link. Unsafe links require confirmation before redirecting; scripted clients can pass `x-link-confirm: true` after validating the destination.

### Example: Generate OpenGraph Metadata with AI

```http
GET /api/link/og-ai?url=https%3A%2F%2Fgithub.com%2Fmiantiao-me%2FSink&locale=en-US
Authorization: Bearer SinkCool
```

```json
{
  "title": "Sink",
  "description": "A simple, speedy, secure link shortener with analytics on Cloudflare."
}
```

### Example: Export Access Analytics as CSV

```http
GET /api/stats/export?startAt=1717200000&endAt=1719791999&slug=sink
Authorization: Bearer SinkCool
```

The response is `text/csv` with these columns:

```csv
slug,url,viewer,views,referer
sink,https://github.com/miantiao-me/Sink,123,456,12
```

## CORS

To enable CORS for API endpoints, set `NUXT_API_CORS=true` during build.
