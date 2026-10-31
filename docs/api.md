# Chanasta — API & embed guide

**Status:** draft for the beta build · the SQL in [`supabase/schema.sql`](../supabase/schema.sql) is the
source of truth for names, columns and error codes. If this page and the SQL disagree, the SQL wins.
**Companion docs:** [architecture.md](./architecture.md) §5–§7 · [data-model.md](./data-model.md) ·
[compliance.md](./compliance.md) · [self-hosting.md](./self-hosting.md) · [moderation.md](./moderation.md)

> **Chanasta does not process payments.** There is no payment API here, because there is no payment
> processing. Money moves inside the supporter's own bKash / Nagad / Rocket / bank app, directly to the
> creator's own account. This API only (a) serves a creator's public page data and their own payment
> details and (b) accepts a supporter's **self-reported** "I sent it" message. It cannot confirm, hold,
> route, refund or settle money, and it never returns a payment status.

---

## 1. What is public and where it comes from

There are two kinds of surface:

| Surface | Who calls it | Auth | Backed by |
|---|---|---|---|
| Public views (`public_creators`, `public_payment_methods`, `public_support_claims`) | anyone, including static pages/embeds | anon key (public) | `supabase/schema.sql` §8 |
| RPCs (`is_slug_available`, `submit_support_claim`, `review_support_claim`, `creator_set_status`, `creator_change_slug`, `creator_claim_counts`) | supporters / signed-in creators | anon key, or the creator's session JWT | `supabase/schema.sql` §12 |
| Owner tables (`creators`, `payment_methods`, `support_claims`) | the creator's own dashboard | creator session JWT | RLS, owner-only policies |

Base tables are **never readable with the anon key**. The views are the public contract and they select
explicit columns: adding a private column later cannot leak through them.

### Never public

`txid`, `ip_hash`, creator `user_id`, emails/auth data, `moderated_by`, review timestamps,
`deleted_at`, `last_slug_change_at`, and the creator-internal `id` where it isn't needed.
Support claims expose only:
`id, creator_slug, amount_bdt, supporter_name, message, method_kind, status, created_at`.

### Status values you will see

- `payment_qr_status`: `none | verified | unverified | image_only`. **`verified` means the QR payload's
  checksum and decoded NPSB Bangla QR merchant fields checked out** (the scheme bKash issues). It does
  **not** mean a payment happened, that the payee identity was verified, or that money is held.
- claim `status`: `unverified` (self-reported, public), `confirmed` (the creator pressed confirm — still
  not a Chanasta payment verification), `hidden` (not public), `rejected` (moderation-only, terminal).
- creator `status` is not exposed publicly; unpublished/suspended/deleted creators simply do not appear
  in the views.

---

## 2. Public read endpoints (Supabase REST + anon key)

Set up once (values come from your own Supabase project — see [self-hosting.md](./self-hosting.md)):

```bash
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_ANON_KEY="YOUR-PUBLIC-ANON-KEY"   # public by design; never the service_role key
```

`anon` requests need both headers (Supabase's gateway checks the `apikey`, PostgREST reads the bearer
token):

```bash
-H "apikey: $SUPABASE_ANON_KEY"
-H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### 2.1 Creator profile — `public_creators`

```bash
curl -s "$SUPABASE_URL/rest/v1/public_creators?slug=eq.demo-teacher&select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

```json
[
  {
    "slug": "demo-teacher",
    "display_name": "ডেমো শিক্ষক (DEMO Teacher)",
    "tagline": "গণিত শেখাই — এটি একটি ডেমো পেজ / I teach maths — a demo page",
    "bio": "এটি চানাস্তার একটি সিন্থেটিক ডেমো পেজ…",
    "avatar_emoji": "📚",
    "socials": { "website": "https://example.com/chanasta-demo-teacher" },
    "goal_amount_bdt": null,
    "goal_note": null,
    "default_locale": "bn",
    "verified": false,
    "published_at": "…",
    "updated_at": "…"
  }
]
```

