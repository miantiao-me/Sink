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

## Upgrading a very old install (links only in KV)

If your instance stored links only in KV (older Sink versions), keep that KV data and follow [storage setup / migration](/storage/kv-to-d1).

## After upgrade — quick check

- Sign in to the dashboard
- Open **Dashboard → Links** once (finishes storage setup if needed)
- Create, open, edit, and delete a test link
- Check analytics if you use it
