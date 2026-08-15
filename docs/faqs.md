---
title: Troubleshooting
description: Fix common deploy, login, analytics, redirect, import, backup, and feature problems.
---

# Troubleshooting

## I cannot create or open short links

1. Confirm D1 and KV are bound with the exact names `DB` and `KV`
2. Redeploy the latest `master` branch
3. Open **Dashboard → Links** once (one-time storage setup)

If you see **“storage not ready” (HTTP 423)**, step 3 is missing. New installs only need that one open. Very old KV-only installs need [storage migration](/storage/kv-to-d1).

<details>
  <summary><b>KV binding screenshot</b></summary>
  <img alt="KV binding settings in Cloudflare" src="./images/faqs-kv.png">
</details>

## I cannot sign in or call the API

The password must match `NUXT_SITE_TOKEN` exactly (no extra spaces). Use at least 8 characters. If you never set the token, a random build-time password may have been used — set an explicit secret and redeploy.

If you use Cloudflare Access:

- Both `NUXT_CF_ACCESS_TEAM_DOMAIN` and `NUXT_CF_ACCESS_AUD` are set
- The AUD value is from this Access application
- The Access cookie can reach `/api` (do not limit Cookie Path to `/dashboard` only)

## Analytics is empty

Check all of these:

1. Analytics Engine is bound as `ANALYTICS`
2. Dataset name matches (`sink` by default, or the same as `NUXT_DATASET`)
3. `NUXT_CF_ACCOUNT_ID` is the account that hosts this app
4. `NUXT_CF_API_TOKEN` is a Custom Token with **Account → Account Analytics → Read**
5. Bot filtering or dashboard filters are not hiding the traffic

Full steps: [Analytics](/features/analytics).

<details>
  <summary><b>Analytics Engine binding screenshot</b></summary>
  <img alt="Analytics Engine binding settings in Cloudflare" src="./images/faqs-Analytics_engine.png">
</details>

## Realtime events arrive in bursts or feel delayed

Expected. The page refreshes about every 10 seconds and plays events at about one per second. It is not a live WebSocket stream. Also check that the view is not paused and the tab is visible.

## Custom short codes lose uppercase letters

Set `NUXT_CASE_SENSITIVE=true` and redeploy. This only affects **custom** codes; auto-generated codes stay lowercase. Existing codes are not renamed.

## Cloaked page is blank or refuses to load

The target site likely blocks embedding. Turn off cloaking, or change the target site if you control it. OAuth and payment pages usually refuse embedding.

## Safe browsing did not change the unsafe flag

Auto-check runs only when create/edit leaves `unsafe` unset. An explicit `true` or `false` always wins. If the DNS check fails, Sink allows the link.

## Import skips or rejects records

- Active short-code conflicts are skipped
- Invalid records fail validation
- Expired records are allowed on purpose

Keep each request within half the export page size. Use protected passwords from export — not the masked placeholders in the dashboard UI.

## Backup was not created

1. Confirm `R2` is bound
2. Open **Dashboard → Links** once if storage is not ready yet (backup returns 423 until then)
3. Workers scheduled backups: check `NUXT_DISABLE_AUTO_BACKUP` and Cron
4. Pages: use manual backup only in this repo

## Redirect still looks old

Browser, CDN, or KV cache can delay what you see. Check `NUXT_LINK_CACHE_TTL` and `NUXT_REDIRECT_NO_STORE` in [configuration](/configuration/#advanced-defaults), then confirm the link in the dashboard.

Unknown short codes (`NUXT_NOT_FOUND_REDIRECT`) always use **302**, even when normal redirects use `301`.