Only published, non-deleted creators appear. Empty result = page not found / not published (there is no
separate 404 body).

### 2.2 Payment methods — `public_payment_methods`

```bash
curl -s "$SUPABASE_URL/rest/v1/public_payment_methods?creator_slug=eq.demo-teacher&order=sort_order.asc&select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

Columns: `id, creator_slug, kind, label, account_number, account_holder, bank_name, branch,
routing_number, qr_payload, qr_image_path, qr_status, qr_decoded, sort_order, updated_at`.
Only `enabled` methods of published creators appear.

- `account_number` is the creator's **own** account (fake/synthetic on the demo seed). Mask it in the
  UI by default and offer an explicit reveal/copy control.
- `qr_payload` is the creator's own static Bangla QR payload — public data, like a QR printed on a shop
  wall. To show an amount-specific QR, the client derives a dynamic payload from it with the vendored
  deshiQR engine (`withAmount`): payee fields stay verbatim, only amount/reference are derived and the
  checksum is recomputed. See [architecture.md §5](./architecture.md) and
  [github.com/hello2himel/deshiQR](https://github.com/hello2himel/deshiQR). "ইচ্ছেমতো" shows the
  static payload unchanged.
- `qr_decoded` is a public snapshot (`merchant_name`, `merchant_city`, `account_mask`, `institution`,
  `reference`, `kind`, `decoded_at`) so supporters can compare the payee name. It contains no secrets.

### 2.3 Self-reported claims — `public_support_claims`

```bash
curl -s "$SUPABASE_URL/rest/v1/public_support_claims?creator_slug=eq.demo-teacher&order=created_at.desc&select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

Only `unverified` and `confirmed` claims are visible. `hidden` and `rejected` claims are filtered by the
view itself. `txid` and `ip_hash` have no column here at all.

---

## 3. Write RPCs

Supabase exposes `POST /rest/v1/rpc/<function>` with a JSON body built from the function's argument
names. Responses are JSON (`jsonb` / scalar) or an error object for a failed call.

### 3.1 `is_slug_available(p_slug text) → boolean`

Onboarding availability check. `false` for invalid, reserved **or** taken slugs; it deliberately does
not reveal which. Rate-limit this at the edge if you expose it widely.

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/is_slug_available" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_slug":"fresh-page-name"}'
# → true
```

### 3.2 `submit_support_claim(...) → jsonb` (the "I sent it" claim)

Signature (data-model §8):

```text
p_slug text, p_amount numeric, p_name text, p_message text,
p_txid text, p_method_kind text, p_ip_hash text
```

All values are optional except `p_slug` and `p_amount`. The function:

1. requires the page to be **published** (otherwise `NOT_PUBLISHED`);
2. validates the self-reported amount (`৳1`–`৳100,000`), name (≤40), message (≤280),
   txid (4–64 of `A-Za-z0-9._-`), method kind (`bkash|nagad|rocket|bank|other`);
3. trims/collapses whitespace and normalises text server-side;
4. applies abuse rate limits (5/hour and 20/day per IP fingerprint, 100/day per creator) — triggers by
   `x-forwarded-for` when no pre-hashed `p_ip_hash` is supplied;
5. inserts the claim as `unverified` and returns **only** `{id, status, created_at}`.

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/submit_support_claim" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_slug": "demo-teacher",
    "p_amount": 50,
    "p_name": "ডেমো সমর্থক",
    "p_message": "শুভেচ্ছা রইল!",
    "p_txid": "DEMOTX0009",
    "p_method_kind": "bkash"
  }'
# → { "id": "…", "status": "unverified", "created_at": "…" }
```

Notes:

- The response **never includes `txid` or `ip_hash`**, and there is no `payment_status` field anywhere.
- `p_txid` is optional and private to the creator only (dashboard read); it is never public, exported or
  logged. Fake txids only in demos.
