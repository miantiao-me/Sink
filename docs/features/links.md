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

Passwords set in the dashboard/API are stored as PBKDF2 hashes. Exception: very old links migrated from KV may keep legacy password values until you edit them.

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
- **By device:** Apple iOS mobile devices (iPhone, iPad, iPod) and Android targets win over default or country targets (macOS is not included)

## Social previews (OpenGraph), bots, and cloaking

Custom title, description, and image control how the link looks when shared on social apps. With R2 configured you can upload images (JPEG/PNG/WebP/GIF, max 5 MB).

When a social bot visits a link that has preview fields, Sink returns a preview page instead of redirecting.

::: warning Cloaking is not privacy
Cloaking shows the target site inside the page while the address bar still shows the short link. Browsers and developer tools still see the real URL. Sites that block embedding (and most OAuth/payment pages) will not load.
:::

## Reverse proxy mode

When reverse proxy mode is enabled on a link, visiting `/:slug` makes the Cloudflare Worker fetch the destination URL and stream the response directly to the client without issuing HTTP 301/302 redirects.

Sink intentionally uses a simple, single-request proxy model: it does not act as a full website proxy, does not assign separate domains or subdomains, and only forwards the single request made to the short code itself.

### Suitable use cases

- **API endpoints:** Forward API requests or webhooks with `Authorization` and custom headers passed through, returning responses directly to the caller.
- **Shell install scripts:** Support one-line commands such as `curl -fsSL https://sink.example/install | bash`.
- **Raw text and configurations:** Serve raw snippets, JSON payloads, or remote subscription configurations.
- **Single file downloads:** Provide direct file downloads without bouncing visitors through external storage links.

### Unsuitable use cases and limitations

Reverse proxy mode is **not intended for standard multi-asset web pages**.

Because proxying applies only to the single request to `/:slug`, Sink:

- **Does not rewrite asset paths** inside HTML or CSS.
- **Does not route subpaths** (requests to `/:slug/subpath` are not forwarded to the destination).
- **Does not proxy runtime requests** such as dynamic `import()`, `fetch()`, or WebSockets.

For example, if the destination page references `<script src="/assets/app.js">` or `<link rel="stylesheet" href="./style.css">`, the browser will request those files from your Sink domain (`https://sink.example/assets/app.js`), resulting in 404 errors, broken styles, and script failures. Only self-contained pages whose assets use absolute external URLs (such as CDN links) can render properly.

### How to enable

Reverse proxy mode is **off by default**.

1. **Set the environment variable:** Add `NUXT_PUBLIC_LINK_PROXY_ENABLED=true` to your deployment environment.
2. **Rebuild and deploy:** Because this is a `NUXT_PUBLIC_*` configuration, changing it requires rebuilding and redeploying the application for the client to register the change.

This flag only controls resolution: when disabled, links configured with proxy mode simply fall back to standard HTTP redirects when visited.

### Security notes and protections

::: warning Same-origin security risk
Proxied responses are served under your Sink domain and execute in the **same origin without a CSP sandbox**.

Any active upstream content (HTML, JavaScript, SVG) runs in the same origin as your Sink dashboard and can access cookies and `localStorage` (including dashboard site tokens). **Never proxy untrusted or unknown destinations.**
:::

Sink enforces the following built-in protections:

- **Private target blocking:** Only public `http(s)` targets are allowed. Requests to `localhost`, IPv4 private/reserved ranges, and IPv6 `::`, `::1`, ULA, link-local, multicast, or `::ffff:` mapped addresses are blocked. Literal-IP checks cannot defend against DNS rebinding on hostname targets. Upstream redirects are followed automatically by the runtime, and only the initial target is validated.
- **Request header filtering:** Client `cookie`, `host`, hop-by-hop headers, `content-length`, `cf-*`, `x-forwarded-*`, `x-real-ip`, and `x-link-*` headers are stripped; `authorization` and other custom headers are forwarded. Sink automatically populates `x-forwarded-for`, `x-forwarded-proto`, and `x-forwarded-host`.
- **Response header filtering:** Upstream hop-by-hop headers and `set-cookie` headers are stripped. Responses always include `X-Content-Type-Options: nosniff`.
- **Protected link isolation:** When a visitor confirms a password or unsafe warning form, the upstream request is made within the same request as a bodyless GET, ensuring submitted passwords are never sent upstream. API clients can stream request bodies (JSON or binary) directly by passing `x-link-password` and `x-link-confirm: true` headers. Responses for password-protected or unsafe links are always marked `Cache-Control: private, no-store`.

## Health check

**Dashboard → Check** (and `/api/link/check`) probes target URLs from the server (up to 10 at a time, 1–30s timeout). Private/local addresses are blocked.

## Site-wide redirect options

You can change the default redirect code (default `301`), ask browsers not to cache redirects, redirect the homepage (`NUXT_PUBLIC_HOME_URL`), and redirect unknown short codes (`NUXT_NOT_FOUND_REDIRECT`, always **302**). See [configuration](/configuration/#advanced-defaults).
