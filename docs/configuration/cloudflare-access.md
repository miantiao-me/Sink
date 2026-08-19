---
title: Cloudflare Access
description: Optional Zero Trust login for the Sink dashboard, while keeping short links public and API clients working.
---

# Cloudflare Access

Cloudflare Access is **optional**. Use it when you want people to sign in to the dashboard with your company identity (Google, email OTP, SSO, and so on) instead of only sharing `NUXT_SITE_TOKEN`.

Short links stay public either way. Access only affects who can open the dashboard and call the API.

## What changes after you enable it

| Path                     | Without Access             | With recommended Access setup                                 |
| ------------------------ | -------------------------- | ------------------------------------------------------------- |
| Short links (`/abc`)     | Public                     | Still public                                                  |
| Dashboard (`/dashboard`) | Anyone with the site token | Must pass Cloudflare Access first, then use the dashboard     |
| API (`/api/**`)          | Site token (`Bearer …`)    | Site token **or** a valid Access login (browser cookie / JWT) |
| API docs (`/_docs`)      | Public on your host        | Still public unless you protect it separately in Access       |

Sink never trusts “there is a cookie”. It verifies the Access **JWT** — think of it as a short-lived electronic pass (signature, issuer, audience, and expiry are all checked).

## Recommended setup (most people)

Goal: protect the dashboard with Access, keep short links public, and still allow scripts/extensions to use the site token on `/api`.

### 1. Create an Access application

In Cloudflare Zero Trust, create a **self-hosted** Access application for your Sink hostname (for example `links.example.com`).

### 2. Choose which paths Access protects

In the Access application path rules:

| Path                      | Protect with Access? | Why                                                                                     |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `/dashboard` and children | **Yes**              | This is the admin UI                                                                    |
| `/api`                    | **No** (recommended) | Lets site-token clients (scripts, extensions) call the API without going through Access |
| Short-link paths          | **No**               | Visitors must open short links freely                                                   |
| `/_docs`                  | Optional             | Protect only if you do not want OpenAPI public                                          |

### 3. Leave Cookie Path unrestricted

In the Access application settings, keep **Cookie Path** disabled / empty so the signed Access cookie can reach `/api` when the browser calls the API from the dashboard.

If Cookie Path is limited to `/dashboard` only, the dashboard may load but API calls can fail with 401.

### 4. Set Sink environment variables

Both values are required. Access is enabled only when **both** are set:

```ini
NUXT_CF_ACCESS_TEAM_DOMAIN=https://your-team.cloudflareaccess.com
NUXT_CF_ACCESS_AUD=paste-application-aud-here
```

| Variable                     | Where to get it                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `NUXT_CF_ACCESS_TEAM_DOMAIN` | Your Zero Trust team domain. Use the full origin, no path: `https://<team>.cloudflareaccess.com` |
| `NUXT_CF_ACCESS_AUD`         | Access application → **Application Audience (AUD) Tag**                                          |

Redeploy after setting them.

### 5. Keep a strong site token

Even with Access, keep a strong `NUXT_SITE_TOKEN`:

- API clients and integrations still use it
- It is a backup admin credential
- Any hostname that reaches this Worker/Pages app can still accept the site token unless Access blocks that path at the edge

## How people and tools sign in

```txt
Browser → Access login page → dashboard
         ↘ Access cookie/JWT → Sink verifies it → /api works

Script/extension → Authorization: Bearer <NUXT_SITE_TOKEN> → /api works
```

- **People (browser):** pass Access, then use the dashboard as usual. Logout goes through Cloudflare (`/cdn-cgi/access/logout`).
- **Tools (API):** send `Authorization: Bearer YOUR_SITE_TOKEN`. Prefer this for automation.
- **Access service tokens:** if allowed by your Access policy, Sink treats them as full admin (`root`). Only allow trusted service tokens.

## Stricter option: protect `/api` too

You can put **both** `/dashboard` and `/api` behind Access.

Then Cloudflare blocks unauthenticated requests **before** they reach Sink. Site-token-only clients cannot call that hostname unless they also satisfy Access.

If you need both:

- human dashboard behind Access, and
- simple Bearer-token automation without Access,

use the recommended setup above, or put automation on a separate hostname that is not Access-protected.

## Important limits

::: warning Protect every hostname
If `app.example.com` is behind Access but `old.example.com` points at the same Sink deployment without Access, the old host is still only as safe as `NUXT_SITE_TOKEN`. Protect every hostname that reaches the app.
:::

::: tip Session length still matters
Sink checks the JWT locally. If you revoke an Access session, the old JWT can work until it expires. Pick an Access session duration that fits your risk.
:::

## Cloudflare references

- [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Access session management](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
