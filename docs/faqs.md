# FAQs

## 1. Why can't I create a link?

Please check the Cloudflare KV bindings, the KV environment variable name should be all uppercase letters.

<details>
  <summary><b>Screenshot</b></summary>
  <img alt="KV Bindings setting in Cloudflare" src="/docs/images/faqs-kv.png"/>
</details>

## 2. Why can't I log in?

Please check if `NUXT_SITE_TOKEN` is set to pure numbers, Sink does not support pure number Tokens, we consider this to be unsafe.

## 3. Why can't I see the analytics data?

Analytics data requires access to Cloudflare’s settings:

1. Verify `NUXT_CF_ACCOUNT_ID` and `NUXT_CF_API_TOKEN` are configured correctly (ensure the Account ID matches the deployment zone ID).
2. Check that the Worker analytics engine is enabled.

<details>
  <summary><b>Screenshot</b></summary>
  <img alt="Analytics engine Bindings setting in Cloudflare " src="/docs/images/faqs-Analytics_engine.png"/>
</details>

## 4. I don't want the current homepage? Can it be redirected to my blog?

Of course. Please set the environment variable `NUXT_HOME_URL` to your blog or official website address.

## 5. Why can't I see statistics after deploying with NuxtHub?

NuxtHub's ANALYTICS points to its dataset, you need to set the `NUXT_DATASET` environment variable to point to the same dataset.

## 6. Why are links always case-insensitive?

This is a feature of Sink. By default, we automatically convert all links to lowercase to avoid case-sensitive issues and improve usability. This ensures users don’t encounter errors due to accidental capitalization differences.

However, you can disable this feature by setting the `NUXT_CASE_SENSITIVE` environment variable to `true`.

### What happens when `NUXT_CASE_SENSITIVE` is `true`?

Newly generated links will be case-sensitive, treating `MyLink` and `mylink` as distinct. Randomly generated slugs will include both uppercase and lowercase characters, offering a larger pool of unique combinations (but not user-friendly that why we default to non-case-sensitive).

## 7. Why does the Metric list only show the top 500 data entries?

To improve query performance, we have limited the amount of data. If you need to query more data, you can adjust it through `NUXT_LIST_QUERY_LIMIT`.

## 8. I don't want to count bot or crawler traffic

Set `NUXT_DISABLE_BOT_ACCESS_LOG` to `true`.

## 9. What is Link Cloaking?

Link cloaking masks your destination URL by showing your short link domain in the browser address bar instead of redirecting to the target URL. The destination page loads inside a full-screen iframe.

### How to enable it

Toggle **Enable Link Cloaking** in the **Link Settings** section when creating or editing a link.

### Limitations

- **Sites that block iframes**: Websites with `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'` will not load inside the iframe. Most major sites (Google, GitHub, Twitter, etc.) block iframe embedding.
- **HTTPS required**: The destination URL must use HTTPS. Mixed content (HTTPS short link → HTTP destination) will be blocked by browsers.
- **Limited interaction**: Some features like OAuth login flows, `window.top` navigation, and certain payment forms may not work correctly inside the iframe.
- **Device redirects take priority**: If both cloaking and device redirects (iOS/Android) are configured, device redirects will take precedence on matching devices.

### If the destination site blocks iframes

If you control the destination site, you can whitelist your short link domain by adding this response header:

```
Content-Security-Policy: frame-ancestors 'self' your-short-domain.com
```

## 10. What is Redirect with Query Parameters?

When enabled, query parameters from the short link URL are appended to the destination URL. For example, visiting `https://s.ink/my-link?ref=twitter` would redirect to `https://example.com/page?ref=twitter`.

### Per-link vs Global

- **Global setting**: Set `NUXT_REDIRECT_WITH_QUERY=true` to enable for all links by default.
- **Per-link override**: Toggle **Redirect with Query Parameters** in the **Link Settings** section when creating or editing a link. This overrides the global setting for that specific link.

If a link has no per-link setting, it falls back to the global configuration.

## 11. How does the Import/Export feature work?

Import and Export are designed to work within Cloudflare Workers' KV operation limits (50 per request by default).

- **Export**: Downloads links in batches, automatically paginating until complete.
- **Import**: Uploads links in batches (half of `NUXT_PUBLIC_KV_BATCH_LIMIT`, default 25) since each link requires 2 KV operations (check existence + write).
- **Expired links**: Imported as-is to support migration scenarios.
- **Duplicate slugs**: Skipped during import (existing links are preserved).
- **Validation**: All links are validated against the schema before import starts.
- **Passwords**: Exported password values are masked. Masked passwords are preserved during import and cannot be submitted as new plaintext passwords.

## 12. How do password-protected and unsafe links work?

- **Password protection**: Visitors see a password form before redirecting. Programmatic clients can send the `x-link-password` header when requesting the short link.
- **Unsafe warning**: Links marked as unsafe show a warning page before redirecting. Programmatic clients can send `x-link-confirm: true` after confirming the destination.
- **Automatic unsafe detection**: Set `NUXT_SAFE_BROWSING_DOH` to a DoH endpoint to mark suspicious destinations automatically during create or edit.

## 13. How does geo-routing work?

Geo-routing redirects visitors to country-specific URLs based on Cloudflare's `request.cf.country` value. Configure a two-letter country code map such as `{ "US": "https://example.com/us" }` in the link settings or API `geo` field.

Device routing takes precedence when an Apple or Android device-specific URL matches the visitor.

## 14. How can I export analytics data?

Use the dashboard's access export feature or call `GET /api/stats/export` with the same filter parameters used by analytics views, such as `startAt`, `endAt`, `slug`, `country`, `browser`, or `device`. The API returns a CSV file with `slug`, `url`, `viewer`, `views`, and `referer` columns.
