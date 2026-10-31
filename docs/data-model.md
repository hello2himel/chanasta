# Chanasta — Data Model

**Status:** Phase 1 · implementation-ready · Postgres 15+ (Supabase)
**Owner:** product-architect · **Last updated:** 2026-11-01
**Companion docs:** [blueprint.md](./blueprint.md) · [compliance.md](./compliance.md) · [brand-copy.md](./brand-copy.md)
**Binding decisions:** [decisions.md](./decisions.md) — resolves the open items carried in §13; where it differs, decisions.md wins.

This document is meant to be converted **directly** into `supabase/schema.sql` (single idempotent migration, plus a small seed). Everything below is normative unless marked *optional* or *later*. Column lists are the contract UI/UX and engineering build against.

---

## 0. Conventions and invariants

| Rule | Detail |
|---|---|
| Database | PostgreSQL on Supabase (confirm with Lead — blueprint §14). Migrations owned by engineering; no client-side DDL. |
| IDs | `uuid` primary keys, `gen_random_uuid()` (pgcrypto is built into Supabase Postgres). Public URLs use **slugs**, never raw IDs, except claim IDs in the thanks URL (unforgeable enough, see §6). |
| Money | `numeric(10,2)`, BDT. **Only one money column exists in the whole schema:** `support_claims.amount_bdt`, and it is a *self-reported number*, not a ledger entry. There are no balances, wallets, payouts or transactions tables — by design. |
| Time | `timestamptz`, stored UTC, displayed in Asia/Dhaka. `created_at`/`updated_at` on every table; `updated_at` maintained by a trigger. |
| Text | `text` + `CHECK (length(...) <= n)`, `btrim()`-normalised server-side. No HTML: all user text is plain text (render escaped). |
| Identity | `creators.user_id → auth.users(id)`. Never expose `user_id`, emails or auth data in public views. |
| Public read | **Only through `public.*` views** (owner-rights, filter columns and rows). No anon `SELECT` on base tables. |
| Writes | Owner writes own rows (RLS). Supporter claims are inserted **only** through a `SECURITY DEFINER` RPC. No direct anon inserts. |
| Secrets | `txid`, `ip_hash` and all auth columns are **never** public. |
| Deletion | Soft delete creator (`deleted_at`) then hard purge; see §11. |
| Repo data | No real personal data anywhere. Seed/demo rows are synthetic and labelled DEMO. |

---

## 1. Entity map

```
auth.users 1──1 creators 1──* payment_methods
                     │
                     └──* support_claims ──0..1 payment_methods (snapshot reference)

reserved_slugs        (slug text PK, reason text)      -- validation support
public_creators       (view)  → published, non-deleted creators, public columns only
public_payment_methods(view)  → enabled methods of published creators
public_support_claims (view)  → unverified|confirmed claims of published creators
public_creator_support_totals (view) → self-reported aggregates per published creator
```

No table stores money movement, balances, payouts, followers, likes or session data. That is a feature.

---

## 2. Enums

```sql
CREATE TYPE creator_status   AS ENUM ('draft', 'published', 'suspended');
CREATE TYPE payment_kind     AS ENUM ('bkash', 'nagad', 'rocket', 'bank', 'other');
CREATE TYPE payment_qr_status AS ENUM ('none', 'verified', 'unverified', 'image_only');
CREATE TYPE claim_status     AS ENUM ('unverified', 'confirmed', 'hidden', 'rejected');
```

Notes:
- `payment_qr_status.verified` can **only** be set by the server after a real deshiQR decode with valid checksum for a bKash-issued NPSB payload. A creator cannot self-assign it.
- `claim_status.rejected` never appears in public views; `hidden` is creator-controlled; `rejected` is moderation-only and terminal.

---

## 3. `creators`

The creator's public page + private account preferences.

| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `user_id` | uuid | no | — | `REFERENCES auth.users(id) ON DELETE CASCADE`, **unique** (one page per account in MVP) |
| `slug` | text | no | — | **unique**; lowercase; format rules §5; not reserved (trigger) |
| `display_name` | text | no | — | 1–60 chars, no newlines, trimmed |
| `tagline` | text | yes | null | ≤80 chars, single line |
| `bio` | text | yes | null | ≤600 chars, plain text |
| `avatar_emoji` | text | no | `'☕'` | 1 grapheme cluster, ≤8 bytes (`char_length(avatar_emoji) BETWEEN 1 AND 4` acceptable) |
| `avatar_url` | text | yes | null | *optional*, storage path; MVP: emoji only, keep column for later |
| `socials` | jsonb | no | `'{}'` | allowlisted keys only; each value ≤200 chars; ≤6 keys; URLs must be `https://`; see §3.1 |
| `goal_amount_bdt` | numeric(10,2) | yes | null | `> 0 AND <= 1000000`; **reserved — no goal/progress UI in MVP** (Lead decision #5) |
| `goal_note` | text | yes | null | ≤120 chars, plain text |
| `default_locale` | text | no | `'bn'` | `CHECK (default_locale IN ('bn','en'))` |
| `status` | creator_status | no | `'draft'` | published/draft/suspended |
| `verified` | boolean | no | false | identity verified by Chanasta team; **never purchasable**, no self-serve write path (service role only) |
| `verified_at` | timestamptz | yes | null | set when `verified` flips true |
| `published_at` | timestamptz | yes | null | set on first publish |
| `last_slug_change_at` | timestamptz | yes | null | slug change rate limit (max 1 per 30 days; enforce in RPC/policy) |
| `deleted_at` | timestamptz | yes | null | soft delete; public views exclude non-null |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | trigger |

**Column-level rules**
- `status = 'published'` requires `published_at` non-null and at least one enabled payment method at the application layer (DB check not possible cross-table; enforce in the publish RPC and/or trigger).
- `verified = true` requires `verified_at` non-null (CHECK).
- `deleted_at IS NULL` is required for public visibility; the row stays until purge.

**3.1 `socials` allowlist (validated in RPC/trigger, not just JSON)**
`youtube`, `facebook`, `instagram`, `tiktok`, `x`, `threads`, `telegram`, `linkedin`, `website`. Keys outside the list are dropped; values normalised; `website` may be any `https://` host, platform keys should point at that platform (soft validation; display is what matters). Never allow `email`/phone in `socials` (contact details go in payment methods, and we do not collect creator emails publicly). **Max 6 keys.**

**Indexes**
```sql
CREATE UNIQUE INDEX creators_slug_key  ON creators (slug);            -- lower(slug) not needed: slug is constrained lowercase
CREATE UNIQUE INDEX creators_user_key  ON creators (user_id);
CREATE INDEX creators_published_idx    ON creators (published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;
```

---

## 4. `payment_methods`

The creator's own ways to receive money. One row per method; max 8 enabled rows per creator (trigger/app-enforced).

| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `creator_id` | uuid | no | — | `REFERENCES creators(id) ON DELETE CASCADE` |
| `kind` | payment_kind | no | — | `bkash/nagad/rocket/bank/other` |
| `label` | text | no | — | 1–40 chars, plain; e.g. "ব্যক্তিগত বিকাশ", "Bank (DBBL)" |
| `account_number` | text | yes | null | 6–34 chars, digits/space/hyphen; **full value stored** (supporter needs it), masked in UI |
| `account_holder` | text | yes | null | ≤60 chars (bank account name; also useful for MFS mismatch check) |
| `bank_name` | text | yes | null | ≤60 chars; required when `kind='bank'` |
| `branch` | text | yes | null | ≤60 chars |
| `routing_number` | text | yes | null | 6–9 digits; required when `kind='bank'` |
| `qr_payload` | text | yes | null | ≤1024 chars; the creator's **base static** Bangla QR payload (public data). Amount-derived dynamic copies are generated at render time with `withAmount` and are **never stored**. |
| `qr_image_path` | text | yes | null | storage path, ≤512; only for image-only QR uploads |
| `qr_status` | payment_qr_status | no | `'none'` | server-set; `verified` only after successful decode+checksum (§4.1) |
| `qr_decoded` | jsonb | yes | null | snapshot: `{merchant_name, merchant_city, account_mask, institution, reference, kind, decoded_at}` — **no secrets**; used to render "QR info" and detect tampering |
| `sort_order` | smallint | no | 0 | `BETWEEN 0 AND 99`; unique per creator (see index) |
| `enabled` | boolean | no | true | disabled rows stay for history but are not public |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | trigger |

**CHECK constraints (exact)**
```sql
-- Every method must carry at least one way to pay:
CHECK (account_number IS NOT NULL OR qr_payload IS NOT NULL OR qr_image_path IS NOT NULL)

-- Bank rows need the bank fields, non-bank rows must not carry them:
CHECK (
  (kind = 'bank' AND bank_name IS NOT NULL AND routing_number IS NOT NULL)
  OR (kind <> 'bank' AND bank_name IS NULL AND routing_number IS NULL)
)

-- QR status must match the stored evidence:
CHECK (qr_status <> 'verified'   OR (qr_payload IS NOT NULL AND qr_decoded IS NOT NULL))
CHECK (qr_status <> 'unverified' OR qr_payload IS NOT NULL)
CHECK (qr_status <> 'image_only' OR (qr_image_path IS NOT NULL AND qr_payload IS NULL))
CHECK (qr_status <> 'none'       OR (qr_payload IS NULL AND qr_image_path IS NULL))

-- Lenient sanity on amounts of text:
CHECK (char_length(account_number) BETWEEN 6 AND 34)
CHECK (char_length(label) BETWEEN 1 AND 40)
```

**4.1 Decode-verification semantics (important)**

`qr_status = 'verified'` means **all** of:
1. The payload parses as TLV with a valid CRC-16 checksum (`deshiQR.verifyChecksum`).
2. `deshiQR.decode()` returns merchant + institution fields without error.
3. `institutionOf(decoded)?.verified === true` — today that means the NPSB Bangla QR scheme (`bd.org.bb.npsb`), which is what bKash issues. Update this when deshiQR's test suite gains real Nagad/Rocket/bank payloads.

It does **not** mean money moved, the creator owns the account, or Chanasta endorses the payee. `qr_decoded.merchant_name` is displayed next to the QR so supporters can compare it.

**Indexes**
```sql
CREATE INDEX payment_methods_creator_idx ON payment_methods (creator_id, sort_order)
  WHERE enabled;
CREATE UNIQUE INDEX payment_methods_sort_key ON payment_methods (creator_id, sort_order);
```

---

## 5. `support_claims`

The supporter's **self-reported** "I sent it" note. Not a receipt, not a transaction, not proof.

| Column | Type | Null | Default | Constraints / notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK; used in `/@slug/thanks` claim link |
| `creator_id` | uuid | no | — | `REFERENCES creators(id) ON DELETE CASCADE` |
| `amount_bdt` | numeric(10,2) | no | — | `>= 1 AND <= 100000` (product guard; Lead to confirm cap, blueprint §14) |
| `payment_method_id` | uuid | yes | null | `REFERENCES payment_methods(id) ON DELETE SET NULL`; optional context only |
| `method_kind` | payment_kind | yes | null | snapshot for display; survives method deletion |
| `supporter_name` | text | yes | null | ≤40 chars, plain; null = show "একজন শুভানুধ্যায়ী / A well-wisher" |
| `message` | text | yes | null | ≤280 chars, plain text, newline-collapsed |
| `txid` | text | yes | null | ≤64 chars; **PRIVATE — never in any public view, API response, export or request log** |
| `status` | claim_status | no | `'unverified'` | state machine §7 |
| `ip_hash` | text | yes | null | hex `sha256` of a peppered IP (salt + IP); abuse/rate limit only; **private**; purged §11 |
| `confirmed_at` | timestamptz | yes | null | set when status → confirmed |
| `hidden_at` | timestamptz | yes | null | set when status → hidden |
| `rejected_at` | timestamptz | yes | null | set when status → rejected |
| `moderated_by` | uuid | yes | null | `REFERENCES auth.users(id) ON DELETE SET NULL`; service-role moderation only |
| `created_at` | timestamptz | no | `now()` | public (date only in UI; full timestamp can be shown) |
| `updated_at` | timestamptz | no | `now()` | trigger |

**Invariant:** the only source of truth for a claim is the supporter's statement; the creator's `confirmed` flag is *also* human action, so both statuses are still non-Chanasta verification. The UI must never reduce this to "paid".

**Indexes**
```sql
CREATE INDEX support_claims_creator_idx ON support_claims (creator_id, created_at DESC)
  WHERE status IN ('unverified','confirmed');
CREATE INDEX support_claims_moderation_idx ON support_claims (status) WHERE status IN ('hidden','rejected');
CREATE INDEX support_claims_rate_idx ON support_claims (ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;
CREATE INDEX support_claims_txid_idx ON support_claims (creator_id, lower(txid)) WHERE txid IS NOT NULL; -- duplicate detection, NOT unique
```

No unique constraint on `txid`: the same provider transaction ID may legitimately be re-submitted, and false claims are a moderation signal, not a DB error. Surface duplicate-txid claims in the dashboard as a soft warning.

---

## 6. `reserved_slugs` (+ slug rules)

Reserved names protect routes, brands and impersonation targets.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `slug` | text | no | — | PK; lowercase |
| `reason` | text | no | — | one of `route`, `brand`, `provider`, `abuse`, `system` (free text ≤120) |
| `created_at` | timestamptz | no | `now()` | |

Seed ~40 reserved slugs (extend freely; changes are migration-only):
- **Routes/system:** `admin`, `api`, `app`, `auth`, `dashboard`, `login`, `logout`, `signup`, `signin`, `onboarding`, `new`, `settings`, `support`, `help`, `legal`, `terms`, `privacy`, `docs`, `dev`, `blog`, `explore`, `embed`, `assets`, `static`, `health`, `status`, `about`, `contact`, `null`, `undefined`, `root`, `system`, `mail`, `www`, `test`, `demo`.
- **Brand/provider (impersonation):** `chanasta`, `chanasta-bd`, `bkash`, `nagad`, `rocket`, `upay`, `bangladesh-bank`, `bb`, `npsb`, `banglaqr`, `bank`.
- **Abuse-prone:** `official`, `verify`, `verified`, `security`, `donate`, `fund`, `foundation`, `charity`, `helpdesk`, `refund`.

**Slug validation (trigger `creators_validate_slug()` before insert/update of `slug`)**
1. `slug = lower(slug)` (reject uppercase rather than silently lowercasing).
2. Length 3–30 characters.
3. Regex `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` — starts with a letter, ends alphanumeric, no `--`, no leading/trailing hyphen, no underscore, no dots.
4. Not all digits (implied by rule 3).
5. Not in `reserved_slugs` (case-insensitive exact match).
6. Unique (DB index) — return a friendly `SLUG_TAKEN` error from the API, and `SLUG_RESERVED` for reserved; never reveal which claim.
7. Slug changes: max 1 per 30 days (`last_slug_change_at`), and the old slug is **not** auto-reserved — but suggest quarantining the previous slug for 90 days for anti-impersonation (implementation detail, §11).

**Availability check** (used by onboarding): RPC `public.is_slug_available(p_slug text) returns boolean` — returns false for invalid/reserved/taken; does not reveal the reason. Rate-limit per IP at the edge.

---

## 7. Claim state machine

```text
                 (supporter submits via RPC)
                              │
                              ▼
                         ┌───────────┐
        creator confirms │ unverified│  creator/admin hides
        ────────────────▶│  (public) │──────────────────────▶┌────────┐
                         └───────────┘                       │ hidden │ (not public)
                              │                              └────────┘
                       creator │                                   │
                     hides   ▼                                     │ creator restores
                         ┌───────────┐                             │
                         │ confirmed │─────────────────────────────┘
                         │  (public) │  creator hides
                         └───────────┘
                                     
        admin/moderator rejects (from unverified, confirmed or hidden)
                              │
                              ▼
                         ┌───────────┐
                         │ rejected  │  terminal — not public, no restore by creator
                         └───────────┘
```

| From | Action | To | Who | Sets |
|---|---|---|---|---|
| — (insert) | submit | `unverified` | anonymous supporter (RPC, rate-limited) | `created_at` |
| `unverified` | confirm | `confirmed` | owner creator | `confirmed_at` |
| `unverified` | hide | `hidden` | owner creator | `hidden_at` |
| `confirmed` | hide | `hidden` | owner creator | `hidden_at`, `confirmed_at` retained |
| `hidden` | restore | `unverified` | owner creator | `hidden_at` cleared, `confirmed_at` cleared (restore means back to self-reported) |
| `unverified`/`confirmed`/`hidden` | reject | `rejected` | moderator (service role) | `rejected_at`, `moderated_by` |
| `rejected` | — | — | — | terminal; row may be purged by retention |

Transitions are enforced by RPC `public.review_support_claim(p_claim_id uuid, p_action text)`; direct `UPDATE` from clients is not allowed (only `EXECUTE` on the RPC). Timestamps are maintained by the RPC, not by hand.

**Public visibility:** only `unverified` and `confirmed` are visible (in `public_support_claims`), plus `hidden` only to the owner in the dashboard. `rejected` is visible only to moderation.

---

## 8. RPCs / functions (the only write paths beyond owner tables)

All RPCs: `SECURITY DEFINER`, `SET search_path = public, pg_temp`, explicit `GRANT`/`REVOKE`, return `jsonb` or a small row; validate input and raise SQLSTATE with a machine code (`SLUG_TAKEN`, `RATE_LIMITED`, `CLAIM_TOO_LARGE`, …).

| Function | Caller | Purpose |
|---|---|---|
| `public.is_slug_available(p_slug text) returns boolean` | anon | onboarding availability check |
| `public.submit_support_claim(p_slug text, p_amount numeric, p_name text, p_message text, p_txid text, p_method_kind text, p_ip_hash text) returns jsonb` | anon | validate creator published; sanitise/limit; rate-limit; insert `unverified`; return `{id, status, created_at}` — **never returns txid** |
| `public.review_support_claim(p_claim_id uuid, p_action text) returns jsonb` | authenticated owner | `confirm` / `hide` / `restore`; ownership checked via `creators.user_id = auth.uid()`; invalid transitions raise |
| `public.creator_set_status(p_status text) returns jsonb` | authenticated owner | `publish` / `unpublish`; requires ≥1 enabled payment method; sets `published_at` on first publish; cannot set `suspended` (service role only) |
| `public.creator_change_slug(p_slug text) returns jsonb` | authenticated owner | validates slug rules + reserved list; enforces one change per 30 days via `last_slug_change_at`; returns the new slug or `SLUG_TAKEN`/`SLUG_RESERVED`/`SLUG_RATE_LIMITED` |
| `public.creator_claim_counts() returns table(creator_id uuid, unverified int, confirmed int, hidden int)` | authenticated owner | dashboard badge (or use a view; keep one source) |
| `public.touch_updated_at() returns trigger` | trigger | sets `updated_at = now()` |
| `public.creators_validate_slug() returns trigger` | trigger | slug rules + reserved check |
| `public.enforce_payment_method_limit() returns trigger` | trigger | ≤8 rows per creator, unique sort order |
| `public.purge_expired_claim_pii() returns void` | cron/service role | nulls `ip_hash` after 30 days, purges `rejected` after 90 days |

**Rate limits (in `submit_support_claim`)**
- Per `ip_hash`: max **5 claims / hour** and **20 claims / 24h** across all creators → `RATE_LIMITED`.
- Per creator: max **100 claims / 24h** (burst protection) → `RATE_LIMITED`.
- Per supporter form: max 3 submissions per page-load token (edge-layer soft limit, UX only).
- No account, no cookies required; IP hash is salted (`SUPPORT_CLAIM_PEPPER` env), hex, never returned.
- Document in ToS that anonymous claims are rate-limited and may be removed.

---

## 9. Public views (the only anon-readable surfaces)

All views are owner-rights (`security_invoker = false`), `security_barrier = true`, owned by the migration role; `GRANT SELECT TO anon, authenticated`. They filter rows **and** columns; base tables are not anon-readable.

### `public_creators`
| Column | Source |
|---|---|
| `slug`, `display_name`, `tagline`, `bio`, `avatar_emoji`, `socials`, `goal_amount_bdt`, `goal_note`, `default_locale`, `verified`, `published_at`, `updated_at` | `creators` |

`WHERE status = 'published' AND deleted_at IS NULL`. **Never** expose `user_id`, `id`, `status`, `verified_at`, `deleted_at`, `last_slug_change_at`.

### `public_payment_methods`
| Column | Source |
|---|---|
| `id`, `creator_slug`, `kind`, `label`, `account_number`, `account_holder`, `bank_name`, `branch`, `routing_number`, `qr_payload`, `qr_image_path`, `qr_status`, `qr_decoded`, `sort_order` | `payment_methods` joined to published creators |

`WHERE enabled = true`. Account numbers are intentionally public (they are the payee address); the UI masks them by default with a reveal. Never expose `creator_id` or timestamps beyond `updated_at` (include `updated_at` as "last updated" if useful).

### `public_support_claims`
| Column | Source |
|---|---|
| `id`, `creator_slug`, `amount_bdt`, `supporter_name`, `message`, `method_kind`, `status`, `created_at` | `support_claims` joined to published creators |

`WHERE status IN ('unverified','confirmed')`. **Never** expose `txid`, `ip_hash`, `payment_method_id`, `creator_id`, `moderated_by`, or timestamps other than `created_at`.

### `public_creator_support_totals` (*reserved — not used in MVP; no goal/progress UI*)
`creator_slug, visible_claim_count, self_reported_total_bdt` over visible claims. If ever enabled, the label must read **"স্ব-ঘোষিত সমর্থন / self-reported support"**; it is a sum of messages, not money received. Do not call it "raised".

### RLS intent (per table)

| Table | anon | authenticated (owner) | service role / admin |
|---|---|---|---|
| `creators` | no direct access; read via `public_creators` | `SELECT`/`INSERT`/`UPDATE` where `user_id = auth.uid()`; no `DELETE` (soft-delete only); cannot set `verified`, `verified_at`, `status='suspended'` | full |
| `payment_methods` | no direct access; read via `public_payment_methods` | full CRUD on rows whose creator belongs to `auth.uid()` | full |
| `support_claims` | **no** `SELECT`/`INSERT`/`UPDATE`/`DELETE`; insert only through RPC | `SELECT` claims of own creators; `UPDATE` only via `review_support_claim` RPC (no direct writes) | full |
| `reserved_slugs` | no access (checked inside trigger/function) | no access | full |
| `public_*` views | `SELECT` granted | `SELECT` granted | owner of views |

**Column-level hardening**
- Owner `UPDATE` policies use `WITH CHECK` so owners cannot change `creator_id`, cannot set `verified=true`, cannot change `slug` outside the RPC (slug change goes through RPC to apply rate limit + validations consistently), and cannot write `support_claims` rows directly.
- The publish/unpublish action is an RPC (`creator_set_status(p_status text)`) so "must have an enabled payment method" can be enforced atomically.
- Views are created in the migration and explicitly granted; Supabase default `public` schema grants are revoked for base tables.

---

## 10. Visibility matrix

| Data | Public (`anon`) | Creator (owner) | Admin / service role |
|---|---|---|---|
| display name, tagline, bio, emoji, socials, published flag | ✅ (published only) | ✅ own | ✅ |
| goal amount/note | ✅ (if set) | ✅ own | ✅ |
| payment method label/account/bank/QR/`qr_status`/decoded snapshot | ✅ (enabled + published only) | ✅ own, incl. disabled | ✅ |
| `qr_image_path` | ✅ (public URL, if image-only) | ✅ | ✅ |
| claims: amount, name, message, method_kind, created_at, status | ✅ only `unverified`/`confirmed` | ✅ all statuses for own creators | ✅ |
| `txid` | ❌ never | ✅ own (dashboard only) | ✅ |
| `ip_hash` | ❌ never | ❌ never (not needed to run a page) | ✅ (abuse tooling only) |
| email, `user_id`, auth metadata | ❌ never | own email via Supabase auth only | ✅ |
| proof of payment / money ledger | ❌ does not exist | ❌ does not exist | ❌ does not exist |

---

## 11. Retention & deletion

| Rule | Detail |
|---|---|
| Creator soft delete | `deleted_at = now()`, `status = 'suspended'`; page 404s immediately; public views exclude it |
| Slug quarantine | On delete or slug change, previous slug is **reserved for 90 days** (anti-impersonation). Implementation: insert into `reserved_slugs` with reason `'abuse'`/`'system'` and purge via cron. |
| Creator hard purge | 30 days after `deleted_at`: delete row; `payment_methods` and `support_claims` cascade. Backups expire within provider's window (Supabase: note in privacy policy; verify current backup retention). |
| Claims | Live while page lives. Creator can hide any claim (row retained for moderation). `rejected` rows purged after 90 days. |
| PII minimisation | `ip_hash` nulled 30 days after `created_at` (cron). `txid` deleted with its claim; never public; creator may request purge of a claim. |
| Supports/errata | No supporter account history exists; a supporter can ask the creator to hide a claim (creator control), or use the report route. |
| Export | Creator can export own claims (CSV; **never includes `txid` or `ip_hash`**) via dashboard; no bulk export of other people's data. |
| Backup/DR | Restore drills never reintroduce purged PII; deletion runbook documented by engineering. |

---

## 12. Seed / demo data shape (synthetic only, for `supabase/seed.sql`)

- Creator: `@demo-teacher`, `display_name = 'ডেমো শিক্ষক'`, `status='published'`, `verified=false`, bio mentions it's a demo, no real person.
- Payment method: `kind='bkash'`, `label='ডেমো বিকাশ (যাচাই করা QR)'`, `qr_payload` = deshiQR's **synthetic demo payload** (fake merchant, fake account `01000000000`), `qr_status='verified'` only if it actually decodes+checksums in CI; otherwise seed with a known-valid synthetic payload.
- Payment method: `kind='bank'`, clearly fake bank + account `0000000000000`, label "Demo bank".
- 3 support claims: one `unverified` (৳50, message in Bangla), one `confirmed` (৳100), one `hidden` (৳20) to prove public filtering. Fictional supporter names only.
- No real phone numbers, no real transaction IDs, no real people. Every demo page must visibly say **ডেমো / DEMO**.

---

## 13. Conversion checklist → `supabase/schema.sql`

1. Extensions: `pgcrypto` (uuid), `citext` only if needed (avoid; use lowercase text checks).
2. Enums (§2) — `CREATE TYPE ...` guarded by `DO $$ ... EXCEPTION WHEN duplicate_object`.
3. Tables in order: `reserved_slugs` → `creators` → `payment_methods` → `support_claims`; `CREATE TABLE IF NOT EXISTS`; `CHECK` constraints inline.
4. Trigger functions: `touch_updated_at`, `creators_validate_slug`, `enforce_payment_method_limit`; attach triggers.
5. Indexes (§3–§5, `CREATE INDEX IF NOT EXISTS`).
6. RPCs (§8) with pinned `search_path`, explicit grants; revoke default `public` execute.
7. Views (§9) with `security_barrier`; revoke `public` select on base tables; grant only views to `anon`/`authenticated`.
8. RLS: `ENABLE ROW LEVEL SECURITY` on all four tables; policies per §9; `FORCE ROW LEVEL SECURITY` where appropriate (service role bypasses).
9. Seed reserved slugs (static list) + synthetic demo rows (separate `seed.sql`; never in migrations).
10. SQL test (pglite or Supabase test DB) proving: anon cannot select base tables; public views filter unpublished/hidden; reserved slug rejected; verified QR status not settable by owner; rate limit raises; claim transitions valid/invalid; cascade + retention runbook functions exist.

**Resolved by the Lead in [decisions.md](./decisions.md):** Supabase is the backend of record (with a local demo mode when env vars are absent); `verified` flag ships but no badge in MVP; goal columns reserved with no goal UI; claim cap ৳1–৳100,000; no admin UI (service-role SQL runbook); dashboard-only notifications; slug quarantine 90 days after delete. Do not re-litigate these in implementation.
