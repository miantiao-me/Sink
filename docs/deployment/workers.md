---
title: Deploy on Cloudflare Workers
description: Deploy Sink on Cloudflare Workers through Git integration.
---

# Deploy on Cloudflare Workers

## 1. Fork Sink and create resources

Create a [fork of the Sink repository](https://github.com/miantiao-me/Sink/fork). In the [Cloudflare dashboard](https://dash.cloudflare.com/), create:

| Binding name | Product                  | Required?   | What it is                |
| ------------ | ------------------------ | ----------- | ------------------------- |
| `DB`         | D1 database              | Yes         | Stores links              |
| `KV`         | KV namespace             | Yes         | Speeds up redirects       |
| `ANALYTICS`  | Analytics Engine dataset | Recommended | Visit stats               |
| `R2`         | R2 bucket                | Optional    | Backups and social images |
| `AI`         | Workers AI               | Optional    | AI suggestions            |

Copy the **D1 database ID** and **KV namespace ID** from each resource’s detail page.

Analytics is optional — short links still work without it. Setup: [Analytics and Realtime](/features/analytics).

## 2. Connect Git (Workers Builds)

In the Cloudflare dashboard, create a Worker with **Git integration** and connect your fork:

- **Production branch:** `master`
- **Build command:** `pnpm build`
- **Deploy command:** `pnpm deploy:worker`

Add these **build variables** (do **not** put production IDs into tracked `wrangler.jsonc` — set `DEPLOY_*` instead):

| Variable                         | Value                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `DEPLOY_D1_DATABASE_ID`          | Your D1 database ID (from the D1 detail page)                                              |
| `DEPLOY_KV_NAMESPACE_ID`         | Your KV namespace ID (from the KV detail page) → `kv_namespaces[].id`                      |
| `DEPLOY_KV_PREVIEW_NAMESPACE_ID` | Optional Wrangler preview KV → `preview_id` (defaults to `DEPLOY_KV_NAMESPACE_ID`)         |
| `DEPLOY_R2_BUCKET_NAME`          | Your R2 bucket name (only if you use R2; omit to skip R2) → `bucket_name`                  |
| `DEPLOY_R2_PREVIEW_BUCKET_NAME`  | Optional Wrangler preview R2 → `preview_bucket_name` (defaults to `DEPLOY_R2_BUCKET_NAME`) |
| `DEPLOY_D1_DATABASE_NAME`        | Optional; default `sink`                                                                   |
| `DEPLOY_ANALYTICS_DATASET`       | Optional; default `sink` (keep in sync with `NUXT_DATASET` if you change it)               |

`pnpm deploy:worker` generates gitignored `wrangler.deploy.jsonc` from these values, updates the D1 schema, then deploys. When you connect the repo, Cloudflare creates a deploy token — no extra credential to paste.

## 3. App settings (login password and more)

Under **Settings → Variables and Secrets**, add:

| Variable             | Type             | Purpose                                                                           |
| -------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `NUXT_SITE_TOKEN`    | Encrypted secret | Dashboard login password and API password (at least 8 characters, keep it stable) |
| `NUXT_CF_ACCOUNT_ID` | Variable         | Recommended for analytics                                                         |
| `NUXT_CF_API_TOKEN`  | Encrypted secret | Recommended for analytics                                                         |

Analytics details: [Analytics and Realtime](/features/analytics). Full list: [configuration](/configuration/).

Confirm bindings use the exact names `DB`, `KV`, `ANALYTICS`, `R2`, and `AI`.

## 4. Deploy and first use

Start a build from `master` and wait until it finishes.

1. Open `/dashboard` and sign in with `NUXT_SITE_TOKEN`
2. Open **Dashboard → Links** once (one-time storage setup)
3. Create a link

::: tip First open of Links
Until storage setup finishes, creating links may fail with “storage not ready” (HTTP 423).
:::

Later upgrades: [Upgrading Sink](./upgrading).
