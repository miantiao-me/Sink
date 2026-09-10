---
title: Link Backups
description: Save link snapshots to R2, what they contain, scheduling, and restore limits.
---

# Link Backups

A Sink backup is a **JSON snapshot of your links** stored in **R2** (Cloudflare file storage). It is not a full database dump.

## Requirements

1. Bind **R2**
2. Finish one-time storage setup: open **Dashboard → Links** after deploy. Until then, backup fails with “storage not ready” (HTTP 423). See [storage setup](/storage/kv-to-d1)
3. Create a snapshot from the dashboard or `POST /api/backup`

Automatic daily backups need Workers cron (this repo: **00:00 UTC**). Turn off with `NUXT_DISABLE_AUTO_BACKUP=true`. Pages supports **manual** snapshots only.

File names:

- Automatic: `backups/links-<timestamp>.json`
- Manual: `backups/manual-links-<timestamp>.json`

## What is inside

All link records in D1, including expired ones and password material. Treat every snapshot as **secret**.

::: warning Snapshots are sensitive
Limit who can read the R2 bucket. Snapshots may include password material and full destination URLs.
:::

Not included: database schema, delete markers, migration history, analytics data.

## Restore limits

Sink does not auto-delete old snapshots or offer one-click full restore. You can [import](./import-export) records from a snapshot (with normal import rules). For database-level recovery, see Cloudflare D1 [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).
