# Cloudflare Access Authentication

Sink can optionally use Cloudflare Access as an alternative to the existing site token. When Access is not configured, authentication behaves exactly as before.

With Access configured, an API request is accepted when either condition is true:

- The request has a valid `NUXT_SITE_TOKEN` bearer token.
- The request has a valid Cloudflare Access application JWT.

Sink verifies the Access JWT signature, issuer, audience, and expiration against your team's public keys. The presence of an Access header or cookie alone is never trusted.

## Compatibility-first setup

This setup protects the dashboard while keeping public short links and SiteToken API clients unchanged.

1. Create a Cloudflare Access self-hosted application for your Sink hostname.
2. Configure its application path to cover both `/dashboard` and its child routes.
3. Do not protect `/api` with Access. Sink authenticates API requests itself using SiteToken or the signed Access application cookie.
4. In the Access application's advanced cookie settings:
   - Keep **Cookie Path** disabled so the dashboard cookie is also sent to `/api`.
   - Set **SameSite** to `Lax` or `Strict` when your deployment does not require cross-site requests.
5. Add the following Sink environment variables and redeploy:

```ini
NUXT_CF_ACCESS_TEAM_DOMAIN=https://your-team.cloudflareaccess.com
NUXT_CF_ACCESS_AUD=your-application-aud-tag
```

Both variables are required. The team domain should not have a path. The AUD tag is available in the Access application's additional settings.

Short-link paths, static assets, and API documentation remain public at the Cloudflare Access layer. API operations still require Sink authentication. Protect `/_docs` separately if the API schema should not be public.

## Security considerations

In compatibility-first mode, `/api` is not evaluated by the Cloudflare Access proxy on every request. Sink validates the signed application JWT locally. As a result, an Access session revoked by an administrator may remain usable until its JWT expires. Use an appropriately short Access policy or application session duration.

Access uses a browser cookie, so Sink rejects cross-site browser requests authenticated through Access and verifies the `Origin` header for state-changing methods. SiteToken requests are unchanged. Non-browser clients should continue to use `NUXT_SITE_TOKEN`.

Do not expose an alternative deployment hostname with a weak SiteToken. Cloudflare Access on the dashboard does not protect other hostnames that route to the same Worker or Pages project.

## Logout

When the dashboard is authenticated through Access, Sink redirects logout to `/cdn-cgi/access/logout`. Cloudflare revokes the Access session across applications and clears the application cookie.

## Strict setup

For stronger edge enforcement, you can protect both `/dashboard` and `/api` with Access. In this mode, Cloudflare blocks requests before they reach Sink, so a SiteToken-only API client cannot use the protected hostname. Such clients must also use an Access service token or a separate API hostname.

## References

- [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Access application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Access session management](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
