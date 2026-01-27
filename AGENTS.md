# Repository Guidelines

This document provides guidelines for agentic coding agents operating in the Sink codebase.

## Project Overview

Sink is a simple, speedy, and secure link shortener with analytics, running 100% on Cloudflare. It uses Nuxt 4 as the frontend framework and Cloudflare Workers for serverless backend.

**All documentation and comments within this project must be written in English.**

## Project Structure

```
app/                    # Nuxt 4 application (pages, layouts, components, composables)
  ├── components/       # Vue components (PascalCase)
  │   ├── ui/           # shadcn-vue base components (auto-generated, do not edit)
  │   ├── dashboard/    # Dashboard-specific components
  │   └── home/         # Landing page components
  ├── composables/      # Vue composables (camelCase)
  ├── layouts/          # Nuxt layouts
  ├── pages/            # File-based routing
  ├── stores/           # Pinia stores
  ├── types/            # TypeScript type definitions
  ├── utils/            # Utility functions
  ├── lib/              # Shared library helpers
  └── assets/           # CSS, images
server/                 # Nitro server (Cloudflare Workers)
  ├── api/              # API endpoints
  ├── middleware/       # Server middleware
  └── utils/            # Server utilities
schemas/                # Zod schemas for validation
tests/                  # Vitest tests
scripts/                # Build scripts
docs/                   # Documentation
public/                 # Static assets
i18n/                   # Internationalization files
```

## Build, Test, and Development Commands

Use **pnpm** (v10+) with **Node.js 20.11+**.

### Development

```bash
pnpm dev                  # Start Nuxt dev server on port 7465
pnpm preview              # Full Worker preview via wrangler dev
```

### Building

```bash
pnpm build                # Production build (nuxt build + map generator)
pnpm build:map            # Generate country map data
pnpm build:colo           # Generate Cloudflare colo data
```

### Linting

```bash
pnpm lint:fix             # Run ESLint with auto-fix
pnpm types:check          # TypeScript type checking
```

### Deployment

```bash
pnpm deploy:pages         # Deploy to Cloudflare Pages
pnpm deploy:worker        # Deploy to Cloudflare Workers
```

## Code Style Guidelines

This project uses `@antfu/eslint-config` with additional Tailwind CSS linting.

### General Rules

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: No semicolons
- **Trailing commas**: Always use trailing commas
- **Line length**: No strict limit, but keep readable

### TypeScript

- Use TypeScript for all code
- Prefer `interface` for object types, `type` for unions/intersections
- Avoid `any`; use proper typing or `unknown` when necessary
- Use Zod schemas for runtime validation (see `schemas/`)

```typescript
// Good
interface Link {
  id: string
  url: string
  slug: string
}

// Zod schema example
export const LinkSchema = z.object({
  id: z.string().trim().max(26),
  url: z.string().trim().url().max(2048),
  slug: z.string().trim().max(2048).regex(new RegExp(slugRegex)),
})
```

### Vue Components

- Use `<script setup lang="ts">` for all components
- Component files use PascalCase: `LinkEditor.vue`
- Props defined with `defineProps<{ ... }>()`
- Emits defined with `defineEmits<{ ... }>()`

```vue
<script setup lang="ts">
import type { Link } from '@/types'

const props = defineProps<{
  link: Link
}>()

const emit = defineEmits<{
  update: [link: Link]
}>()
</script>

<template>
  <!-- Template here -->
  <div>{{ props.link.slug }}</div>
</template>
```

### Imports

- **Prefer Nuxt auto-imports** for Vue utilities, composables, and components
- Auto-imported: `ref`, `computed`, `watch`, `useRoute`, `useFetch`, `defineStore`, etc.
- Explicit imports for:
  - External libraries: `import { z } from 'zod'`
  - Types: `import type { Link } from '@/types'`
  - Icons: `import { Copy, Link } from 'lucide-vue-next'`
  - Path aliases: `@/` (app), `@@/` (root)

### Naming Conventions

| Item                | Convention                    | Example                  |
| ------------------- | ----------------------------- | ------------------------ |
| Components          | PascalCase                    | `LinkEditor.vue`         |
| Composables         | camelCase with `use` prefix   | `useDashboardRoute()`    |
| Stores              | camelCase with `use...Store`  | `useDashboardLinksStore` |
| API routes          | kebab-case with method suffix | `create.post.ts`         |
| Directories         | kebab-case                    | `dashboard/links/`       |
| Functions/variables | camelCase                     | `getLink`, `shortLink`   |
| Constants           | UPPER_SNAKE_CASE              | `DASHBOARD_ROUTES`       |

### Error Handling

- Use `createError()` for API errors with proper status codes
- Validate inputs with Zod schemas and `readValidatedBody()`

```typescript
// Server API example
export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)

  if (existingLink) {
    throw createError({
      status: 409,
      statusText: 'Link already exists',
    })
  }
})
```

### UI Components

- Use shadcn-vue components from `app/components/ui/`
- **Do not edit** files in `components/ui/` directly (auto-generated)
- Add custom components to appropriate subdirectories
- Use Tailwind CSS v4 for styling

## Cloudflare Bindings

Defined in `wrangler.jsonc`:

- `KV`: Workers KV for link storage
- `ANALYTICS`: Analytics Engine for tracking
- `AI`: Workers AI for slug generation
- `ASSETS`: Static assets binding

Access in server code via `event.context.cloudflare.env`:

```typescript
const { KV, ANALYTICS, AI } = event.context.cloudflare.env
```

## Environment Variables

Key variables (set in `.env`):

- `NUXT_SITE_TOKEN`: Authentication token
- `NUXT_REDIRECT_STATUS_CODE`: HTTP redirect code (default: 301)
- `NUXT_LINK_CACHE_TTL`: Cache TTL in seconds
- `NUXT_AI_MODEL`: AI model for slug generation

See `docs/configuration.md` for full list.

## Commit Guidelines

Follow Conventional Commits:

```
feat: add link expiration feature
fix: correct analytics date filter
docs: update API documentation
chore(deps): bump dependencies
refactor: simplify link store logic
```

## Pre-commit Hooks

- `simple-git-hooks` runs `lint-staged` on commit
- `lint-staged` runs `eslint --fix` on staged `.js`, `.ts`, `.tsx`, `.vue` files
- Always run `pnpm lint:fix` before committing
