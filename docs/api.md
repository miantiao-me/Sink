# Sink API

Sink 提供了完整的 RESTful API 用于管理短链接。完整的 API 文档可通过 OpenAPI 获取。

## OpenAPI 文档

- **OpenAPI JSON**：`/_docs/openapi.json`
- **Scalar UI**：`/_docs/scalar`
- **Swagger UI**：`/_docs/swagger`

访问您的 Sink 实例的 `https://your-domain/_docs/scalar` 以获取交互式 API 文档。

## 认证

所有 API 端点都需要通过 `Authorization` 头中的 Bearer token 进行认证：

```http
Authorization: Bearer YOUR_SITE_TOKEN
```

该令牌与您在环境变量中配置的 `NUXT_SITE_TOKEN` 相同。

## API 端点

### 链接

| 方法   | 端点               | 描述                               |
| ------ | ------------------ | ---------------------------------- |
| `POST` | `/api/link/create` | 创建新的短链接                     |
| `PUT`  | `/api/link/edit`   | 更新现有链接                       |
| `POST` | `/api/link/delete` | 删除链接                           |
| `GET`  | `/api/link/list`   | 列出所有链接（分页）               |
| `GET`  | `/api/link/export` | 将所有链接导出为 JSON              |
| `POST` | `/api/link/import` | 从 JSON 导入链接                   |
| `GET`  | `/api/link/ai`     | 生成 AI 驱动的 slug 建议           |

### 分析

| 方法   | 端点                  | 描述                               |
| ------ | --------------------- | ---------------------------------- |
| `GET`  | `/api/stats/summary`  | 获取分析摘要                       |
| `GET`  | `/api/stats/metrics`  | 按维度获取详细指标                 |
| `GET`  | `/api/stats/realtime` | 获取实时分析数据                   |

## 示例：创建短链接

```http
POST /api/link/create
Authorization: Bearer SinkCool
Content-Type: application/json

{
  "url": "https://github.com/miantiao-me/Sink",
  "slug": "sink",
  "comment": "GitHub 仓库",
  "expiration": "2025-12-31T23:59:59Z",
  "ios": "https://apps.apple.com/app/id6745417598",
  "android": "https://play.google.com/store/apps/details?id=com.example",
  "ogTitle": "Sink - 链接缩短器",
  "ogDescription": "一个简单、快速、安全的链接缩短器",
  "ogImage": "https://example.com/image.png"
}
```

### 响应

```json
{
  "link": {
    "id": "01jxyz...",
    "url": "https://github.com/miantiao-me/Sink",
    "slug": "sink",
    "comment": "GitHub 仓库",
    "createdAt": 1718119809,
    "updatedAt": 1718119809
  }
}
```

## 请求体字段

| 字段               | 类型      | 必填 | 描述                                                               |
| ------------------- | --------- | ---- | ------------------------------------------------------------------ |
| `url`               | `string`  | ✅    | 目标 URL（最大 2048 字符）                                         |
| `slug`              | `string`  | ❌    | 自定义 slug（省略则自动生成）                                       |
| `comment`           | `string`  | ❌    | 链接的内部备注                                                     |
| `expiration`        | `string`  | ❌    | ISO 8601 过期日期                                                  |
| `ios`               | `string`  | ❌    | iOS/macOS 重定向 URL                                               |
| `android`           | `string`  | ❌    | Android 重定向 URL                                                 |
| `ogTitle`           | `string`  | ❌    | OpenGraph 标题                                                    |
| `ogDescription`     | `string`  | ❌    | OpenGraph 描述                                                    |
| `ogImage`           | `string`  | ❌    | OpenGraph 图片 URL                                                |
| `cloaking`          | `boolean` | ❌    | 启用链接伪装（用短链接掩盖目标 URL）                               |
| `redirectWithQuery` | `boolean` | ❌    | 将查询参数附加到目标 URL（覆盖全局设置）                           |
| `password`          | `string`  | ❌    | 链接的密码保护                                                     |
| `unsafe`            | `boolean` | ❌    | 标记链接为不安全（在重定向前显示警告页面）                         |

## CORS

要为 API 端点启用 CORS，请在构建期间设置 `NUXT_API_CORS=true`。