- `p_ip_hash` is an optional peppered sha256 (64 lowercase hex) supplied by a trusted edge proxy. A
  browser client should omit it; the database derives a private fingerprint from the request headers.
  It is never returned.
- This is a **message**, not a receipt. Copy must never read "payment successful", "verified payment" or
  "we'll inform the creator".

### 3.3 Owner RPCs (creator session JWT, not the anon key)

Use the user's Supabase session JWT as `Authorization: Bearer <user-access-token>`; RLS/scoping is
enforced inside the function (`creators.user_id = auth.uid()`).

| RPC | Body | Result |
|---|---|---|
| `review_support_claim(p_claim_id uuid, p_action text)` | `{"p_claim_id":"…","p_action":"confirm"}` | updated claim status/timestamps. Actions: `confirm` (unverified→confirmed), `hide` (unverified/confirmed→hidden), `restore` (hidden→unverified). A `rejected` claim is terminal: `CLAIM_REJECTED_TERMINAL`. |
| `creator_set_status(p_status text)` | `{"p_status":"published"}` | `{slug,status,published_at}`. `published`/`publish` requires ≥1 enabled method (`PUBLISH_NEEDS_METHOD`); `draft`/`unpublish` hides the page. `suspended` is refused (`SUSPENDED_ADMIN_ONLY`) — moderation only. |
| `creator_change_slug(p_slug text)` | `{"p_slug":"new-slug"}` | `{slug,last_slug_change_at}`. One change per 30 days (`SLUG_RATE_LIMITED`); old slug is quarantined for 90 days. |
| `creator_claim_counts()` | `{}` | rows of `creator_id, unverified, confirmed, hidden` for the caller's page(s). |
| `creator_reorder_payment_methods(p_ids uuid[])` | `{"p_ids":["…","…"]}` | **the only reorder path.** Atomically applies the supplied permutation (`sort_order` becomes 0..n-1 in array order). Requires the complete method set (1–8 unique ids, all owned by the caller); errors `BAD_ORDER` / `FORBIDDEN` / `AUTH_REQUIRED` / `CREATOR_NOT_FOUND` / `CREATOR_DELETED`. |

Owner profile/payment-method edits are plain table writes under RLS (`creators`, `payment_methods`) —
see [architecture.md §6](./architecture.md). Claims have **no** direct write path: only the review RPC
or service-role moderation SQL.

Direct-write contract details that match the SQL:

- `creators` INSERT **may** include `user_id`, but RLS requires it to equal `auth.uid()`; omitting it uses
  the `auth.uid()` default. `status` is not settable on insert (default `draft`).
- `creators` UPDATE accepts profile fields only, plus the self-service delete (`deleted_at = now()`, with
  `status = 'suspended'`). The guard trigger forces the suspended state, quarantines the slug, and makes
  deletion final for the owner; restoring a deleted page is moderation-only. Any other direct `status`
  write is refused (`STATUS_RPC_ONLY`) — use `creator_set_status`.
- `payment_methods` INSERT/UPDATE accepts the full method object; `creator_id` is immutable (the guard
  trigger refuses a reassignment even though the column is sent) and `verified` QR status still has to
  satisfy the payload/decoded checks.
- `sort_order` is unique per creator. **Do not reorder with per-row updates** — use the
  `creator_reorder_payment_methods(p_ids uuid[])` RPC, which applies the whole permutation atomically
  (the unique constraint is deferred to commit so a swap can never collide mid-update).

---

## 4. Error codes

Domain errors are raised with a stable machine code at the start of the Postgres message, e.g.
`NOT_PUBLISHED: no published creator for that page`. PostgREST returns HTTP 400 (or 403 for permission
errors) and a body like:

```json
{ "code": "P0001", "message": "NOT_PUBLISHED: no published creator for that page", "details": null, "hint": null }
```

Map them to friendly Bangla/English copy (never render the raw message) using the **code string**, not
the SQLSTATE.

