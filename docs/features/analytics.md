---
title: Analytics and Realtime
description: Turn on visit analytics, read charts and logs, understand near-realtime view, exclude bots, and export CSV.
---

# Analytics and Realtime

Analytics is **optional**. Without it, short links, login, and link management still work — charts, logs, and realtime stay empty.

## Turn it on (three things)

You need all three:

1. **Analytics Engine binding** named `ANALYTICS`
   - **Workers:** usually created by deploy settings (dataset default `sink`)
   - **Pages:** **Settings → Bindings → Add → Analytics Engine**
   - Variable name: `ANALYTICS`
   - Dataset: `sink` by default. If you set `NUXT_DATASET`, use the same name here

2. **Account ID** — set `NUXT_CF_ACCOUNT_ID` to the Cloudflare account that hosts this app  
   (Dashboard sidebar → account name, or the URL after you log in)

3. **API token** — set `NUXT_CF_API_TOKEN` as an encrypted secret:
   - Cloudflare dashboard → profile icon → **My Profile** → **API Tokens** → **Create Token** → **Custom Token**
   - Permission: **Account → Account Analytics → Read** only
   - Prefer limiting the token to that same account

If any one is missing or mismatched, analytics stays empty.

## What you can see

Successful visits feed counters, charts, heatmaps, recent events, and locations. Filter by link, time, country, browser, OS, device, and referrer.

Numbers can be **approximate** (Cloudflare samples high traffic). Low traffic can look uneven for the same reason.

To hide detected bots from stats and [click webhooks](/configuration/webhooks), set `NUXT_DISABLE_BOT_ACCESS_LOG=true`.

## Near-realtime page

::: tip Not a live stream
This page does **not** use WebSocket. It refreshes about every 10 seconds and plays new events at about one per second. Pause or a hidden tab stops playback. Treat it as a live-looking overview, not a perfect event feed.
:::

## Export

Download filtered stats as CSV from the dashboard or the stats export API (slug, URL, viewers, views, referrers).

Link JSON export is separate — see [Import and Export](./import-export).
