# Deployment on Cloudflare Pages

1. [Fork](https://github.com/miantiao-me/Sink/fork) the repository to your GitHub account.
2. Create a project in [Cloudflare Pages](https://developers.cloudflare.com/pages/).
3. Select the `Sink` repository and choose the `Nuxt.js` preset.
4. Configure the following environment variables:
   - `NUXT_SITE_TOKEN`: Must be at least **8** characters long. This token grants access to your dashboard.
   - `NUXT_CF_ACCOUNT_ID`: Find your [account ID](https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/).
   - `NUXT_CF_API_TOKEN`: Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) with at least `Account.Account Analytics` permission. [See reference.](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/#authentication)

5. Save and deploy the project.
6. Cancel the deployment, then go to **Settings** -> **Bindings** -> **Add**:
   - **KV Namespace**: Bind the variable name `KV` to a [KV namespace](https://developers.cloudflare.com/kv/) (create a new one under **Storage & Databases** -> **KV**).
   - **Workers AI** (_Optional_): Bind the variable name `AI` to the Workers AI Catalog.
   - **Analytics Engine**:
     - In **Workers & Pages**, go to **Account details** in the right panel, locate `Analytics Engine`, and click `Set up` to enable the free tier.
     - Return to **Settings** -> **Bindings** -> **Add** and select **Analytics engine**.
     - Bind the variable name `ANALYTICS` to the `sink` dataset.

7. Add Compatibility flags
   - Go to **Settings** -> **Runtime** -> **Compatibility flags** and set the following flags `nodejs_compat`.
8. Redeploy the project.
9. To update code, refer to the official GitHub documentation [Syncing a fork branch from the web UI](https://docs.github.com/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork#syncing-a-fork-branch-from-the-web-ui 'GitHub: Syncing a fork').
