# Chanasta — self-hosting guide

**Status:** draft for the beta build. Everything here is deliberately boring: one static app, one
Supabase project, no server of your own, no payment integration (there is nothing to integrate —
Chanasta never touches money).
**Companion docs:** [architecture.md](./architecture.md) §7–§8 · [api.md](./api.md) ·
[moderation.md](./moderation.md) · [compliance.md](./compliance.md).

> **Reminder:** you are deploying a page that displays a creator's own payment details and stores
> self-reported messages. You are not deploying a payment system. Keep the "we never touch the money"
> disclosures on every creator page (`/legal/*`, compliance §10). Get local legal advice before opening
> to real creators — the ToS/privacy may still be drafts in this build.

---

## 0. What you are deploying

| Piece | Where it runs | What it needs |
|---|---|---|
| Static web app (Vite) | Netlify / GitHub Pages / any static host | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for accounts; otherwise it stays in local demo mode |
| Database + auth + REST | Supabase project | `supabase/schema.sql` (required), `supabase/seed.sql` (optional demo data) |
| Moderation | Supabase SQL editor / service-role tooling | the runbook in [moderation.md](./moderation.md) |

No edge functions are required by this build. The QR/amount derivation happens in the browser with the
vendored deshiQR engine (see architecture §5); the database validates payload checksums and limits.

---

## 1. Create the Supabase project

1. Create a project at <https://supabase.com/dashboard> (choose the region closest to your creators;
   disclose the hosting region in the privacy policy once final).
2. Copy the project URL and **anon** key from *Project Settings → API*. The anon key is public by design;
   the `service_role` key is not — keep it out of the web build and out of git.
3. This schema targets the Supabase `public` schema and uses `auth.users`, `auth.uid()`,
   `anon`/`authenticated`/`service_role`. It does not need any extension beyond the built-in `pgcrypto`
   guard.

---

## 2. Apply the schema (required) and seed (optional)

`supabase/schema.sql` is one idempotent migration; `supabase/seed.sql` is idempotent synthetic demo data.

### Option A — SQL editor (fastest)

1. *SQL Editor → New query* → paste the **whole** of `supabase/schema.sql` → Run.
2. Re-running it is safe (all objects are `if not exists` / `create or replace`).
3. Optional: paste `supabase/seed.sql` in a second query to get the three DEMO pages, fake payment
   methods and self-reported claims. **Do not seed production data.** Every row in the seed is synthetic
   (`demo-teacher`, `demo-artist`, `demo-writer`, fake account `01000000000`, synthetic BN QR payloads,
   fake txids).

### Option B — psql / Supabase CLI

```bash
# with the Supabase CLI (project already linked)
supabase link --project-ref YOUR_PROJECT_REF
supabase db push        # if you keep schema.sql in supabase/migrations/
# or apply the files directly:
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # optional demo only
```

### Verify before you trust it

```bash
# local, no Supabase project required: real Postgres in WASM (PGlite)
node scripts/check-sql.mjs
# → PASS — 255/255 SQL assertions passed
```

That harness boots a throwaway Postgres, stubs `auth.users`/`auth.uid()` and the Supabase roles, applies
schema + seed twice, and asserts CRC validity, public-view filtering/columns, RLS/owner isolation,
reserved slugs, publish/claim/review rules and rate limits. Run it after any schema change.

Quick live sanity check (should be **permission denied**, not data — base tables are not anon-readable):

```bash
curl -s "$SUPABASE_URL/rest/v1/creators?select=*&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
# → {"code":"42501", ... "permission denied for table creators"}

curl -s "$SUPABASE_URL/rest/v1/public_creators?select=slug&limit=3" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
# → published creators only (or [] before you seed/create one)
```

---

## 3. Auth (magic-link owners)

1. *Authentication → Providers → Email*: enable Email. OTP/magic-link sign-in is enough; no passwords
   are needed in MVP. Configure SMTP if the built-in email quota is too small for your beta.
2. *Authentication → URL Configuration*:
   - **Site URL:** `https://YOUR-DOMAIN` (or the Netlify URL while testing).
   - **Redirect URLs:** add every origin + path the app can return to, e.g.
     - `http://localhost:5173/dashboard`
     - `https://YOUR-DOMAIN/dashboard`
     - `https://YOUR-SITE.netlify.app/dashboard`
     - `https://YOUR-GH-PAGES-URL/chanasta/dashboard` (only if you enable Supabase on Pages)
   - Preview/branch deploys need their own entries — wildcards are provider-specific; keep the list
     tight and review it before each launch.
