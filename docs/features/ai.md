---
title: Workers AI
description: Optional AI help for short-code suggestions and social preview text.
---

# Workers AI

Sink can use Cloudflare **Workers AI** to suggest short codes and social preview titles/descriptions. Optional — normal links work without it.

## Enable

Bind Workers AI as `AI`. You can change the model or prompts in [configuration](/configuration/#advanced-defaults). A custom short-code prompt must keep the `{slugRegex}` placeholder.

If AI is not bound, AI endpoints return **501** (“not enabled”).

## Behavior

For a URL, Sink tries to read the page and ask the model for structured output:

- `/api/link/ai` — short-code suggestion
- `/api/link/og-ai` — title and description; optional `locale` query for preferred language

If the model fails after the request starts, Sink falls back to a simple URL-based suggestion. Always review before saving.

::: warning Data is sent to Workers AI
Page content and the destination URL may be sent to Cloudflare Workers AI. Check sensitivity and policy first.
:::
