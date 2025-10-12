# Deployment on Cloudflare Workers

1. [Fork](https://github.com/ccbikai/Sink/fork) the repository to your GitHub account.
2. Create a [KV namespace](https://developers.cloudflare.com/kv/) (under **Storage & Databases** -> **KV**), and copy the namespace ID.
3. Update the `kv_namespaces` ID in `wrangler.jsonc` with your own namespace ID.
4. Create a project in [Cloudflare Workers](https://developers.cloudflare.com/workers/).
5. Select the `Sink` repository and use the following build and deploy commands:
   - **Build command**: `pnpm run build` or `npm run build`
   - **Deploy command**: `npx wrangler deploy`

6. Save and deploy the project.
7. After deployment, go to **Settings** -> **Variables and Secrets** -> **Add**, and configure the following environment variables:
   - `NUXT_SITE_TOKEN`: Must be at least **8** characters long. This token grants access to your dashboard.
   - `NUXT_CF_ACCOUNT_ID`: Find your [account ID](https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/).
   - `NUXT_CF_API_TOKEN`: Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) with at least `Account.Account Analytics` permission. [See reference.](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/#authentication)

8. Enable Analytics Engine. In **Workers & Pages**, go to **Account details** in the right panel, locate **Analytics Engine**, and click **Set up** to enable the free tier.
9. Redeploy the project.
10. To update your code, refer to the official GitHub documentation: [Syncing a fork branch from the web UI](https://docs.github.com/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork#syncing-a-fork-branch-from-the-web-ui 'GitHub: Syncing a fork').
