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

## 9. How does the Import/Export feature work?

Import and Export are designed to work within Cloudflare Workers' KV operation limits (50 per request by default).

- **Export**: Downloads links in batches, automatically paginating until complete.
- **Import**: Uploads links in batches (half of `NUXT_PUBLIC_KV_BATCH_LIMIT`, default 25) since each link requires 2 KV operations (check existence + write).
- **Expired links**: Imported as-is to support migration scenarios.
- **Duplicate slugs**: Skipped during import (existing links are preserved).
- **Validation**: All links are validated against the schema before import starts.