| Code | Meaning | Friendly copy (bn / en) |
|---|---|---|
| `SLUG_TAKEN` | slug already used by another page | এই নামটি ইতিমধ্যে নেওয়া হয়েছে / This name is already taken |
| `SLUG_RESERVED` | route/brand/provider name or 90-day quarantine | এই নামটি সংরক্ষিত / This name is reserved |
| `SLUG_INVALID` | fails lowercase/3–30/regex rules | নামটি ৩–৩০ অক্ষরের, ছোট হাতের অক্ষর ও হাইফেন দিয়ে হতে হবে / Use 3–30 lowercase letters with hyphens |
| `SLUG_RATE_LIMITED` | slug changed in the last 30 days | ৩০ দিনে একবারই ঠিকানা বদলানো যায় / You can change your address once every 30 days |
| `RATE_LIMITED` | claim submission rate limit hit (IP or page) | অনেকবার পাঠানো হয়েছে, একটু পরে চেষ্টা করুন / Too many attempts, try again later |
| `CLAIM_TOO_LARGE` | amount > ৳100,000 | সর্বোচ্চ ৳১,০০,০০০ পর্যন্ত / Up to ৳100,000 |
| `CLAIM_AMOUNT_INVALID` | amount missing or < ৳1 | কমপক্ষে ৳১ দিন / Enter at least ৳1 |
| `NAME_TOO_LONG` | supporter name > 40 chars | নাম ৪০ অক্ষরের মধ্যে দিন / Name must be 40 characters or fewer |
| `MESSAGE_TOO_LONG` | message > 280 chars | বার্তা ২৮০ অক্ষরের মধ্যে দিন / Message must be 280 characters or fewer |
| `TXID_INVALID` | txid not 4–64 of `A-Za-z0-9._-` | ট্রানজেকশন আইডি ঠিক নয় / That transaction id looks invalid |
| `METHOD_KIND_INVALID` | unknown payment kind | পেমেন্ট মাধ্যম ঠিক নয় / Unknown payment method |
| `NOT_PUBLISHED` | page missing, draft, suspended or deleted | পেজটি এখন প্রকাশিত নয় / This page isn't published |
| `PUBLISH_NEEDS_METHOD` | publish attempted with no enabled method | আগে অন্তত একটি পেমেন্ট মাধ্যম যোগ করুন / Add at least one payment method first |
| `AUTH_REQUIRED` | owner RPC called while signed out | লগইন করুন / Sign in to continue |
| `CREATOR_NOT_FOUND` | signed-in user has no page yet | আগে একটি পেজ তৈরি করুন / Create a page first |
| `CREATOR_DELETED` | page is soft-deleted | পেজটি মুছে ফেলা হয়েছে / This page has been deleted |
| `SUSPENDED_ADMIN_ONLY` | owner tried to set `suspended` | এটি চানাস্তা টিমের কাজ / Only Chanasta can suspend a page |
| `STATUS_INVALID` | unknown status value | — internal / developer-facing |
| `CLAIM_NOT_FOUND` | claim not owned by caller / doesn't exist | দাবিটি পাওয়া যায়নি / Claim not found |
| `CLAIM_ACTION_INVALID` | action not confirm/hide/restore | — internal / developer-facing |
| `CLAIM_INVALID_TRANSITION` | e.g. confirm a hidden claim | এই অবস্থায় এটি করা যায় না / That action isn't available in this state |
| `CLAIM_REJECTED_TERMINAL` | moderation rejected the claim | এটি আর ফেরানো যাবে না / This claim can no longer be restored |
| `BAD_ORDER` | reorder ids are empty/duplicated/incomplete/too many | — internal / developer-facing |
| `FORBIDDEN` | reorder includes a method that isn't yours | — internal / developer-facing |
| `PAYMENT_METHOD_LIMIT` | more than 8 enabled methods | সর্বোচ্চ ৮টি পেমেন্ট মাধ্যম / Up to 8 payment methods |
| `SOCIALS_INVALID` | socials not an object / too many valid keys | — internal / developer-facing |
| `ADMIN_ONLY_FIELD` | owner tried to write a server-managed column | — internal / developer-facing |
| `STATUS_RPC_ONLY` | owner wrote `status` directly | — internal / developer-facing |

