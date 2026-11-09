# Owner scoping for Sink-pri

Implementation spec for adding per-user link ownership to this fork.

Save as `docs-internal/owner-scoping-plan.md` (NOT under `docs/`, which is the published VitePress site).

## Context

- Repo: `jkraczek/Sink-pri`, a fork of `miantiao-me/Sink`.
- Deployed to Cloudflare Workers via Git integration. Pushes to `master` deploy to production automatically.
- There is no staging environment. Production D1 holds live links.
- Login is via Cloudflare Access (Zero Trust). `NUXT_CF_ACCESS_TEAM_DOMAIN` and `NUXT_CF_ACCESS_AUD` are set.
- Goal: several people share one deployment, each sees only their own links. One admin (the owner) sees everything, with link ownership visible.
- Read `AGENTS.md` first. Its constraints are authoritative and are not repeated in full here.

## Verified starting facts

- `server/middleware/2.auth.ts` already sets `event.context.userID`, `event.context.userEmail`, and `event.context.authMethod` on every `/api/**` request.
- `authMethod` is one of `site-token`, `access-user`, `access-service`. Both `site-token` and `access-service` map to `userID: 'root'`.
- Nothing downstream consumes that identity today. Every link endpoint reads and writes the single global `links` table in D1.
- `server/database/schema.ts` has no ownership column.
- Analytics visits are written in `server/utils/access-log.ts` with `indexes: [link.id]` (a single Analytics Engine index, `index1`) and no owner field. Analytics filters are built in `server/utils/query-filter.ts`.
- `server/api/link/upsert.post.ts` returns an existing link's full details to anyone who posts its slug. `server/api/link/query.get.ts` returns any link by slug. Both are information leaks once the deployment is multi-user.

## Design decisions

1. **Ownership key: email.** Add an `owner_email` column to `links` (nullable, indexed), storing the lowercased Access email. Not the Access `sub` — email is what the admin recognizes, and with email-based Access login it is the identity anyway.
2. **NULL owner means unassigned.** Pre-existing links have no owner and are visible to admins only. Do not hardcode any email into a migration.
3. **Admin identification.** A new env var `NUXT_ADMIN_EMAILS` holds a comma-separated list. `authMethod` of `site-token` or `access-service` is also admin.
4. **Keep the owner out of the shared `Link` schema and out of the KV cache.** Redirects do not need it. Expose it as an extra field on list/query responses instead. This minimizes edits to files upstream changes often.
5. **Surgical edits.** All logic lives in new files. Existing upstream files get one- or two-line calls into them. New files never produce merge conflicts.

## Change map

New file, e.g. `server/utils/ownership.ts`:

- `isAdmin(event): boolean`
- `getOwnerScope(event): { admin: true } | { admin: false, email: string }`
- `assertCanAccessLink(event, link)` — throws 404 (not 403) for a link the caller does not own, so existence is not revealed.

Schema and migration:

- Add `ownerEmail` to `links` in `server/database/schema.ts` plus an index.
- Run `pnpm db:generate`. Commit the generated migration in `drizzle/`.

Server endpoints:

| Area            | Files                                                                               | Change                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listing         | `link/list.get.ts`, `search.get.ts`, `count.get.ts`, `tags.get.ts`, `export.get.ts` | Add an owner condition to the D1 query. `server/services/link-store/d1.ts` already has a shared `linkFilterCondition` / `LinkFilterOptions` pattern to extend.                         |
| Single link     | `link/query.get.ts`, `edit.put.ts`, `delete.post.ts`                                | 404 unless owner or admin.                                                                                                                                                             |
| Creating        | `link/create.post.ts`, `upsert.post.ts`, `import.post.ts`                           | Stamp the owner. Fix `upsert` so it does not return another user's existing link.                                                                                                      |
| Duplicate check | `link/check.post.ts`                                                                | Only match against the caller's own links.                                                                                                                                             |
| Analytics       | `api/stats/*`, `api/logs/*`                                                         | For non-admins, constrain queries to the caller's own link IDs and reject requests for IDs they do not own. Implement in `server/utils/query-filter.ts` so every consumer inherits it. |
| Admin only      | `api/backup.post.ts`, `api/link/migration/run.post.ts`                              | Reject non-admins.                                                                                                                                                                     |
| Session         | `api/verify.get.ts`                                                                 | Also return `isAdmin`.                                                                                                                                                                 |

Frontend:

- Owner label on link cards, admin only.
- Owner filter on the links page, admin only.
- Hide the Migrate page and backup actions for non-admins.
- `app/composables/useAuthSession.ts` carries `isAdmin` through from `verify`.

i18n:

- Every new string must be added to all 11 locale directories under `i18n/locales/`. Run `pnpm locales:check`.

## Workflow

1. Confirm baseline. On a clean checkout of `master`: `pnpm install`, `pnpm build`, `pnpm test --run`. All green before any edits. Create branch `feature/owner-scoping`.
2. Add the `upstream` remote (`https://github.com/miantiao-me/Sink.git`) for later syncing. Do not merge it yet.
3. Write failing tests first, in the existing `tests/` structure: user A cannot see, query, edit, or delete user B's links; admin sees all; unassigned links are admin-only; analytics for a non-admin excludes other users' link IDs.
4. Implement the change map above.
5. `pnpm lint:fix`, `pnpm types:check`, `pnpm locales:check`, `pnpm build`, then `pnpm test --run`. Per AGENTS.md, worker tests execute `.output/server/index.mjs`, so build before the final test run or the tests exercise stale output.
6. Open a PR for review. Do not merge to `master` until the tests pass and the diff has been read.

## Guardrails

- Never run `pnpm deploy:worker`, `pnpm deploy:pages`, or `pnpm db:migrate:remote`. All three mutate production.
- Never put the real `NUXT_SITE_TOKEN` or real Cloudflare credentials in `.env`. Use throwaway local values.
- Do not edit `app/components/ui/**` (shadcn-vue managed).
- Do not merge or rebase onto `upstream/master` as part of this work. Sync is a separate task.
- Production has links with NULL owner. Any migration must be additive and backward compatible: the currently deployed code must keep working against the new schema.

## Known follow-ups (not in scope here)

- `NUXT_HOME_URL` will be set in the Cloudflare dashboard to redirect `/`, letting the fork's Hero/Testimonials customizations revert to upstream.
- Slugs remain globally unique. A user attempting a taken slug learns it is taken. Accepted.
- The site token remains a full-admin API key regardless of Access. It must not be shared.
- Export/import will not round-trip ownership unless the owner is added to those payloads. Decide separately.
- After this lands and is proven, consider proposing optional owner scoping as an upstream issue.

## Sync strategy after this lands

- Add `upstream`, then `git fetch upstream && git merge upstream/master`, resolve, run the full test suite, push.
- Sync often. Small merges are far easier than one large one.
- Expected recurring conflict: Drizzle migration numbering and `drizzle/meta/_journal.json` when upstream adds a migration that collides with this one. Resolution is to take upstream's migration and renumber/regenerate on top of it, accounting for the fact that the ownership migration has already been applied to production D1.

## Done when

- A non-admin Access user sees only their own links, tags, and analytics.
- An admin sees all links with owner attribution and can filter by owner.
- Links created before this change are visible to admins only.
- No endpoint reveals another user's link by slug, URL, or ID.
- `pnpm lint`, `pnpm types:check`, `pnpm locales:check`, and `pnpm test --run` all pass on a fresh build.
