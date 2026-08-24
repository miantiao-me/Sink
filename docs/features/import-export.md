---
title: Import and Export
description: Move links between Sink instances with JSON pages, including expired records and protected passwords.
---

# Import and Export

Use the authenticated JSON import/export APIs to move links between compatible Sink instances. This is different from [storage migration](/storage/kv-to-d1) and [R2 backups](./backups).

## Export

Export downloads links from the database in pages (each response is one page; keep requesting with the returned cursor until `list_complete` is true). Page size is controlled by `NUXT_PUBLIC_KV_BATCH_LIMIT`.

Each record includes short code, URLs, times, routing, tags, social preview fields, flags, and a **protected** password form — not the plaintext password.

## Import

Each request accepts at most half the export page size. Sink checks the whole request format first, then reports success / skip / fail per item.

- Expired records are allowed
- Active short-code conflicts are skipped (not overwritten)
- Short codes follow the destination site’s case setting
- Protected passwords from a Sink export can be imported without knowing the plaintext
- Masked password placeholders from the dashboard UI are **not** valid passwords

::: tip Not a full restore
Import does not rebuild the whole database. It does not recreate delete markers, migration history, or the storage-ready flag.
:::
