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

| Method | Endpoint           | Description                         |
| ------ | ------------------ | ----------------------------------- |
| `POST` | `/api/link/create` | Create a new short link             |
| `PUT`  | `/api/link/edit`   | Update an existing link             |
| `POST` | `/api/link/delete` | Delete a link                       |
| `GET`  | `/api/link/list`   | List all links (paginated)          |
| `GET`  | `/api/link/export` | Export all links as JSON            |
| `POST` | `/api/link/import` | Import links from JSON              |
| `GET`  | `/api/link/ai`     | Generate AI-powered slug suggestion |

### Analytics

| Method | Endpoint              | Description                       |
| ------ | --------------------- | --------------------------------- |
| `GET`  | `/api/stats/summary`  | Get analytics summary             |
| `GET`  | `/api/stats/metrics`  | Get detailed metrics by dimension |
| `GET`  | `/api/stats/realtime` | Get real-time analytics data      |

## Example: Create Short Link

```http
POST /api/link/create
Authorization: Bearer SinkCool
Content-Type: application/json

{
  "url": "https://github.com/miantiao-me/Sink",
  "slug": "sink",
  "comment": "GitHub repo",
  "expiration": "2025-12-31T23:59:59Z",
  "ios": "https://apps.apple.com/app/id6745417598",
  "android": "https://play.google.com/store/apps/details?id=com.example",
  "ogTitle": "Sink - Link Shortener",
  "ogDescription": "A simple, speedy, secure link shortener",
  "ogImage": "https://example.com/image.png"
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
| `expiration`        | `string`  | ❌       | ISO 8601 expiration date                                              |
| `ios`               | `string`  | ❌       | iOS/macOS redirect URL                                                |
| `android`           | `string`  | ❌       | Android redirect URL                                                  |
| `ogTitle`           | `string`  | ❌       | OpenGraph title                                                       |
| `ogDescription`     | `string`  | ❌       | OpenGraph description                                                 |
| `ogImage`           | `string`  | ❌       | OpenGraph image URL                                                   |
| `cloaking`          | `boolean` | ❌       | Enable link cloaking (mask destination URL with short link)           |
| `redirectWithQuery` | `boolean` | ❌       | Append query parameters to destination URL (overrides global setting) |
| `password`          | `string`  | ❌       | Password protection for the link                                      |
| `unsafe`            | `boolean` | ❌       | Mark link as unsafe (shows warning page before redirect)              |

## CORS

To enable CORS for API endpoints, set `NUXT_API_CORS=true` during build.
