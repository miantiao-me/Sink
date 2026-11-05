---
title: Upgrading Sink
description: Upgrade Sink by syncing your GitHub fork and redeploying.
---

# Upgrading Sink

## Before you upgrade

1. Skim the upstream release notes
2. Do not delete your Cloudflare bindings, secrets, or env vars
3. If R2 is set up, consider a manual [backup](/features/backups)

## Normal upgrade (current D1 installs)

1. On GitHub, open your fork → click **Sync fork** to pull the latest `master`. If you changed files yourself, resolve conflicts first
2. In Cloudflare (Workers Builds or Pages), redeploy the updated `master` branch
3. Wait for the deploy to finish (database updates run as part of deploy)

## Optional: the dashboard can have its own hostname

Nothing changes unless you ask for it. The dashboard stays at `/dashboard/links` and `dashboard` stays a reserved slug.

Set [`NUXT_PUBLIC_DASHBOARD_URL`](/configuration/#giving-the-dashboard-its-own-subdomain) and add that hostname to the same Worker or Pages project, and the dashboard moves to the root of that host (`dash.example.com/links`), `/dashboard` is freed for use as a short-link slug, and only that host answers `/api/**` — so repoint API clients and MCP integrations at it. Old `/dashboard/...` bookmarks stop working. The homepage **Dashboard** button always points at the right place.

## Upgrading a very old install (links only in KV)

If your instance stored links only in KV (older Sink versions), keep that KV data and follow [storage setup / migration](/storage/kv-to-d1).

## After upgrade — quick check

- Sign in to the dashboard
- Open **Dashboard → Links** once (finishes storage setup if needed)
- Create, open, edit, and delete a test link
- Check analytics if you use it
