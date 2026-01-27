# Sink Configuration

Sink provides some configuration options, which can be referred to in [.env.example](../.env.example).

> When using Worker deployment, please note that variables with the `NUXT_PUBLIC_` prefix need to be configured in Workers' **Settings** -> **Build** -> **Variables and Secrets** and **Settings** -> **Variables and Secrets**.

## `NUXT_PUBLIC_PREVIEW_MODE`

> If you are using Worker deployment, this variable needs to be configured in **Settings** -> **Build** -> **Variables and Secrets** and **Settings** -> **Variables and Secrets**.

Sets the site to demo mode, the generated links will expire after 5 minutes, and the links cannot be edited or deleted.

## `NUXT_PUBLIC_SLUG_DEFAULT_LENGTH`

> If you are using Worker deployment, this variable needs to be configured in **Settings** -> **Build** -> **Variables and Secrets** and **Settings** -> **Variables and Secrets**.

Sets the default length of the generated SLUG.

## `NUXT_PUBLIC_KV_BATCH_LIMIT`

> If you are using Worker deployment, this variable needs to be configured in **Settings** -> **Build** -> **Variables and Secrets** and **Settings** -> **Variables and Secrets**.

Sets the maximum number of KV operations per request for import/export. Default is 50 (Cloudflare Workers limit per request). Import operations use half of this value since each link requires 2 KV operations (check existence + write).

## `NUXT_REDIRECT_STATUS_CODE`

Redirects default to use HTTP 301 status code, you can set it to `302`/`307`/`308`.

## `NUXT_LINK_CACHE_TTL`

Cache links can speed up access, but setting them too long may result in slow changes taking effect. The default value is 60 seconds.

## `NUXT_REDIRECT_WITH_QUERY`

URL parameters are not carried during link redirection by default and it is not recommended to enable this feature.

## `NUXT_HOME_URL`

The default Sink homepage is the introduction page, you can replace it with your own website.

## `NUXT_DATASET`

The Analytics Engine DATASET, it is not recommended to modify unless you need to switch databases and clear historical data.

## `NUXT_AI_MODEL`

You can modify the large model yourself. The supported names can be viewed at [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/#text-generation).

## `NUXT_AI_PROMPT`

Supports custom prompts, it is recommended to keep the placeholder {slugRegex}.

Default prompt:

```txt
You are a URL shortening assistant, please shorten the URL provided by the user into a SLUG. The SLUG information must come from the URL itself, do not make any assumptions. A SLUG is human-readable and should not exceed three words and can be validated using regular expressions {slugRegex} . Only the best one is returned, the format must be JSON reference {"slug": "example-slug"}
```

## `NUXT_CASE_SENSITIVE`

Set URL case sensitivity.

## `NUXT_LIST_QUERY_LIMIT`

Set the maximum query data volume for the Metric list.

## `NUXT_DISABLE_BOT_ACCESS_LOG`

Access statistics do not count bot traffic.

## `NUXT_API_CORS`

Set the environment variable `NUXT_API_CORS=true` during build to enable CORS support for the API.

## `NUXT_DISABLE_AUTO_BACKUP`

Set to `true` to disable the automatic daily KV backup to R2 storage. Default is `false`.

This feature requires:

1. R2 bucket binding configured in `wrangler.jsonc`
2. Create R2 bucket: `wrangler r2 bucket create sink`

Backups are stored in R2 with the path `backups/links-{timestamp}.json` and run daily at 00:00 UTC.
