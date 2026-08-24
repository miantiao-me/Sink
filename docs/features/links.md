---
title: Link Features
description: Custom short codes, routing, expiration, passwords, safety checks, social previews, cloaking, tags, health checks, and redirects.
---

# Link Features

Create links in the dashboard or via the API. A link needs a destination URL; everything else is optional.

## Short codes (slugs) and tags

Leave the short code empty to generate a random lowercase one. Case-sensitive mode only affects **custom** codes: `Docs` and `docs` can be different. Auto-generated codes stay lowercase.

Tags are lowercased. Up to 10 tags per link, 1–32 characters each.

## Expiration and preview mode

If you set an expiration, it must be in the future. Expired links stop working. Import allows already-expired records on purpose (to keep history).

::: warning Preview mode
Instance-wide demo switch. New links last five minutes and cannot be edited or deleted. Use only on throwaway public demos.
:::

## Passwords and unsafe warnings

Password-protected links show a form in the browser. API clients can send the password in the `x-link-password` header.

Passwords set in the dashboard/API are stored protected. Exception: very old links migrated from KV may keep legacy password values until you edit them.

The `unsafe` flag controls the warning page:

- Set it yourself to force the warning on or off
- If safe browsing is configured and you leave `unsafe` unset, Sink checks the domain over secure DNS
- A blocked answer marks the link unsafe

::: tip Safe browsing fails open
If the DNS check fails, Sink allows the link instead of blocking it.
:::

Visitors must confirm unsafe links without a password via `POST` with `confirm=true`. For password + unsafe, send both `x-link-password` and `x-link-confirm: true`.

## Smart routing

- **Query params:** optionally append the visitor’s `?…` to the target URL
- **By country:** map country codes (for example `US`, `JP`) to different URLs
- **By device:** Apple / Android targets win over default or country targets

## Social previews (OpenGraph), bots, and cloaking

Custom title, description, and image control how the link looks when shared on social apps. With R2 configured you can upload images (JPEG/PNG/WebP/GIF, max 5 MB).

When a social bot visits a link that has preview fields, Sink returns a preview page instead of redirecting.

::: warning Cloaking is not privacy
Cloaking shows the target site inside the page while the address bar still shows the short link. Browsers and developer tools still see the real URL. Sites that block embedding (and most OAuth/payment pages) will not load.
:::

## Health check

**Dashboard → Check** (and `/api/link/check`) probes target URLs from the server (up to 10 at a time, 1–30s timeout). Private/local addresses are blocked.

## Site-wide redirect options

You can change the default redirect code (default `301`), ask browsers not to cache redirects, redirect the homepage (`NUXT_HOME_URL`), and redirect unknown short codes (`NUXT_NOT_FOUND_REDIRECT`, always **302**). See [configuration](/configuration/#advanced-defaults).
