---
title: Storage setup and KV migration
description: One-time storage setup for every install, and how to move links from older KV-only Sink instances into D1.
---

# Storage setup and KV migration

::: warning Who needs this page?

- **New installs:** after the first deploy, open **Dashboard → Links** once. Sink finishes a quick empty check and marks storage ready. You do not need to export anything.
- **Old installs (links only in KV):** follow the full steps below. Older Sink versions stored links in KV; this copies them into the D1 database.
  :::

## Why open Links once?

Sink needs a one-time “storage ready” flag before normal link management works.

::: danger Before storage is ready
Creating or editing links via the API fails with **“storage not ready” (HTTP 423)**. Backups also refuse to run. Opening **Dashboard → Links** starts or continues the setup automatically.
:::

After that, normal link management works.

## Old installs only — before you migrate

- Keep the original KV data in Cloudflare
- Bind that same KV as `KV` and D1 as `DB` on the upgraded deploy
- Avoid editing links until migration finishes
- Optionally export KV first with the Cloudflare dashboard or [Wrangler](https://developers.cloudflare.com/kv/api/read-key-value-pairs/) (Cloudflare’s CLI)

## Old installs only — migrate links

1. Keep or export the original KV data
2. [Upgrade Sink](/deployment/upgrading) and deploy the new `master` branch
3. Sign in and open **Dashboard → Links** — migration starts or continues here
4. Open **Dashboard → Migrate → D1** to watch progress
5. When done, test several short links before normal editing

The D1 panel shows status and recovery tools. It is not the main start button — open **Links** to start or continue.

## What happens to each record

During migration, Sink:

- skips expired links
- does not overwrite links already in D1
- does not restore links that were already deleted
- keeps successfully migrated links if another record fails

## If something fails

You can retry safely. Fix or remove the bad record in the original KV data, then open **Dashboard → Links** again. Existing D1 links are not overwritten.

Use **Dashboard → Migrate → D1** for results. Force rescan is only for controlled recovery after a normal run; it still does not overwrite existing or deleted D1 links.