3. The app calls `signInWithOtp({ email, options: { emailRedirectTo: <origin+base>/dashboard } })` and
   handles the auth hash on load (architecture §7). In local mode (no env vars) the login page explains
   that accounts need a configured Supabase project.
4. Owner RPCs use the user's session JWT; the client never uses the service role.

---

## 4. Deploy the static app

### Netlify (accounts/Supabase mode)

- Build command: `pnpm build` (or `npm run build`), publish directory: `dist`.
- Set environment variables in *Site settings → Environment variables*:

| Variable | Example | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` | project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJ…` (anon) | public key; never the service_role key |
| `CHANASTA_BASE` | *(unset)* | Netlify serves from `/`; leave empty |

- `public/_redirects` and `public/_headers` are part of the repo and are copied into `dist/`
  automatically: SPA fallbacks (`/@*`, `/embed/*`, `/dashboard*`, …) plus CSP/security headers, with
  `frame-ancestors *` allowed **only** on `/embed/*`.
- Alternatively, at runtime you can inject `window.CHANASTA_CONFIG = { supabaseUrl, supabaseAnonKey }`
  before the app script; env vars are the simpler path.

### GitHub Pages (demo mode)

The Pages deployment is a **local demo**: no Supabase project, no accounts, data stays in the browser's
`localStorage`. Build with:

```bash
CHANASTA_BASE=/chanasta/ pnpm build
# CI copies dist/index.html → dist/404.html and adds dist/.nojekyll for deep links
```

Do **not** inject Supabase env vars into the Pages build unless you have deliberately configured that
project's auth redirect URLs for the Pages origin; the demo is meant to be safe and complete as-is.

---

## 5. Custom domain

1. Add the domain in Netlify (*Domain management*) and enable HTTPS.
2. Update Supabase *Site URL* and *Redirect URLs* to the custom domain (dashboard path included).
3. Update any widgets/iframes you control to the new origin (`examples/embed.html` takes the origin from
   a query string/data attribute, so no code change is needed).
4. Creator URLs stay `/@<slug>`; the domain change does not change page slugs. Keep `/embed/*` frameable
   and the rest of the app unframeable (the repo CSP header does that).

---

## 6. Retention, backups and housekeeping

The schema implements the retention rules in data-model.md §11 with service-role helpers
(`chanasta` schema, not exposed through the REST API). There is no cron inside the app; schedule these
from Supabase's scheduler/`pg_cron` (where available), your own cron, or the SQL editor:

```sql
-- null ip_hash after 30 days; delete rejected claims after 90 days
select chanasta.purge_expired_claim_pii();

-- hard-purge creator pages soft-deleted more than 30 days ago (methods/claims cascade)
select chanasta.purge_deleted_creators();

-- expire auto-quarantine rows for changed/deleted slugs after 90 days
select chanasta.purge_expired_slug_quarantine();
```

Optional `pg_cron` example (only if the extension is enabled on your plan):

```sql
select cron.schedule('chanasta-retention', '30 3 * * *', $$
  select chanasta.purge_expired_claim_pii();
  select chanasta.purge_deleted_creators();
  select chanasta.purge_expired_slug_quarantine();
$$);
```

- **Backups:** Supabase backup retention depends on your plan — record the actual window in the privacy
  policy and moderation runbook once you know it. Restore drills should restore into a staging project,
  never over live data, and must not resurrect purged `ip_hash`/`txid` rows in production.
- **Export:** creators can export their own claims from the dashboard; exports must never include
  `txid` or `ip_hash` (data-model §11).
- **Evidence:** moderation evidence (report email, page URL, screenshot, decision) is kept privately
  outside the repo for a bounded period — see [moderation.md](./moderation.md).

---

## 7. Rate-limit tuning

Claim submission is limited inside `public.submit_support_claim` (data-model §8):

- per IP fingerprint: **5 / hour** and **20 / day**
- per creator: **100 / day**

