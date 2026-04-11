# 仓库指南

为在 Sink 代码库中运行的代理编码代理提供的指南。

## 项目概述

Sink 是一个带有分析功能的链接缩短器，100% 运行在 Cloudflare 上。使用 Nuxt 4 前端和 Cloudflare Workers 后端。

**所有文档和注释必须使用中文。**

## 项目结构

```
app/                    # Nuxt 4 应用（主应用层）
  ├── components/       # Vue 组件（PascalCase 命名）
  │   └── ui/           # shadcn-vue 组件（请勿编辑 - 自动生成）
  ├── composables/      # Vue 组合式函数（camelCase，use* 前缀）
  ├── pages/            # 文件式路由
  ├── types/            # TypeScript 类型（从 shared/ 重新导出）
  ├── utils/            # 工具函数
  └── lib/              # 共享助手
layers/dashboard/       # 仪表板层（扩展 app/）
  └── app/components/dashboard/  # 仪表板专用组件
shared/                 # 共享代码（客户端 + 服务器）
  ├── schemas/          # Zod 验证模式
  └── types/            # 共享 TypeScript 类型
server/                 # Nitro 服务器（Cloudflare Workers）
  ├── api/              # API 端点（方法后缀：create.post.ts）
  └── utils/            # 服务器工具（自动导入）
tests/                  # Vitest 测试（Cloudflare Workers 池）
```

## 命令

使用 **pnpm** (v10+) 和 **Node.js 22+**。

```bash
# 开发
pnpm dev                  # 启动开发服务器（端口 7465）
pnpm build                # 生产构建
pnpm preview              # 通过 wrangler 预览 Worker
pnpm lint:fix             # ESLint 自动修复（提交前必须运行）
pnpm types:check          # TypeScript 类型检查

# 测试（Vitest + @cloudflare/vitest-pool-workers）
pnpm vitest               # 监视模式
pnpm vitest run           # CI 模式（运行一次）
pnpm vitest tests/api/link.spec.ts       # 单个测试文件
pnpm vitest -t "creates new link"        # 匹配测试名称模式

# 部署
pnpm deploy:pages         # 部署到 Cloudflare Pages
pnpm deploy:worker        # 部署到 Cloudflare Workers
```

## 代码风格

使用 `@antfu/eslint-config` 与 `eslint-plugin-better-tailwindcss`。提交前运行 `pnpm lint:fix`。

**格式化**：2 空格缩进 | 单引号 | 无分号 | 尾随逗号

### TypeScript

- 随处使用 TypeScript；对象首选 `interface`，联合类型/别名首选 `type`
- 避免使用 `any`；使用适当的类型或 `unknown`
- 在 `shared/schemas/` 中使用 Zod 进行运行时验证
- 使用 `export type` 导出仅类型的导出

```typescript
// shared/schemas/link.ts - 共享验证
export const LinkSchema = z.object({
  id: z.string().trim().max(26),
  url: z.string().trim().url().max(2048),
  slug: z.string().trim().max(2048).regex(slugRegex),
})
export type Link = z.infer<typeof LinkSchema>
```

### Vue 组件

始终使用 `<script setup lang="ts">`。文件命名：PascalCase（如 `LinkEditor.vue`）。

```vue
<script setup lang="ts">
import type { Link } from '@/types'
import { Copy } from 'lucide-vue-next'

const props = defineProps<{ link: Link }>()
const emit = defineEmits<{ update: [link: Link] }>()
</script>

<template>
  <div>{{ props.link.slug }}</div>
</template>
```

### 导入

- **优先使用 Nuxt 自动导入**：`ref`、`computed`、`useFetch`、`useState`、`useRuntimeConfig` 等
- **显式导入**：外部库、类型（`import type { Link } from '@/types'`）、图标（`import { Copy } from 'lucide-vue-next'`）
- **服务器工具自动导入**：`server/utils/` 中的函数在服务器代码中全局可用

### 命名约定

| 项目           | 约定             | 示例                |
| -------------- | ---------------- | ------------------- |
| 组件           | PascalCase       | `LinkEditor.vue`    |
| 组合式函数     | `use` 前缀       | `useAuthToken()`    |
| API 路由       | 方法后缀         | `create.post.ts`    |
| 目录           | kebab-case       | `dashboard/links/`  |
| 函数/变量      | camelCase        | `getLink`           |
| 常量           | UPPER_SNAKE_CASE | `TOKEN_KEY`         |

### 错误处理

```typescript
// 服务器 API - 使用 createError 处理 HTTP 错误
export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)
  if (existingLink) {
    throw createError({ status: 409, statusText: '链接已存在' })
  }
})
```

## Cloudflare 绑定

通过解构 `event.context` 访问：

```typescript
const { cloudflare } = event.context
const { KV, ANALYTICS, AI, R2 } = cloudflare.env
```

| 绑定         | 类型             | 用途                        |
| ------------ | ---------------- | --------------------------- |
| `KV`         | Workers KV       | 链接存储（`link:{slug}`）   |
| `ANALYTICS`  | Analytics Engine | 点击跟踪和分析              |
| `AI`         | Workers AI       | AI 驱动的 slug 生成         |
| `R2`         | R2 Bucket        | 图片上传和备份              |

## 测试模式

测试使用 `@cloudflare/vitest-pool-workers` 和真实的 Cloudflare 绑定（单个 worker，共享存储）。

```typescript
import { generateMock } from '@anatine/zod-mock'
import { describe, expect, it } from 'vitest'
import { fetchWithAuth, postJson } from '../utils'

describe.sequential('/api/link/create', () => {
  it('使用有效数据创建新链接', async () => {
    const response = await postJson('/api/link/create', { url: 'https://example.com', slug: 'test' })
    expect(response.status).toBe(201)
  })
})
```

**测试工具**（`tests/utils.ts`）：

- `fetchWithAuth(path, options)` - 带认证头的 GET 请求
- `postJson(path, body, withAuth?)` - 带可选认证的 POST JSON 请求
- `putJson(path, body, withAuth?)` - 带可选认证的 PUT JSON 请求
- `fetch(path, options)` - 不带认证的原始 fetch 请求

对于共享状态的测试（大多数 API 测试），使用 `describe.sequential`。

## UI 组件

- 使用 `app/components/ui/` 中的 shadcn-vue - **请勿编辑**（自动生成）
- 使用 `ResponsiveModal` 进行移动优化的对话框
- 使用 Tailwind CSS v4 进行样式设计
- `aria-label` 使用静态英文（不使用 `$t()` 翻译）
- 图标来自 `lucide-vue-next`

## 提交

遵循 Conventional Commits：`feat:`、`fix:`、`docs:`、`chore:`、`refactor:`

## 提交前

`simple-git-hooks` 在提交时运行 `lint-staged`，自动对暂存文件运行 `eslint --fix`。

## API 路由模式

API 路由使用方法后缀约定：

- `create.post.ts` → `POST /api/link/create`
- `query.get.ts` → `GET /api/link/query`
- `edit.put.ts` → `PUT /api/link/edit`

`server/utils/` 中的服务器工具会自动导入：

- `getLink(event, slug)` - 从 KV 获取链接
- `putLink(event, link)` - 将链接存储到 KV
- `deleteLink(event, slug)` - 从 KV 删除链接
- `normalizeSlug(event, slug)` - 大小写标准化
- `buildShortLink(event, slug)` - 构建完整 URL