---

## 5. Embedding a creator page

Three ways, in increasing levels of involvement (see [`examples/`](../examples/)):

1. **Link** — share `https://<origin>/@demo-teacher`. No API knowledge needed.
2. **Iframe** — the app serves a compact, chrome-free card at `https://<origin>/embed/@demo-teacher`
   which is explicitly allowed to be framed (`frame-ancestors *` only on `/embed/*`).

```html
<iframe
  src="https://chanasta.example/embed/@demo-teacher"
  title="চানাস্তা — ডেমো শিক্ষক (DEMO Teacher)"
  width="100%" height="620" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"
  style="border:1px solid #e6dccd; border-radius:20px; max-width:420px"
></iframe>
```

3. **Widget** — a tiny optional script (no framework, no tracking) that opens the same embed URL in an
   accessible modal. See [`examples/embed-widget.js`](../examples/embed-widget.js).

URL rules:

| URL | Meaning |
|---|---|
| `/@<slug>` | canonical creator page (UI) |
| `/embed/@<slug>` | iframe-friendly card; no site nav |
| `#/@<slug>` or `?c=<slug>` | hash/query fallbacks for static hosts without rewrites |
| `/chanasta/@<slug>` | GitHub Pages build with `CHANASTA_BASE=/chanasta/` |

The iframe origin is configurable in the examples (query string / data attribute) so the same snippet
works against your own deployment. All examples use the **synthetic demo creators only**.

---

## 6. CORS, auth and RLS notes

- **CORS:** Supabase's REST endpoint allows browser origins; you do not need a proxy for public reads or
  for `submit_support_claim`. Static hosts (Netlify/Pages) only serve the app; the browser talks to
  Supabase directly.
- **Keys:** the `anon` key is public by design and is the only key allowed in the client. The
  `service_role` key bypasses RLS and must never ship to a browser, static bundle, CI log, or example.
- **RLS:** base tables have RLS enabled. `anon` has zero direct access; public reads go through the
  `public_*` views; owner reads/writes are scoped by `auth.uid()`. Claims can only be inserted by the
  SECURITY DEFINER RPC, and reviewed only by the owning creator (or service-role moderation SQL).
- **No client-side trust:** amounts, text lengths, slug rules, rate limits and publish checks are all
  validated in Postgres — the client checks are only for UX.
- **Rate limits** live in the database (`chanasta.rate_limits`): 5 claims/hour and 20/day per IP
  fingerprint, 100/day per creator. See [self-hosting.md](./self-hosting.md) for tuning and housekeeping.
- **Auth for owners:** magic-link email OTP via Supabase Auth; redirect URLs must be allow-listed in the
  Supabase dashboard (see self-hosting). Public pages work entirely signed-out.
- **Logging:** do not log request bodies for `submit_support_claim` (they may contain an optional private
  txid). The RPC never returns it.

## 7. The boundary (please copy this into your integration)

> Chanasta is a public page tool, not a payment processor. It does not hold, route, confirm, refund or
> guarantee money. Supporters send money from their own app directly to the creator's own account;
> claims are self-reported messages and may be hidden or removed. For payment problems, contact your
> payment provider. See `/legal/terms`, `/legal/privacy` and [compliance.md](./compliance.md).

If an integration needs to *know* whether money moved, this is the wrong API — no such endpoint exists or
will be added in MVP. The only record is the creator's own provider app.

**Abuse / impersonation reports** go to **hello2himel@proton.me** with the page URL (the app's report
link prefills it). Review is **best-effort within 72 hours during beta**, not a guarantee; there is no
admin UI in MVP — moderation happens through the service-role runbook in
[moderation.md](./moderation.md).