If the beta needs different values, change the three `chanasta.take_rate_limit(...)` calls in
`supabase/schema.sql`, re-run the schema (or `create or replace` just that function on the project), and
re-run `node scripts/check-sql.mjs`. Keep the same key shapes (`claim:ip:<hash>:1h`,
`claim:ip:<hash>:24h`, `claim:creator:<uuid>:24h`) so existing windows/cleanup keep working.

Inspect/clean the internal counter table from the SQL editor (keys contain a private IP fingerprint —
do not paste them into tickets or logs):

```sql
select key, count, window_start, expires_at
from chanasta.rate_limits
order by expires_at desc
limit 20;

-- housekeeping: drop expired windows (safe; they would be reset on next use anyway)
delete from chanasta.rate_limits where expires_at < now();
```

For suspicious traffic: suspend/hide the page via the moderation runbook (service-role SQL) rather than
editing limits on the fly; raise the limits only with a reason and re-run the harness.

---

## 8. Security checklist (before you open the beta)

- [ ] `node scripts/check-sql.mjs` passes (255/255) on the schema you are deploying.
- [ ] Only the **anon** key is in the web build (`grep -r "service_role" dist/` returns nothing).
- [ ] `VITE_SUPABASE_*` env vars exist only in the host's env settings, never committed.
- [ ] RLS verified live: anon key returns `permission denied` for `/rest/v1/creators`,
      `/rest/v1/payment_methods`, `/rest/v1/support_claims`, `/rest/v1/reserved_slugs`; the `public_*`
      views work. Public views never contain `txid`/`ip_hash`/`user_id`.
- [ ] Auth *Site URL* and *Redirect URLs* are exact (no wildcard leftovers from testing).
- [ ] `public/_headers` CSP is deployed: strict `default-src`, Google Fonts allowed, `frame-ancestors *`
      only on `/embed/*`; `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` present.
- [ ] `public/robots.txt` disallows `/dashboard*`; nothing private is indexable.
- [ ] Seed was **not** applied to a project you will use for real creators (or the DEMO pages are
      removed first).
- [ ] Retention jobs are scheduled (or on a calendar) and a restore drill has been done.
- [ ] Report route works: mailto `hello2himel@proton.me` prefilled with the page URL from the report
      link; best-effort 72-hour beta SLA is stated in the ToS.
- [ ] Legal pages show the "Draft — pending legal review" banner until counsel signs off.
- [ ] No automated payment confirmation exists anywhere (no SMS/notification parsing, no provider API
      polling, no bank statement import) — this is permanent for MVP.
- [ ] Dependency/secret hygiene: no `.env` in git, no service-role key in CI logs, rotate keys if
      exposed; keep the vendored deshiQR code in sync with `pnpm sync:deshiqr`.

## Local Supabase (no cloud account needed)

You can run the whole backend on your machine with Docker and the Supabase CLI — no Supabase
account, no keys from anyone:

```sh
# once per machine: Docker must be running
npx supabase start          # boots Postgres + Auth + REST + Mailpit locally
pnpm supabase:reset         # applies supabase/migrations/* and supabase/seed.sql
npx supabase status -o env  # prints API_URL, ANON_KEY, SERVICE_ROLE_KEY
```

Then point the app at it (create `.env.local`, git-ignored):

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY from `supabase status -o env`>
```

`pnpm dev` now runs in Supabase mode: magic links appear in Mailpit at <http://127.0.0.1:54324>,
real Auth users are created, and the Postgres RLS/RPC model is exercised exactly as in production.
`pnpm supabase:stop` shuts everything down; `pnpm supabase:reset` wipes and re-seeds.

Reproduce that verification any time with:

```sh
npx supabase start
eval "$(npx supabase status -o env | sed 's/^/export /')"
node scripts/check-supabase-live.mjs
```

This repo was verified end-to-end against the local stack: **25/25 live assertions** covering Auth
sign-in, owner inserts, publish-requires-a-method, anon reads through the public views (no `user_id`),
anon denial on base tables (401), claim RPC validation + the 5/hour rate limit, txid staying private,
owner-only claims, claim confirm → public badge, cross-user RLS isolation, foreign-claim rejection,
reserved/invalid slug rejection, and slug-addressable public pages.

Canonical schema: `supabase/schema.sql` is the file to paste into a cloud SQL editor;
`supabase/migrations/20261101000000_chanasta_init.sql` is the same SQL for the CLI. Keep them in
sync with `pnpm supabase:sync-schema` after editing the canonical file.
