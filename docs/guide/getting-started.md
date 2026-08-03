---
title: Getting Started
description: Prepare Cloudflare resources, deploy Sink, and create your first short link.
---

# Getting Started

Sink is a self-hosted short-link app with visit analytics. It runs on Cloudflare (no VPS required).

## 1. Fork Sink

Create a [fork of the Sink repository](https://github.com/miantiao-me/Sink/fork) in your GitHub account.

## 2. Choose where to deploy

- [Cloudflare Workers](/deployment/workers) — recommended
- [Cloudflare Pages](/deployment/pages) — deprecated

Both use Git: Cloudflare builds from your fork and publishes the app.

## 3. Create Cloudflare resources

In the [Cloudflare dashboard](https://dash.cloudflare.com/), create the services Sink will use. Later you will **bind** them to the project — binding means “connect this database/storage to Sink under a fixed name”.

| Binding name | Cloudflare product       | Required?   | What it is                          |
| ------------ | ------------------------ | ----------- | ----------------------------------- |
| `DB`         | **D1** (database)        | Yes         | Stores your links                   |
| `KV`         | **KV** (key-value store) | Yes         | Speeds up redirects                 |
| `ANALYTICS`  | **Analytics Engine**     | Recommended | Visit stats and logs                |
| `R2`         | **R2** (object storage)  | Optional    | Backups and social preview images   |
| `AI`         | **Workers AI**           | Optional    | AI-suggested short codes and titles |

For the full experience, create all five. You can add analytics later — see [Analytics and Realtime](/features/analytics).

After creating D1 and KV, open each resource’s detail page and copy its **ID** (you will paste it into deploy settings).

## 4. Configure and deploy

Follow the Workers or Pages guide to connect the fork, add bindings, and set variables.

::: warning Set `NUXT_SITE_TOKEN` yourself
This is your **dashboard login password** and the password used by API tools. Use a long random string (at least 8 characters) and keep it stable — changing it signs everyone out.

If you skip it, Sink may invent a random password at build time that can change on the next deploy, and you will not be able to log in reliably.
:::

Other settings: [configuration reference](/configuration/).

## 5. First login and first link

1. Open `https://your-domain/dashboard`
2. Sign in with the `NUXT_SITE_TOKEN` you set
3. Open **Dashboard → Links** once

::: tip Why open Links once?
The first open finishes a one-time storage setup. Until then, creating links or backups may fail with “storage not ready” (HTTP 423). New installs only need a quick empty check; older KV-only installs migrate data here — see [storage setup / migration](/storage/kv-to-d1).
:::

4. Create your first short link

The dashboard supports multiple languages. Docs are available in English and Simplified Chinese.
