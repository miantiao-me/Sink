---
title: Deploy on Cloudflare Pages
description: Deploy Sink on Cloudflare Pages through Git integration and dashboard-managed bindings.
---

# Deploy on Cloudflare Pages

## 1. Create the Pages project

Create a [fork of the Sink repository](https://github.com/miantiao-me/Sink/fork). In the Cloudflare dashboard, create a **Pages** project, import the fork, and set:

- **Production branch:** `master`
- **Framework preset:** Nuxt
- **Build command:** `pnpm build`
- **Build output directory:** `dist`

Create the project so settings become available.

::: tip Cancel the first auto-deploy if needed
If a deploy starts before you finish bindings and variables, open the deployment list, click **Cancel**, finish setup, then deploy again.
:::

## 2. Create resources and bind them

Create the Cloudflare resources you need, then open the Pages project → **Settings → Bindings** and add them. Binding = connect a resource to Sink under a fixed name.

| Binding name | Product          | Required?   | What it is                |
| ------------ | ---------------- | ----------- | ------------------------- |
| `DB`         | D1               | Yes         | Stores links              |
| `KV`         | KV               | Yes         | Speeds up redirects       |
| `ANALYTICS`  | Analytics Engine | Recommended | Visit stats               |
| `R2`         | R2               | Optional    | Backups and social images |
| `AI`         | Workers AI       | Optional    | AI suggestions            |

Analytics is optional. Setup: [Analytics and Realtime](/features/analytics).

::: warning Required compatibility flag
Under **Settings → Functions → Compatibility Flags**, add `nodejs_compat` for both **Production** and **Preview**. Sink needs this flag to run on Pages.
:::

## 3. Variables and secrets

Under **Settings → Variables and Secrets**, add the build deployment configuration below. The two IDs are required for D1 migration and deployment configuration generation.

| Build variable                   | Required? | What to put                                                                    |
| -------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `DEPLOY_D1_DATABASE_ID`          | Yes       | D1 database ID (from the D1 detail page)                                       |
| `DEPLOY_KV_NAMESPACE_ID`         | Yes       | KV namespace ID (from the KV detail page)                                      |
| `DEPLOY_KV_PREVIEW_NAMESPACE_ID` | No        | Preview KV namespace ID; defaults to `DEPLOY_KV_NAMESPACE_ID`                  |
| `DEPLOY_D1_DATABASE_NAME`        | No        | D1 database name; defaults to `sink`                                            |
| `DEPLOY_ANALYTICS_DATASET`       | No        | Analytics Engine dataset; defaults to `sink` (keep aligned with `NUXT_DATASET`) |

Also configure Pages Build / Wrangler authentication for the Production environment. Pages does not provide these variables automatically:

| Authentication variable   | Type             | What to put                                                                                                                                                                                                 |
| ------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`    | Encrypted secret | Token used by the `postbuild` remote D1 migration. Git builds need at least **Account → D1 → Edit**. If the same token runs `pnpm deploy:pages` externally, also grant **Account → Cloudflare Pages → Edit** |
| `CLOUDFLARE_ACCOUNT_ID`   | Variable         | Cloudflare account ID. Wrangler defines it as optional, but this project does not set `account_id`, so configure it for stable non-interactive builds                                                       |

`CLOUDFLARE_ACCOUNT_ID` may have the same value as `NUXT_CF_ACCOUNT_ID`, but both variable names must be set separately. Preview builds skip the migration, so these authentication variables are not needed in the Preview environment.

Add runtime configuration separately in the same dashboard section:

| Runtime variable           | Type             | What to put                                                           |
| -------------------------- | ---------------- | --------------------------------------------------------------------- |
| `NUXT_SITE_TOKEN`          | Encrypted secret | Dashboard login password and API password (strong, stable, ≥ 8 chars) |
| `NUXT_CF_ACCOUNT_ID`       | Variable         | Cloudflare account ID (for analytics)                                 |
| `NUXT_CF_API_TOKEN`        | Encrypted secret | Custom Token with **Account → Account Analytics → Read** only         |

How to create the analytics token: Cloudflare dashboard → profile icon → **My Profile** → **API Tokens** → **Create Token** → **Custom Token** → permission **Account → Account Analytics → Read**.

Pages exposes this dashboard variable set to both build and runtime, but each group has a distinct role: `DEPLOY_*` values generate deployment configuration, `CLOUDFLARE_*` values authenticate Wrangler, and `NUXT_*` values configure the running application. For Pages, add R2 only under **Bindings**; do not add R2 `DEPLOY_*` variables. More options: [configuration](/configuration/).

The repository's `postbuild` script runs the remote D1 migration only when Pages builds the `master` branch (`CF_PAGES=1` and `CF_PAGES_BRANCH=master`). Therefore, a successful main-branch Pages build updates the D1 schema automatically; preview-branch builds do not.

## 4. Deploy and first use

Start a deployment from `master` and wait until it finishes.

For a manual CLI deployment, build first. `pnpm deploy:pages` assumes `dist` already exists: it generates `wrangler.deploy.jsonc` from the `DEPLOY_*` values, applies remote D1 migrations, and then uploads `dist` with Wrangler. It does not run the application build.

1. Open `/dashboard` and sign in with `NUXT_SITE_TOKEN`
2. Open **Dashboard → Links** once (one-time storage setup)
3. Create a link

::: tip First open of Links
Until storage setup finishes, creating links may fail with “storage not ready” (HTTP 423).
:::

Manual [backups](/features/backups) work on Pages; automatic daily backups are configured for Workers only in this repo.
