-- ============================================================================
-- Chanasta — Supabase schema (single, idempotent migration)
-- ============================================================================
--
-- Apply with the Supabase CLI (`supabase db push`), `psql`, or by pasting this
-- file into the Supabase SQL editor. Re-running it is safe: every object uses
-- `if not exists` / `create or replace` / `drop ... if exists` first.
--
-- WHAT THIS SCHEMA IS (read before changing anything)
-- ---------------------------------------------------
-- Chanasta is NOT a payment processor and never holds funds. There is no
-- ledger, wallet, balance, payout, escrow, transaction or confirmation table
-- anywhere in this file — by design. The only money-shaped column in the whole
-- schema is `support_claims.amount_bdt`: a *self-reported* number typed by a
-- supporter ("I sent ৳50"), not a record of money movement.
--
-- Money moves inside the supporter's own bKash / Nagad / Rocket / bank app,
-- directly to the creator's own account. This database stores (a) the creator's
-- own public profile and payment details, and (b) self-reported messages. If a
-- future change makes the app hold, route, confirm, refund or settle money, it
-- must not ship: see docs/compliance.md §3 and docs/moderation.md.
--
-- SECURITY MODEL IN ONE LINE
-- --------------------------
-- Public reads go through the `public_*` views (published/enabled/visible rows
-- and explicit columns only). Owner reads/writes go through owner-only RLS and
-- column grants. Supporter claims are inserted *only* through the
-- `public.submit_support_claim(...)` SECURITY DEFINER RPC. `anon` has ZERO
-- direct access to the base tables. `txid` and `ip_hash` never appear in any
-- public view or RPC response.
--
-- DATA POLICY
-- -----------
-- No real personal data belongs in this repo. `supabase/seed.sql` uses the
-- synthetic demo creators (demo-teacher / demo-artist / demo-writer), the fake
-- account prefix `01000000000`, fake bank accounts and synthetic Bangla QR
-- payloads (CRC-16/CCITT-FALSE valid, generated from the public NPSB Bangla QR
-- shape). See ../deshiQR/docs/demo-payloads.md for the deshiQR fixtures this
-- style follows.
--
-- TABLE MAP
-- ---------
--   chanasta schema             internal helpers (CRC-16, rate limiting,
--                               retention, trusted-context checks). Not exposed
--                               through the REST API (only `public` is).
--   public.reserved_slugs       route/brand/provider/abuse names + 90-day
--                               quarantine of changed/deleted creator slugs.
--   public.creators             one page per auth user (MVP).
--   public.payment_methods      the creator's OWN ways to receive money.
--   public.support_claims       self-reported "I sent it" messages (not money).
--   public.public_creators      anon-readable published creator profiles.
--   public.public_payment_methods enabled methods of published creators.
--   public.public_support_claims  unverified + confirmed claims only.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Extensions and internal helper schema
-- ----------------------------------------------------------------------------

-- pgcrypto ships with every Supabase project. It is only used for uuid
-- generation in some deployments (core `gen_random_uuid()` is available on
-- Postgres 13+), so local Postgres builds that do not ship contrib modules
-- (e.g. PGlite, used by scripts/check-sql.mjs) can still apply this migration.
do $$
begin
  create extension if not exists pgcrypto;
exception
  when others then
    raise notice 'pgcrypto unavailable (%), continuing with core Postgres functions', sqlerrm;
end;
$$;

create schema if not exists chanasta;

comment on schema chanasta is
  'Internal Chanasta helpers: CRC-16, trusted-context checks, rate limiting, retention. PostgREST exposes only the public schema, so nothing here is reachable over the REST API.';


-- ----------------------------------------------------------------------------
-- 1. CRC-16/CCITT-FALSE — validates stored Bangla QR payloads
-- ----------------------------------------------------------------------------
-- Same parameters as the deshiQR engine and every EMVCo/Bangla QR payload:
--   polynomial 0x1021, initial value 0xFFFF, no reflection, no final XOR,
--   rendered as 4 uppercase hex characters.
-- Anchor (used by the test harness): crc16('123456789') = '29B1'.
--
-- Input is converted to UTF-8 bytes first, so multi-byte characters (Bangla
-- merchant names) hash exactly like the TypeScript implementation.
--
-- This is what makes it impossible to store a QR payload with a broken
-- checksum, even through a direct SQL insert (see the payment_methods CHECK).
-- NOTE: a valid checksum means "the QR data is well-formed" — never "money
-- arrived". See the verified-qr_status CHECK comments in section 5.

create or replace function chanasta.crc16(p_input text)
returns text
language plpgsql
immutable
strict
parallel safe
as $$
declare
  v_bytes bytea;
  v_crc   integer := 65535; -- 0xFFFF
  v_byte  integer;
  v_i     integer;
  v_bit   integer;
begin
  v_bytes := convert_to(p_input, 'UTF8');
  for v_i in 0 .. length(v_bytes) - 1 loop
    v_byte := get_byte(v_bytes, v_i);
    v_crc := (v_crc # (v_byte << 8)) & 65535;
    for v_bit in 1 .. 8 loop
      if (v_crc & 32768) <> 0 then              -- top bit set ...
        v_crc := ((v_crc << 1) & 65535) # 4129; -- ... shift and xor 0x1021
      else
        v_crc := (v_crc << 1) & 65535;
      end if;
    end loop;
  end loop;
  return upper(lpad(to_hex(v_crc), 4, '0'));
end;
$$;

comment on function chanasta.crc16(text) is
  'CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF, no reflection) as 4 uppercase hex chars. Anchor: crc16(''123456789'') = ''29B1''. Validates Bangla QR payloads; says nothing about money.';


-- ----------------------------------------------------------------------------
-- 2. Enums
-- ----------------------------------------------------------------------------

do $$
begin
  create type public.creator_status as enum ('draft', 'published', 'suspended');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_kind as enum ('bkash', 'nagad', 'rocket', 'bank', 'other');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_qr_status as enum ('none', 'verified', 'unverified', 'image_only');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.claim_status as enum ('unverified', 'confirmed', 'hidden', 'rejected');
exception when duplicate_object then null;
end $$;

comment on type public.payment_qr_status is
  'verified = the stored QR payload checksum/decoded merchant fields were validated by deshiQR for a bKash-issued NPSB Bangla QR. It does NOT mean money arrived or the payee identity was verified.';
comment on type public.claim_status is
  'unverified = self-reported (public as such). confirmed = creator marked it (still not a Chanasta payment verification). hidden = creator-hideable. rejected = moderation-only and terminal.';


-- ----------------------------------------------------------------------------
-- 3. reserved_slugs — route/brand protection + 90-day slug quarantine
-- ----------------------------------------------------------------------------
-- The static list is migration-owned (data-model.md §6) so a normal creator can
-- never squat `/dashboard`, `chanasta`, `bkash`, `donate`, etc. The slug trigger
-- in section 7 checks this table for authenticated callers but lets the trusted
-- migration/seed path (postgres / service_role) create reserved demo rows.
--
-- Changed/deleted creator slugs are ALSO inserted here with reason
-- 'quarantine' for 90 days (anti-impersonation, data-model.md §11). The
-- retention helper deletes only those quarantine rows.

create table if not exists public.reserved_slugs (
  slug       text primary key,
  reason     text not null,
  created_at timestamptz not null default now(),

  constraint reserved_slugs_slug_format check (
    char_length(slug) between 1 and 30
    and slug = lower(slug)
    and slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
  ),
  constraint reserved_slugs_reason_length check (char_length(reason) between 1 and 120)
);

comment on table public.reserved_slugs is
  'Reserved names: app routes, brand/provider impersonation targets and abuse-prone words. Never readable by anon/authenticated. Rows with reason = ''quarantine'' are expired after 90 days by chanasta.purge_expired_slug_quarantine().';

insert into public.reserved_slugs (slug, reason) values
  -- Routes / system names
  ('admin', 'route'), ('api', 'route'), ('app', 'route'), ('auth', 'route'),
  ('dashboard', 'route'), ('login', 'route'), ('logout', 'route'),
  ('signup', 'route'), ('signin', 'route'), ('onboarding', 'route'),
  ('new', 'route'), ('settings', 'route'), ('support', 'route'),
  ('help', 'route'), ('legal', 'route'), ('terms', 'route'),
  ('privacy', 'route'), ('docs', 'route'), ('dev', 'route'),
  ('blog', 'route'), ('explore', 'route'), ('embed', 'route'),
  ('assets', 'route'), ('static', 'route'), ('health', 'route'),
  ('status', 'route'), ('about', 'route'), ('contact', 'route'),
  ('null', 'system'), ('undefined', 'system'), ('root', 'system'),
  ('system', 'system'), ('mail', 'system'), ('www', 'system'),
  ('test', 'system'), ('demo', 'system'),
  -- Brand / provider impersonation
  ('chanasta', 'brand'), ('chanasta-bd', 'brand'),
  ('bkash', 'provider'), ('nagad', 'provider'), ('rocket', 'provider'),
  ('upay', 'provider'), ('bangladesh-bank', 'provider'), ('bb', 'provider'),
  ('npsb', 'provider'), ('banglaqr', 'provider'), ('bank', 'provider'),
  -- Abuse-prone
  ('official', 'abuse'), ('verify', 'abuse'), ('verified', 'abuse'),
  ('security', 'abuse'), ('donate', 'abuse'), ('fund', 'abuse'),
  ('foundation', 'abuse'), ('charity', 'abuse'), ('helpdesk', 'abuse'),
  ('refund', 'abuse')
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- 4. creators — one public page per auth user (MVP)
-- ----------------------------------------------------------------------------
-- Public profile data lives here; all private/account fields (user_id, auth
-- data, slug-change timestamps, deletion state) are excluded from
-- public_creators. `verified` is Chanasta-team-only (column grants + guard
-- trigger); it never means "payment verified".

create table if not exists public.creators (
  id           uuid primary key default gen_random_uuid(),
  -- Owner. `auth.uid()` is the JWT `sub`. Defaulting lets clients insert
  -- without spelling user_id out (the insert RLS policy still enforces it),
  -- and excluding user_id from the INSERT column grant prevents spoofing.
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug         text not null,
  display_name text not null,
  tagline      text,
  bio          text,
  avatar_emoji text not null default '☕',
  avatar_url   text,
  socials      jsonb not null default '{}'::jsonb,
  goal_amount_bdt numeric(10, 2),
  goal_note    text,
  default_locale text not null default 'bn',
  status       public.creator_status not null default 'draft',
  verified     boolean not null default false,
  verified_at  timestamptz,
  published_at timestamptz,
  last_slug_change_at timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Slug rules (data-model.md §6): lowercase, 3-30 chars, starts with a
  -- letter, single hyphens only, ends alphanumeric, no dots/underscores.
  constraint creators_slug_format check (
    slug = lower(slug)
    and char_length(slug) between 3 and 30
    and slug ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
  ),
  constraint creators_display_name_length check (
    char_length(display_name) between 1 and 60
    and display_name !~ '[\r\n]'
  ),
  constraint creators_tagline_length check (
    tagline is null or (char_length(tagline) <= 80 and tagline !~ '[\r\n]')
  ),
  constraint creators_bio_length      check (bio is null or char_length(bio) <= 600),
  constraint creators_avatar_emoji_length check (char_length(avatar_emoji) between 1 and 4),
  constraint creators_avatar_url_length   check (avatar_url is null or char_length(avatar_url) <= 512),
  constraint creators_socials_is_object   check (jsonb_typeof(socials) = 'object'),
  -- Reserved for the future. No goal/progress UI ships in MVP (Lead decision
  -- #5); the column exists so the public data shape can grow without a rewrite.
  constraint creators_goal_amount_range check (
    goal_amount_bdt is null or (goal_amount_bdt > 0 and goal_amount_bdt <= 1000000)
  ),
  constraint creators_goal_note_length check (goal_note is null or char_length(goal_note) <= 120),
  constraint creators_default_locale_valid check (default_locale in ('bn', 'en')),
  constraint creators_verified_requires_at check (verified = false or verified_at is not null),
  constraint creators_published_requires_at check (status <> 'published' or published_at is not null)
);

comment on table public.creators is
  'A creator''s public page + private account preferences. Base table is RLS-protected; published rows are read through public_creators. No money columns: Chanasta never holds funds.';
comment on column public.creators.user_id is
  'Owner auth user. Never exposed by any public view or API response.';
comment on column public.creators.verified is
  'Chanasta-team identity flag (never purchasable, no self-serve write path). It does NOT mean payments are verified. Admin/service-role only.';
comment on column public.creators.last_slug_change_at is
  'Slug changes are limited to one per 30 days; enforced by public.creator_change_slug().';
comment on column public.creators.deleted_at is
  'Soft delete. Public views exclude non-null. Hard purge 30 days later (chanasta.purge_deleted_creators).';

create unique index if not exists creators_slug_key on public.creators (slug);
create unique index if not exists creators_user_key on public.creators (user_id);
create index if not exists creators_published_idx on public.creators (published_at desc)
  where status = 'published' and deleted_at is null;


-- ----------------------------------------------------------------------------
-- 5. payment_methods — the creator's OWN bKash/Nagad/Rocket/bank details
-- ----------------------------------------------------------------------------
-- Full account numbers are stored because the supporter needs to send money (the
-- UI masks them by default with a reveal/copy control). QR payloads are public
-- data by design, exactly like a QR printed on the creator's shop wall.
--
-- The CHECK constraints below are honesty controls, not payment controls:
--   * a stored QR payload must have a valid CRC-16 checksum;
--   * qr_status must match the evidence stored next to it;
--   * 'verified' additionally requires a decoded snapshot from the NPSB Bangla
--     QR institution (the scheme bKash issues) — never just the creator's word.
-- None of this verifies money. See docs/compliance.md §6.

create table if not exists public.payment_methods (
  id             uuid primary key default gen_random_uuid(),
  creator_id     uuid not null references public.creators (id) on delete cascade,
  kind           public.payment_kind not null,
  label          text not null,
  account_number text,
  account_holder text,
  bank_name      text,
  branch         text,
  routing_number text,
  qr_payload     text,
  qr_image_path  text,
  qr_status      public.payment_qr_status not null default 'none',
  -- Snapshot from a successful deshiQR decode. Contains public merchant fields
  -- only (name, city, masked account, institution, reference, kind, decoded_at)
  -- — never tokens, secrets or the full payload again.
  qr_decoded     jsonb,
  sort_order     smallint not null default 0,
  enabled        boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Every method must carry at least one way to pay.
  constraint payment_methods_has_payable_detail check (
    account_number is not null or qr_payload is not null or qr_image_path is not null
  ),

  -- Bank rows need bank fields; non-bank rows must not carry them.
  constraint payment_methods_bank_fields check (
    (kind = 'bank' and bank_name is not null and routing_number is not null)
    or (kind <> 'bank' and bank_name is null and routing_number is null)
  ),

  -- qr_status must match the stored evidence (data-model.md §4).
  constraint payment_methods_qr_status_evidence check (
    (qr_status <> 'verified' or (qr_payload is not null and qr_decoded is not null))
    and (qr_status <> 'unverified' or qr_payload is not null)
    and (qr_status <> 'image_only' or (qr_image_path is not null and qr_payload is null))
    and (qr_status <> 'none' or (qr_payload is null and qr_image_path is null))
  ),

  -- 'verified' only for the NPSB Bangla QR institution (bKash today). Other
  -- institutions may decode structurally but must stay 'unverified' until
  -- deshiQR ships verified fixtures for them. This is a DB-level honesty guard
  -- on top of the client-side decode.
  constraint payment_methods_verified_is_npsb check (
    qr_status <> 'verified' or coalesce(qr_decoded ->> 'institution', '') = 'bd.org.bb.npsb'
  ),

  constraint payment_methods_account_number_format check (
    account_number is null
    or (
      char_length(account_number) between 6 and 34
      and account_number ~ '^[0-9][0-9 -]*[0-9]$'
    )
  ),
  constraint payment_methods_account_holder_length check (
    account_holder is null or char_length(account_holder) <= 60
  ),
  constraint payment_methods_label_length check (char_length(label) between 1 and 40),
  constraint payment_methods_bank_name_length check (
    bank_name is null or char_length(bank_name) <= 60
  ),
  constraint payment_methods_branch_length check (
    branch is null or char_length(branch) <= 60
  ),
  constraint payment_methods_routing_format check (
    routing_number is null or routing_number ~ '^[0-9]{6,9}$'
  ),

  -- A stored QR payload must be a *valid* Bangla QR. CRC-16 over everything
  -- except the trailing 4 checksum characters must equal those characters.
  constraint payment_methods_qr_payload_is_valid check (
    qr_payload is null
    or (
      char_length(qr_payload) between 8 and 1024
      and starts_with(qr_payload, '000201')
      and chanasta.crc16(left(qr_payload, -4)) = upper(right(qr_payload, 4))
    )
  ),
  constraint payment_methods_qr_decoded_is_object check (
    qr_decoded is null or jsonb_typeof(qr_decoded) = 'object'
  ),
  constraint payment_methods_qr_image_path_length check (
    qr_image_path is null or char_length(qr_image_path) <= 512
  ),
  constraint payment_methods_sort_order_range check (sort_order between 0 and 99)
);

comment on table public.payment_methods is
  'The creator''s OWN payment details. Chanasta only displays them; it never substitutes its own account or routes money. Account numbers are public in the UI with masking/reveal; QR payloads are public data.';
comment on column public.payment_methods.qr_status is
  'none | verified | unverified | image_only. verified = payload checksum + decoded NPSB merchant fields validated (bKash-issued Bangla QR). NEVER "payment confirmed".';
comment on column public.payment_methods.qr_decoded is
  'Public decode snapshot (merchant name/city, masked account, institution). Displayed so supporters can compare the payee; contains no secrets.';

-- Max 8 enabled methods per creator is enforced by the trigger in section 7.
-- sort_order is unique per creator. It is a DEFERRABLE unique CONSTRAINT (same
-- index semantics as a unique index) so public.creator_reorder_payment_methods
-- can apply a permutation atomically in one statement: it defers this
-- constraint to commit, avoiding the mid-swap duplicate that a per-row loop or
-- an immediate unique index would reject.
create index if not exists payment_methods_creator_idx on public.payment_methods (creator_id, sort_order)
  where enabled;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'payment_methods_sort_key'
      and conrelid = 'public.payment_methods'::regclass
  ) then
    -- remove a plain unique index from an earlier revision of this migration
    execute 'drop index if exists public.payment_methods_sort_key';
    execute 'alter table public.payment_methods
             add constraint payment_methods_sort_key unique (creator_id, sort_order)
             deferrable initially immediate';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 6. support_claims — self-reported "I sent it" messages, NOT a ledger
-- ----------------------------------------------------------------------------
-- The only source of truth is the supporter's own statement. `txid` and
-- `ip_hash` are PRIVATE (owner/moderation only) and are never exposed by a
-- public view or RPC response. There is no payment confirmation anywhere.

create table if not exists public.support_claims (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.creators (id) on delete cascade,
  -- A self-reported number, not a ledger entry. Product cap ৳1–৳100,000.
  amount_bdt    numeric(10, 2) not null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  method_kind   public.payment_kind,
  supporter_name text,
  message       text,
  -- PRIVATE: optional provider transaction id. Never public, never exported,
  -- never logged. Retained only while the claim exists.
  txid          text,
  status        public.claim_status not null default 'unverified',
  -- PRIVATE abuse-prevention field: peppered/hashed IP, 64 lowercase hex.
  ip_hash       text,
  confirmed_at  timestamptz,
  hidden_at     timestamptz,
  rejected_at   timestamptz,
  moderated_by  uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint support_claims_amount_range check (amount_bdt >= 1 and amount_bdt <= 100000),
  constraint support_claims_supporter_name_length check (
    supporter_name is null or char_length(supporter_name) between 1 and 40
  ),
  constraint support_claims_message_length check (
    message is null or char_length(message) between 1 and 280
  ),
  constraint support_claims_txid_format check (
    txid is null or txid ~ '^[A-Za-z0-9._-]{4,64}$'
  ),
  constraint support_claims_ip_hash_format check (
    ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'
  )
);

comment on table public.support_claims is
  'Self-reported "I sent ৳X" messages. Not a receipt, not a transaction, not proof, not a ledger. Created only via public.submit_support_claim(); reviewed by the owner via public.review_support_claim() or by moderation SQL.';
comment on column public.support_claims.amount_bdt is
  'A supporter-typed self-reported amount (৳1–৳100,000). Chanasta never holds, routes or confirms money.';
comment on column public.support_claims.txid is
  'PRIVATE optional provider transaction id. Never in any public view, API response, export or log. Deleted with the claim.';
comment on column public.support_claims.ip_hash is
  'PRIVATE peppered/hashed IP for abuse rate limiting. Nulled after 30 days by chanasta.purge_expired_claim_pii().';
comment on column public.support_claims.status is
  'unverified (self-reported, public) | confirmed (creator pressed confirm, still not a payment verification) | hidden (creator hides) | rejected (moderation-only, terminal).';

create index if not exists support_claims_creator_idx on public.support_claims (creator_id, created_at desc)
  where status in ('unverified', 'confirmed');
create index if not exists support_claims_moderation_idx on public.support_claims (status)
  where status in ('hidden', 'rejected');
create index if not exists support_claims_rate_idx on public.support_claims (ip_hash, created_at desc)
  where ip_hash is not null;
create index if not exists support_claims_txid_idx on public.support_claims (creator_id, lower(txid))
  where txid is not null;


-- ----------------------------------------------------------------------------
-- 7. Trigger functions and triggers
-- ----------------------------------------------------------------------------
-- Every trigger function is SECURITY INVOKER and resolves names through
-- pg_catalog, so a caller cannot redirect it with a hostile search_path.

-- 7.1 Trusted-context check -------------------------------------------------
-- Used by the slug/social/admin triggers. The trusted paths are: a direct SQL
-- migration/seed connection (postgres) and Supabase's service_role. Ordinary
-- authenticated owners and anon are NOT trusted.
create or replace function chanasta.is_trusted_context()
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select coalesce(current_user, '') in ('postgres', 'service_role')
      or coalesce(
           (nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'role',
           ''
         ) in ('postgres', 'service_role');
$$;

comment on function chanasta.is_trusted_context() is
  'True for migrations/seed (postgres) and service_role only. Used to let trusted seeds create reserved demo rows while blocking owner squatting.';

-- 7.2 Reserved-slug lookup ---------------------------------------------------
-- SECURITY DEFINER so ordinary authenticated callers can be told "reserved"
-- without granting them SELECT on reserved_slugs. It answers a boolean only.
create or replace function chanasta.slug_is_reserved(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.reserved_slugs r where r.slug = lower(coalesce(p_slug, ''))
  );
$$;

comment on function chanasta.slug_is_reserved(text) is
  'Boolean reserved-slug check without granting table access. Also covers the 90-day quarantine rows.';

-- 7.3 Quarantine a slug (90 days) -------------------------------------------
-- Called by the soft-delete guard so an owner's self-service "delete my page"
-- automatically makes the old address non-reusable. SECURITY DEFINER so the
-- owner does not need INSERT rights on reserved_slugs.
create or replace function chanasta.quarantine_slug(p_slug text)
returns void
language sql
security definer
set search_path = pg_catalog
as $$
  insert into public.reserved_slugs (slug, reason)
  values (lower(coalesce(p_slug, '')), 'quarantine')
  on conflict (slug) do nothing;
$$;

comment on function chanasta.quarantine_slug(text) is
  'Adds a changed/deleted slug to the 90-day quarantine. Used by the owner soft-delete path; no direct table access needed.';

-- 7.3 Slug validation + reserved protection + change rate limit --------------
create or replace function chanasta.creators_validate_slug()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_trusted boolean;
begin
  -- Friendly, machine-readable errors. The CHECK constraint is the backstop;
  -- the trigger exists to return SLUG_INVALID / SLUG_RESERVED cleanly.
  if new.slug is null
     or new.slug <> lower(new.slug)
     or char_length(new.slug) not between 3 and 30
     or new.slug !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' then
    raise exception 'SLUG_INVALID: slug must be 3-30 lowercase letters/digits with single hyphens, starting with a letter' using errcode = '22023';
  end if;

  v_trusted := chanasta.is_trusted_context();

  if not v_trusted and chanasta.slug_is_reserved(new.slug) then
    raise exception 'SLUG_RESERVED: that slug is reserved' using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    -- One slug change per 30 days (data-model.md §6). The RPC checks this too
    -- so it can return SLUG_RATE_LIMITED; this is defence in depth.
    if not v_trusted
       and old.last_slug_change_at is not null
       and old.last_slug_change_at > now() - interval '30 days' then
      raise exception 'SLUG_RATE_LIMITED: slug can only be changed once every 30 days' using errcode = 'P0001';
    end if;
    new.last_slug_change_at := now();
  end if;

  return new;
end;
$$;

comment on function chanasta.creators_validate_slug() is
  'Slug format + reserved-list guard + 30-day change rate limit. Trusted migration/seed contexts may create reserved demo slugs.';

drop trigger if exists creators_validate_slug on public.creators;
create trigger creators_validate_slug
  before insert or update of slug on public.creators
  for each row
  execute function chanasta.creators_validate_slug();

-- 7.4 socials validation (allowlist, https-only, ≤6 keys) ---------------------
-- Unknown/unsafe keys are dropped rather than stored (data-model.md §3.1).
create or replace function chanasta.creators_validate_socials()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_key    text;
  v_value  jsonb;
  v_clean  jsonb := '{}'::jsonb;
  v_count  integer := 0;
begin
  if new.socials is null then
    new.socials := '{}'::jsonb;
    return new;
  end if;

  if jsonb_typeof(new.socials) <> 'object' then
    raise exception 'SOCIALS_INVALID: socials must be a JSON object' using errcode = '22023';
  end if;

  for v_key, v_value in select key, value from jsonb_each(new.socials) loop
    -- Allowlisted key, string value, https URL only.
    if v_key not in ('youtube', 'facebook', 'instagram', 'tiktok', 'x',
                     'threads', 'telegram', 'linkedin', 'website') then
      continue;
    end if;
    if jsonb_typeof(v_value) <> 'string' then
      continue;
    end if;
    if char_length(v_value #>> '{}') > 200 then
      continue;
    end if;
    if (v_value #>> '{}') !~ '^https://' then
      continue;
    end if;
    v_clean := v_clean || jsonb_build_object(v_key, v_value);
    v_count := v_count + 1;
  end loop;

  if v_count > 6 then
    raise exception 'SOCIALS_INVALID: at most 6 social links are allowed' using errcode = '22023';
  end if;

  new.socials := v_clean;
  return new;
end;
$$;

drop trigger if exists creators_validate_socials on public.creators;
create trigger creators_validate_socials
  before insert or update of socials on public.creators
  for each row
  execute function chanasta.creators_validate_socials();

-- 7.5 Admin-only creator fields + publish needs a payment method -------------
-- Owners can never change verified/user_id/status/deleted_at: the column
-- grants already block it (permission denied), and this trigger is defence in
-- depth for any future grant mistake. The publish check runs for every path so
-- a page can never be published with zero enabled payment methods.
create or replace function chanasta.guard_creator_admin_fields()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_soft_delete boolean;
begin
  if not chanasta.is_trusted_context() then
    if new.verified is distinct from old.verified
       or new.verified_at is distinct from old.verified_at then
      raise exception 'ADMIN_ONLY_FIELD: verified is managed by Chanasta, not the owner' using errcode = '42501';
    end if;
    if new.user_id is distinct from old.user_id then
      raise exception 'ADMIN_ONLY_FIELD: user_id cannot be changed' using errcode = '42501';
    end if;

    v_soft_delete := old.deleted_at is null and new.deleted_at is not null;

    -- Owners may soft-delete their own page (Settings → delete), and that is the
    -- ONLY status write they may make directly. The delete forces
    -- status='suspended' and quarantines the slug below. Every other status
    -- change goes through public.creator_set_status() so the
    -- "publish needs a payment method" rule cannot be bypassed.
    if new.status is distinct from old.status then
      if not (v_soft_delete and new.status = 'suspended') then
        raise exception 'STATUS_RPC_ONLY: use public.creator_set_status()' using errcode = '42501';
      end if;
    end if;

    if new.deleted_at is distinct from old.deleted_at then
      if old.deleted_at is not null then
        raise exception 'ADMIN_ONLY_FIELD: deletion is final for the owner; contact support' using errcode = '42501';
      end if;
      new.deleted_at := coalesce(new.deleted_at, now());
      new.status := 'suspended';
      perform chanasta.quarantine_slug(old.slug);
    end if;

    if old.deleted_at is not null then
      raise exception 'ADMIN_ONLY_FIELD: this page has been deleted' using errcode = '42501';
    end if;
  end if;

  -- Publishing requires at least one enabled payment method. Enforced here as
  -- well as in creator_set_status() so no direct SQL path can publish an empty
  -- page.
  if new.status = 'published'
     and (new.status is distinct from old.status or new.published_at is null) then
    new.published_at := coalesce(new.published_at, now());
    if not exists (
      select 1 from public.payment_methods pm
      where pm.creator_id = new.id and pm.enabled
    ) then
      raise exception 'PUBLISH_NEEDS_METHOD: add at least one enabled payment method before publishing' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists creators_guard_admin_fields on public.creators;
create trigger creators_guard_admin_fields
  before update on public.creators
  for each row
  execute function chanasta.guard_creator_admin_fields();

-- 7.6 Max 8 enabled payment methods per creator ------------------------------
create or replace function chanasta.enforce_payment_method_limit()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_enabled_count integer;
begin
  if new.enabled then
    select count(*) into v_enabled_count
    from public.payment_methods pm
    where pm.creator_id = new.creator_id
      and pm.enabled
      and pm.id <> new.id;

    if v_enabled_count >= 8 then
      raise exception 'PAYMENT_METHOD_LIMIT: at most 8 enabled payment methods are allowed' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists payment_methods_enforce_limit on public.payment_methods;
create trigger payment_methods_enforce_limit
  before insert or update of enabled, creator_id on public.payment_methods
  for each row
  execute function chanasta.enforce_payment_method_limit();

-- 7.7 Claim timestamp bookkeeping --------------------------------------------
-- Keeps status timestamps coherent from ANY path (RPC or moderation SQL).
-- Restore means "back to self-reported", so confirmed_at is cleared.
create or replace function chanasta.sync_claim_timestamps()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'confirmed' then
      new.confirmed_at := coalesce(new.confirmed_at, now());
      new.hidden_at := null;
    elsif new.status = 'hidden' then
      new.hidden_at := coalesce(new.hidden_at, now());
    elsif new.status = 'unverified' then
      -- restore: back to self-reported
      new.confirmed_at := null;
      new.hidden_at := null;
    elsif new.status = 'rejected' then
      new.rejected_at := coalesce(new.rejected_at, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists support_claims_sync_timestamps on public.support_claims;
create trigger support_claims_sync_timestamps
  before update on public.support_claims
  for each row
  execute function chanasta.sync_claim_timestamps();

-- 7.9 updated_at --------------------------------------------------------------
create or replace function chanasta.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists creators_touch_updated_at on public.creators;
create trigger creators_touch_updated_at
  before update on public.creators
  for each row
  execute function chanasta.touch_updated_at();

drop trigger if exists payment_methods_touch_updated_at on public.payment_methods;
create trigger payment_methods_touch_updated_at
  before update on public.payment_methods
  for each row
  execute function chanasta.touch_updated_at();

drop trigger if exists support_claims_touch_updated_at on public.support_claims;
create trigger support_claims_touch_updated_at
  before update on public.support_claims
  for each row
  execute function chanasta.touch_updated_at();


-- ----------------------------------------------------------------------------
-- 8. Public read surfaces (the ONLY anon-readable surfaces)
-- ----------------------------------------------------------------------------
-- Owned by the migration role and run with that role's privileges
-- (`security_invoker = false`), so they are NOT filtered by the base-table RLS.
-- The WHERE clauses are the access control and the explicit column lists mean a
-- private column added later can never leak through them.
--
-- Never present here: user_id, emails, auth data, creator/payment UUIDs where
-- not needed, txid, ip_hash, moderated_by, last_slug_change_at, deleted_at.

create or replace view public.public_creators
with (security_invoker = false, security_barrier = true)
as
select
  c.slug,
  c.display_name,
  c.tagline,
  c.bio,
  c.avatar_emoji,
  c.socials,
  c.goal_amount_bdt,
  c.goal_note,
  c.default_locale,
  c.verified,
  c.published_at,
  c.updated_at
from public.creators c
where c.status = 'published'
  and c.deleted_at is null;

comment on view public.public_creators is
  'Anon-readable published creator profiles. Explicit columns only; never user_id/id/status/verified_at/deleted_at/last_slug_change_at.';

create or replace view public.public_payment_methods
with (security_invoker = false, security_barrier = true)
as
select
  pm.id,
  c.slug as creator_slug,
  pm.kind,
  pm.label,
  pm.account_number,
  pm.account_holder,
  pm.bank_name,
  pm.branch,
  pm.routing_number,
  pm.qr_payload,
  pm.qr_image_path,
  pm.qr_status,
  pm.qr_decoded,
  pm.sort_order,
  pm.updated_at
from public.payment_methods pm
join public.creators c on c.id = pm.creator_id
where pm.enabled
  and c.status = 'published'
  and c.deleted_at is null;

comment on view public.public_payment_methods is
  'Enabled payment methods of published creators. The creator''s own account/QR details (public by design); never creator_id or private timestamps.';

create or replace view public.public_support_claims
with (security_invoker = false, security_barrier = true)
as
select
  sc.id,
  c.slug as creator_slug,
  sc.amount_bdt,
  sc.supporter_name,
  sc.message,
  sc.method_kind,
  sc.status,
  sc.created_at
from public.support_claims sc
join public.creators c on c.id = sc.creator_id
where sc.status in ('unverified', 'confirmed')
  and c.status = 'published'
  and c.deleted_at is null;

comment on view public.public_support_claims is
  'Self-reported support messages (unverified + creator-confirmed) of published creators. NEVER exposes txid, ip_hash, payment_method_id, creator_id, moderated_by or review timestamps.';


-- ----------------------------------------------------------------------------
-- 9. Row Level Security
-- ----------------------------------------------------------------------------
-- Golden rule: anon has no direct table access at all. authenticated gets
-- owner-scoped access. The service role bypasses RLS (moderation runbook).
-- Views in section 8 are owner-rights and are the only anon read path.

alter table public.creators         enable row level security;
alter table public.payment_methods  enable row level security;
alter table public.support_claims   enable row level security;
alter table public.reserved_slugs   enable row level security;

-- creators: owner select/insert/update only. No DELETE policy (soft delete).
drop policy if exists creators_owner_select on public.creators;
create policy creators_owner_select
  on public.creators for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists creators_owner_insert on public.creators;
create policy creators_owner_insert
  on public.creators for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists creators_owner_update on public.creators;
create policy creators_owner_update
  on public.creators for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- payment_methods: full CRUD on rows whose creator belongs to auth.uid().
drop policy if exists payment_methods_owner_select on public.payment_methods;
create policy payment_methods_owner_select
  on public.payment_methods for select
  to authenticated
  using (
    exists (
      select 1 from public.creators c
      where c.id = payment_methods.creator_id and c.user_id = auth.uid()
    )
  );

drop policy if exists payment_methods_owner_insert on public.payment_methods;
create policy payment_methods_owner_insert
  on public.payment_methods for insert
  to authenticated
  with check (
    exists (
      select 1 from public.creators c
      where c.id = payment_methods.creator_id and c.user_id = auth.uid()
    )
  );

drop policy if exists payment_methods_owner_update on public.payment_methods;
create policy payment_methods_owner_update
  on public.payment_methods for update
  to authenticated
  using (
    exists (
      select 1 from public.creators c
      where c.id = payment_methods.creator_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.creators c
      where c.id = payment_methods.creator_id and c.user_id = auth.uid()
    )
  );

drop policy if exists payment_methods_owner_delete on public.payment_methods;
create policy payment_methods_owner_delete
  on public.payment_methods for delete
  to authenticated
  using (
    exists (
      select 1 from public.creators c
      where c.id = payment_methods.creator_id and c.user_id = auth.uid()
    )
  );

-- support_claims: owner READ only, and only for their own creators (the
-- dashboard needs txid). All status transitions go through the review RPC;
-- there are deliberately NO insert/update/delete policies or grants.
drop policy if exists support_claims_owner_select on public.support_claims;
create policy support_claims_owner_select
  on public.support_claims for select
  to authenticated
  using (
    exists (
      select 1 from public.creators c
      where c.id = support_claims.creator_id and c.user_id = auth.uid()
    )
  );

-- reserved_slugs: RLS enabled with no policies. Only trusted/definer code
-- (chanasta.slug_is_reserved) can read it.


-- ----------------------------------------------------------------------------
-- 10. Privileges (base tables, columns, views)
-- ----------------------------------------------------------------------------
-- Everything is explicit because local Postgres / PGlite does not have
-- Supabase's blanket default privileges; the REVOKEs also protect Supabase from
-- a future default-grant change.

grant usage on schema public to anon, authenticated;
grant usage on schema chanasta to authenticated;

-- Base tables: no direct anon access at all.
revoke all on table public.creators        from anon, public;
revoke all on table public.payment_methods from anon, public;
revoke all on table public.support_claims  from anon, public;
revoke all on table public.reserved_slugs  from anon, public;

-- creators: owner SELECT; INSERT/UPDATE only on profile columns. The list is
-- deliberately narrow — slug changes go through the RPC (rate limit + reserved
-- check), publish/unpublish through the RPC, verified/deleted_at are admin-only.
grant select on table public.creators to authenticated;
-- user_id is accepted on INSERT (the client may spell it out) but the RLS
-- policy requires it to equal auth.uid(), so it cannot be spoofed.
grant insert (user_id, slug, display_name, tagline, bio, avatar_emoji,
              avatar_url, socials, goal_amount_bdt, goal_note, default_locale)
  on table public.creators to authenticated;
-- Profile columns + the two columns needed by the documented owner flows:
-- publishing goes through the RPC, self-service soft delete sets deleted_at
-- (the guard trigger forces status='suspended' and quarantines the slug).
grant update (display_name, tagline, bio, avatar_emoji, avatar_url,
              socials, goal_amount_bdt, goal_note, default_locale,
              status, deleted_at)
  on table public.creators to authenticated;

-- payment_methods: owner CRUD; creator_id cannot be reassigned (not in the
-- UPDATE grant), so a method can never be moved onto someone else's page.
grant select on table public.payment_methods to authenticated;
grant insert (creator_id, kind, label, account_number, account_holder,
              bank_name, branch, routing_number, qr_payload, qr_image_path,
              qr_status, qr_decoded, sort_order, enabled)
  on table public.payment_methods to authenticated;
grant update (creator_id, kind, label, account_number, account_holder, bank_name,
              branch, routing_number, qr_payload, qr_image_path, qr_status,
              qr_decoded, sort_order, enabled)
  on table public.payment_methods to authenticated;
grant delete on table public.payment_methods to authenticated;

-- support_claims: owner SELECT only (RLS scopes it). NO insert/update/delete
-- grants: the RPCs are the only write path.
grant select on table public.support_claims to authenticated;

-- The CRC helper is called by the payment_methods CHECK constraint, so the
-- inserting role needs EXECUTE (and USAGE on the schema, granted above).
revoke all on function chanasta.crc16(text) from public;
grant execute on function chanasta.crc16(text) to authenticated;

-- The slug/soft-delete triggers (SECURITY INVOKER, run as authenticated) call
-- these two helpers; they are the only chanasta functions exposed to
-- authenticated.
revoke all on function chanasta.slug_is_reserved(text) from public;
grant execute on function chanasta.slug_is_reserved(text) to authenticated;
revoke all on function chanasta.quarantine_slug(text) from public;
grant execute on function chanasta.quarantine_slug(text) to authenticated;

-- Public read surfaces.
grant select on public.public_creators        to anon, authenticated;
grant select on public.public_payment_methods to anon, authenticated;
grant select on public.public_support_claims  to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 11. Rate limiting helper
-- ----------------------------------------------------------------------------
-- Fixed-window counters live in a table so every RPC call shares the same
-- state. Semantics: increment the counter for the current window and return
-- true while count <= limit. A window that has expired resets to 1. Concurrent
-- calls are serialised by the ON CONFLICT row lock. Fails closed.

create table if not exists chanasta.rate_limits (
  key          text primary key,
  count        integer not null default 1,
  window_start timestamptz not null default now(),
  expires_at   timestamptz not null
);

comment on table chanasta.rate_limits is
  'Internal fixed-window rate-limit counters (claim submission). No grants; used only by chanasta.take_rate_limit().';

create index if not exists rate_limits_expires_at_idx on chanasta.rate_limits (expires_at);

create or replace function chanasta.take_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  if p_key is null or p_key = ''
     or char_length(p_key) > 512
     or p_limit is null or p_limit < 1
     or p_window_seconds is null or p_window_seconds < 1 then
    return false; -- fail closed
  end if;

  insert into chanasta.rate_limits as rl (key, count, window_start, expires_at)
  values (p_key, 1, now(), now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count        = case when rl.expires_at <= now() then 1 else rl.count + 1 end,
        window_start = case when rl.expires_at <= now() then now() else rl.window_start end,
        expires_at   = case when rl.expires_at <= now()
                            then now() + make_interval(secs => p_window_seconds)
                            else rl.expires_at end
  returning rl.count into v_count;

  return v_count <= p_limit;
exception
  when others then
    return false; -- a broken limiter must deny, not open the floodgates
end;
$$;

comment on function chanasta.take_rate_limit(text, integer, integer) is
  'Fixed-window rate limiter (returns true while count <= limit). Fails closed. Internal only.';

-- Resolve the private ip_hash used for rate limiting. A trusted caller (edge
-- proxy) may pass the peppered sha256 hex; otherwise we derive a stable
-- 64-char hex fingerprint from PostgREST's x-forwarded-for header. Both are
-- PRIVATE and never returned.
create or replace function chanasta.resolve_ip_hash(p_provided text)
returns text
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_headers jsonb;
  v_ip      text;
begin
  if p_provided is not null and p_provided ~ '^[0-9a-f]{64}$' then
    return lower(p_provided);
  end if;

  begin
    v_headers := coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb,
      '{}'::jsonb
    );
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip := btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1));
  if v_ip = '' then
    v_ip := 'unknown';
  end if;

  -- md5 is a core Postgres function (no pgcrypto needed). Two md5s give a
  -- stable 64-char hex fingerprint; this is abuse-prevention only, never PII
  -- exposure.
  return md5(v_ip) || md5('chanasta-ip:' || v_ip);
end;
$$;

comment on function chanasta.resolve_ip_hash(text) is
  'Private 64-char hex IP fingerprint for rate limiting: caller-supplied peppered sha256 if valid, else a stable md5-derived fingerprint of x-forwarded-for. Never returned.';


-- ----------------------------------------------------------------------------
-- 12. RPCs — the only write paths beyond owner tables
-- ----------------------------------------------------------------------------
-- All are SECURITY DEFINER with a pinned search_path and explicit grants.
-- Domain errors use stable machine codes in the message, e.g.
--   SLUG_INVALID, SLUG_TAKEN, SLUG_RESERVED, SLUG_RATE_LIMITED,
--   RATE_LIMITED, CLAIM_TOO_LARGE, CLAIM_AMOUNT_INVALID, NAME_TOO_LONG,
--   MESSAGE_TOO_LONG, TXID_INVALID, TXID_TOO_LONG, METHOD_KIND_INVALID,
--   NOT_PUBLISHED, PUBLISH_NEEDS_METHOD, AUTH_REQUIRED, CREATOR_NOT_FOUND,
--   CLAIM_NOT_FOUND, CLAIM_ACTION_INVALID, CLAIM_INVALID_TRANSITION,
--   CLAIM_REJECTED_TERMINAL, SUSPENDED_ADMIN_ONLY.
-- The app maps these to friendly bn/en messages (docs/api.md has the table).

-- 12.1 is_slug_available -----------------------------------------------------
-- Returns false for invalid/reserved/taken slugs and never reveals which.
create or replace function public.is_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select case
    when p_slug is null then false
    when p_slug <> lower(p_slug) then false
    when char_length(p_slug) not between 3 and 30 then false
    when p_slug !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' then false
    when exists (select 1 from public.reserved_slugs r where r.slug = p_slug) then false
    when exists (select 1 from public.creators c where c.slug = p_slug) then false
    else true
  end;
$$;

comment on function public.is_slug_available(text) is
  'Onboarding availability check. False for invalid/reserved/taken; does not reveal the reason.';

-- 12.2 submit_support_claim --------------------------------------------------
-- The ONLY way a supporter claim is created. Validates the creator is
-- published, normalises/limits text, rate-limits, inserts as 'unverified' and
-- returns ONLY {id, status, created_at} — never txid, ip_hash or any account
-- data. A claim is a self-reported message, not a payment.
create or replace function public.submit_support_claim(
  p_slug text,
  p_amount numeric,
  p_name text,
  p_message text,
  p_txid text,
  p_method_kind text,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_creator public.creators%rowtype;
  v_method  public.payment_methods%rowtype;
  v_kind    public.payment_kind;
  v_name    text;
  v_message text;
  v_txid    text;
  v_ip      text;
  v_claim   public.support_claims%rowtype;
begin
  -- Creator must be published and not soft-deleted.
  if p_slug is null or btrim(p_slug) = '' then
    raise exception 'NOT_PUBLISHED: no published creator for that page' using errcode = 'P0002';
  end if;

  select * into v_creator
  from public.creators c
  where c.slug = btrim(p_slug)
    and c.status = 'published'
    and c.deleted_at is null;

  if not found then
    raise exception 'NOT_PUBLISHED: no published creator for that page' using errcode = 'P0002';
  end if;

  -- Amount: self-reported number, product cap ৳1–৳100,000.
  if p_amount is null or p_amount < 1 then
    raise exception 'CLAIM_AMOUNT_INVALID: amount must be at least ৳1' using errcode = '22023';
  end if;
  if p_amount > 100000 then
    raise exception 'CLAIM_TOO_LARGE: amount must be at most ৳100,000' using errcode = '22023';
  end if;

  -- Plain text only; trim and collapse whitespace/newlines.
  v_name := nullif(btrim(regexp_replace(coalesce(p_name, ''), '[\s]+', ' ', 'g')), '');
  if v_name is not null and char_length(v_name) > 40 then
    raise exception 'NAME_TOO_LONG: supporter name must be at most 40 characters' using errcode = '22023';
  end if;

  v_message := nullif(btrim(regexp_replace(coalesce(p_message, ''), '[\s]+', ' ', 'g')), '');
  if v_message is not null and char_length(v_message) > 280 then
    raise exception 'MESSAGE_TOO_LONG: message must be at most 280 characters' using errcode = '22023';
  end if;

  v_txid := nullif(btrim(coalesce(p_txid, '')), '');
  if v_txid is not null and v_txid !~ '^[A-Za-z0-9._-]{4,64}$' then
    raise exception 'TXID_INVALID: transaction id must be 4-64 letters, digits, dot, dash or underscore' using errcode = '22023';
  end if;

  -- Optional method kind snapshot. Only the enabled method's kind is stored;
  -- the account number is never part of a claim.
  if p_method_kind is not null and btrim(p_method_kind) <> '' then
    if btrim(p_method_kind) not in ('bkash', 'nagad', 'rocket', 'bank', 'other') then
      raise exception 'METHOD_KIND_INVALID: unknown payment method kind' using errcode = '22023';
    end if;
    v_kind := btrim(p_method_kind)::public.payment_kind;

    select * into v_method
    from public.payment_methods pm
    where pm.creator_id = v_creator.id
      and pm.enabled
      and pm.kind = v_kind
    order by pm.sort_order
    limit 1;
  end if;

  -- Abuse rate limits (data-model.md §8):
  --   5 claims/hour + 20 claims/day per ip_hash, 100 claims/day per creator.
  v_ip := chanasta.resolve_ip_hash(p_ip_hash);

  if not chanasta.take_rate_limit('claim:ip:' || v_ip || ':1h', 5, 3600) then
    raise exception 'RATE_LIMITED: too many claims from this connection, try again later' using errcode = 'P0001';
  end if;
  if not chanasta.take_rate_limit('claim:ip:' || v_ip || ':24h', 20, 86400) then
    raise exception 'RATE_LIMITED: too many claims from this connection today' using errcode = 'P0001';
  end if;
  if not chanasta.take_rate_limit('claim:creator:' || v_creator.id::text || ':24h', 100, 86400) then
    raise exception 'RATE_LIMITED: this page has received too many claims today' using errcode = 'P0001';
  end if;

  insert into public.support_claims (
    creator_id, amount_bdt, payment_method_id, method_kind,
    supporter_name, message, txid, status, ip_hash
  ) values (
    v_creator.id, round(p_amount, 2), v_method.id, v_kind,
    v_name, v_message, v_txid, 'unverified', v_ip
  )
  returning * into v_claim;

  -- Never return txid/ip_hash: the supporter gets an id for the thanks URL and
  -- the honest "self-reported, unverified" status.
  return jsonb_build_object(
    'id', v_claim.id,
    'status', v_claim.status,
    'created_at', v_claim.created_at
  );
end;
$$;

comment on function public.submit_support_claim(text, numeric, text, text, text, text, text) is
  'Anon-callable. Inserts a self-reported claim (unverified) after validation + rate limits. Returns only {id,status,created_at}; never txid/ip_hash. Does not move or confirm money.';

-- 12.3 review_support_claim --------------------------------------------------
-- Owner confirm/hide/restore per the state machine (data-model.md §7).
-- Rejection is moderation-only (service-role SQL, docs/moderation.md) and is
-- terminal: the owner can never confirm/hide/restore a rejected claim.
create or replace function public.review_support_claim(
  p_claim_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid     uuid;
  v_action  text;
  v_claim   public.support_claims%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: sign in to review claims' using errcode = '42501';
  end if;

  v_action := lower(btrim(coalesce(p_action, '')));
  if v_action not in ('confirm', 'hide', 'restore') then
    raise exception 'CLAIM_ACTION_INVALID: action must be confirm, hide or restore' using errcode = '22023';
  end if;

  select sc.* into v_claim
  from public.support_claims sc
  join public.creators c on c.id = sc.creator_id
  where sc.id = p_claim_id
    and c.user_id = v_uid
  for update of sc;

  if not found then
    -- Never reveal whether the claim exists for someone else.
    raise exception 'CLAIM_NOT_FOUND: claim not found' using errcode = 'P0002';
  end if;

  if v_claim.status = 'rejected' then
    raise exception 'CLAIM_REJECTED_TERMINAL: a rejected claim cannot be restored by the creator' using errcode = 'P0001';
  end if;

  if v_action = 'confirm' then
    if v_claim.status <> 'unverified' then
      raise exception 'CLAIM_INVALID_TRANSITION: only an unverified claim can be confirmed' using errcode = 'P0001';
    end if;
    update public.support_claims set status = 'confirmed' where id = v_claim.id
    returning * into v_claim;
  elsif v_action = 'hide' then
    if v_claim.status not in ('unverified', 'confirmed') then
      raise exception 'CLAIM_INVALID_TRANSITION: only a visible claim can be hidden' using errcode = 'P0001';
    end if;
    update public.support_claims set status = 'hidden' where id = v_claim.id
    returning * into v_claim;
  else -- restore
    if v_claim.status <> 'hidden' then
      raise exception 'CLAIM_INVALID_TRANSITION: only a hidden claim can be restored' using errcode = 'P0001';
    end if;
    update public.support_claims set status = 'unverified' where id = v_claim.id
    returning * into v_claim;
  end if;

  return jsonb_build_object(
    'id', v_claim.id,
    'status', v_claim.status,
    'confirmed_at', v_claim.confirmed_at,
    'hidden_at', v_claim.hidden_at,
    'updated_at', v_claim.updated_at
  );
end;
$$;

comment on function public.review_support_claim(uuid, text) is
  'Owner-only confirm/hide/restore with the documented state machine. Rejected claims are terminal. Timestamps are maintained by the trigger.';

-- 12.4 creator_set_status ----------------------------------------------------
-- Publish requires at least one enabled payment method. Owners can only
-- publish/unpublish; suspension is a service-role moderation action via SQL
-- (docs/moderation.md) so it cannot be self-applied or lifted.
create or replace function public.creator_set_status(p_status text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid     uuid;
  v_status  text;
  v_creator public.creators%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: sign in to change your page status' using errcode = '42501';
  end if;

  v_status := lower(btrim(coalesce(p_status, '')));
  if v_status in ('publish', 'published') then
    v_status := 'published';
  elsif v_status in ('unpublish', 'draft') then
    v_status := 'draft';
  elsif v_status = 'suspended' then
    raise exception 'SUSPENDED_ADMIN_ONLY: suspension is a Chanasta moderation action' using errcode = '42501';
  else
    raise exception 'STATUS_INVALID: status must be published or draft' using errcode = '22023';
  end if;

  select * into v_creator
  from public.creators c
  where c.user_id = v_uid
  for update;

  if not found then
    raise exception 'CREATOR_NOT_FOUND: create a page first' using errcode = 'P0002';
  end if;

  if v_creator.deleted_at is not null then
    raise exception 'CREATOR_DELETED: this page has been deleted' using errcode = 'P0001';
  end if;

  if v_status = 'published' then
    if not exists (
      select 1 from public.payment_methods pm
      where pm.creator_id = v_creator.id and pm.enabled
    ) then
      raise exception 'PUBLISH_NEEDS_METHOD: add at least one enabled payment method before publishing' using errcode = 'P0001';
    end if;
    update public.creators
    set status = 'published',
        published_at = coalesce(published_at, now())
    where id = v_creator.id
    returning * into v_creator;
  else
    update public.creators
    set status = 'draft'
    where id = v_creator.id
    returning * into v_creator;
  end if;

  return jsonb_build_object(
    'slug', v_creator.slug,
    'status', v_creator.status,
    'published_at', v_creator.published_at
  );
end;
$$;

comment on function public.creator_set_status(text) is
  'Owner publish/unpublish. Publishing requires >=1 enabled payment method. Suspension is service-role SQL only.';

-- 12.5 creator_change_slug ---------------------------------------------------
create or replace function public.creator_change_slug(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid     uuid;
  v_creator public.creators%rowtype;
  v_new     text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: sign in to change your page address' using errcode = '42501';
  end if;

  v_new := btrim(coalesce(p_slug, ''));

  if v_new is null
     or v_new <> lower(v_new)
     or char_length(v_new) not between 3 and 30
     or v_new !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' then
    raise exception 'SLUG_INVALID: slug must be 3-30 lowercase letters/digits with single hyphens, starting with a letter' using errcode = '22023';
  end if;

  select * into v_creator
  from public.creators c
  where c.user_id = v_uid
  for update;

  if not found then
    raise exception 'CREATOR_NOT_FOUND: create a page first' using errcode = 'P0002';
  end if;

  if v_creator.slug = v_new then
    return jsonb_build_object('slug', v_creator.slug, 'last_slug_change_at', v_creator.last_slug_change_at);
  end if;

  if chanasta.slug_is_reserved(v_new) then
    raise exception 'SLUG_RESERVED: that slug is reserved' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.creators c
    where c.slug = v_new and c.id <> v_creator.id
  ) then
    raise exception 'SLUG_TAKEN: that slug is already taken' using errcode = 'P0001';
  end if;

  if v_creator.last_slug_change_at is not null
     and v_creator.last_slug_change_at > now() - interval '30 days' then
    raise exception 'SLUG_RATE_LIMITED: slug can only be changed once every 30 days' using errcode = 'P0001';
  end if;

  -- Anti-impersonation: quarantine the previous slug for 90 days. The change
  -- is atomic, so a failed update rolls the quarantine back too.
  insert into public.reserved_slugs (slug, reason)
  values (v_creator.slug, 'quarantine')
  on conflict (slug) do nothing;

  update public.creators
  set slug = v_new
  where id = v_creator.id
  returning * into v_creator;

  return jsonb_build_object(
    'slug', v_creator.slug,
    'last_slug_change_at', v_creator.last_slug_change_at
  );
exception
  when unique_violation then
    raise exception 'SLUG_TAKEN: that slug is already taken' using errcode = 'P0001';
end;
$$;

comment on function public.creator_change_slug(text) is
  'Owner slug change: format + reserved + uniqueness + one change per 30 days. Quarantines the old slug for 90 days.';

-- 12.6 creator_claim_counts --------------------------------------------------
-- Dashboard badge counts for the caller's own page(s).
create or replace function public.creator_claim_counts()
returns table (creator_id uuid, unverified integer, confirmed integer, hidden integer)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    c.id as creator_id,
    count(*) filter (where sc.status = 'unverified')::integer as unverified,
    count(*) filter (where sc.status = 'confirmed')::integer as confirmed,
    count(*) filter (where sc.status = 'hidden')::integer as hidden
  from public.creators c
  join public.support_claims sc on sc.creator_id = c.id
  where c.user_id = auth.uid()
  group by c.id;
$$;

comment on function public.creator_claim_counts() is
  'Owner dashboard counts by claim status (unverified/confirmed/hidden).';

-- 12.7 creator_reorder_payment_methods -------------------------------------
-- The dashboard's only reorder path. A naive per-row loop of sort_order updates
-- collides with the unique (creator_id, sort_order) constraint mid-swap, so the
-- whole permutation is applied in one statement with the constraint deferred to
-- commit (it is DEFERRABLE INITIALLY IMMEDIATE, see the payment_methods
-- section).
--
-- Validation: authenticated owner; 1..8 unique ids; every id belongs to one of
-- the caller's payment methods; and the ids are exactly the creator's full
-- method set. Errors: AUTH_REQUIRED, BAD_ORDER, FORBIDDEN, CREATOR_NOT_FOUND,
-- CREATOR_DELETED.
create or replace function public.creator_reorder_payment_methods(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid      uuid;
  v_creator  public.creators%rowtype;
  v_count    integer;
  v_distinct integer;
  v_owned    integer;
  v_total    integer;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: sign in to reorder payment methods' using errcode = '42501';
  end if;

  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    raise exception 'BAD_ORDER: provide the full method order' using errcode = '22023';
  end if;

  v_count := array_length(p_ids, 1);
  if v_count > 8 then
    raise exception 'BAD_ORDER: at most 8 payment methods can be ordered' using errcode = '22023';
  end if;

  select count(distinct x) into v_distinct from unnest(p_ids) as x;
  if v_distinct <> v_count then
    raise exception 'BAD_ORDER: duplicate payment method ids' using errcode = '22023';
  end if;

  select * into v_creator
  from public.creators c
  where c.user_id = v_uid
  for update;

  if not found then
    raise exception 'CREATOR_NOT_FOUND: create a page first' using errcode = 'P0002';
  end if;

  if v_creator.deleted_at is not null then
    raise exception 'CREATOR_DELETED: this page has been deleted' using errcode = 'P0001';
  end if;

  -- Lock the method rows so concurrent reorders serialise instead of racing the
  -- temporary sort values.
  perform 1
  from public.payment_methods pm
  where pm.creator_id = v_creator.id
  for update;

  select count(*) into v_total
  from public.payment_methods pm
  where pm.creator_id = v_creator.id;

  select count(*) into v_owned
  from public.payment_methods pm
  where pm.creator_id = v_creator.id
    and pm.id = any (p_ids);

  if v_owned <> v_count then
    raise exception 'FORBIDDEN: one or more payment methods do not belong to your page' using errcode = '42501';
  end if;

  if v_total <> v_count then
    raise exception 'BAD_ORDER: ids must be the complete set of your payment methods' using errcode = '22023';
  end if;

  -- Apply the whole permutation in one statement. The unique constraint is
  -- deferrable and checked at commit, so no temporary duplicate is ever visible
  -- and no temp values outside 0..99 are needed.
  set constraints public.payment_methods_sort_key deferred;

  update public.payment_methods pm
  set sort_order = ordered.ord - 1
  from unnest(p_ids) with ordinality as ordered(id, ord)
  where pm.id = ordered.id
    and pm.creator_id = v_creator.id;
end;
$$;

comment on function public.creator_reorder_payment_methods(uuid[]) is
  'Owner-only atomic payment-method reorder (the unique sort key forbids a naive per-row loop). Full method set, 1..8 unique ids.';


-- ----------------------------------------------------------------------------
-- 13. Retention / moderation helpers (service-role runbook only)
-- ----------------------------------------------------------------------------
-- These implement data-model.md §11. They are NOT callable through PostgREST
-- (chanasta schema is not exposed) — they run from the SQL editor / a cron
-- service-role job. See docs/moderation.md and docs/self-hosting.md.

-- Null ip_hash after 30 days; purge rejected claims after 90 days.
create or replace function chanasta.purge_expired_claim_pii()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_ips integer := 0;
  v_rejected integer := 0;
begin
  update public.support_claims
  set ip_hash = null
  where ip_hash is not null
    and created_at < now() - interval '30 days';
  get diagnostics v_ips = row_count;

  delete from public.support_claims
  where status = 'rejected'
    and coalesce(rejected_at, updated_at) < now() - interval '90 days';
  get diagnostics v_rejected = row_count;

  return jsonb_build_object('ip_hashes_nulled', v_ips, 'rejected_purged', v_rejected);
end;
$$;

comment on function chanasta.purge_expired_claim_pii() is
  'Retention: null ip_hash after 30 days, purge rejected claims after 90 days. Service role / SQL editor only.';

-- Hard-purge creators soft-deleted more than 30 days ago (methods/claims cascade).
create or replace function chanasta.purge_deleted_creators()
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.creators
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function chanasta.purge_deleted_creators() is
  'Retention: hard-purge creators soft-deleted more than 30 days ago (cascades methods/claims). Service role / SQL editor only.';

-- Expire the 90-day slug quarantine (never touches the static reserved list).
create or replace function chanasta.purge_expired_slug_quarantine()
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_removed integer := 0;
begin
  delete from public.reserved_slugs
  where reason = 'quarantine'
    and created_at < now() - interval '90 days';
  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

comment on function chanasta.purge_expired_slug_quarantine() is
  'Retention: remove 90-day slug quarantine rows (reason = ''quarantine'') only. The static reserved list is never touched.';


-- ----------------------------------------------------------------------------
-- 14. Function privileges (explicit grants / revokes)
-- ----------------------------------------------------------------------------
-- Functions default to EXECUTE for PUBLIC; revoke first, then grant exactly
-- what each surface needs. anon gets only the availability check + claim
-- submission (rate-limited inside the function).

revoke all on function public.is_slug_available(text) from public, anon, authenticated;
revoke all on function public.submit_support_claim(text, numeric, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.review_support_claim(uuid, text) from public, anon, authenticated;
revoke all on function public.creator_set_status(text) from public, anon, authenticated;
revoke all on function public.creator_change_slug(text) from public, anon, authenticated;
revoke all on function public.creator_claim_counts() from public, anon, authenticated;
revoke all on function public.creator_reorder_payment_methods(uuid[]) from public, anon, authenticated;

grant execute on function public.is_slug_available(text) to anon, authenticated;
grant execute on function public.submit_support_claim(text, numeric, text, text, text, text, text) to anon, authenticated;
grant execute on function public.review_support_claim(uuid, text) to authenticated;
grant execute on function public.creator_set_status(text) to authenticated;
grant execute on function public.creator_change_slug(text) to authenticated;
grant execute on function public.creator_claim_counts() to authenticated;
grant execute on function public.creator_reorder_payment_methods(uuid[]) to authenticated;

-- Internal helpers are not reachable by API roles.
revoke all on function chanasta.take_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function chanasta.resolve_ip_hash(text) from public, anon, authenticated;
revoke all on function chanasta.purge_expired_claim_pii() from public, anon, authenticated;
revoke all on function chanasta.purge_deleted_creators() from public, anon, authenticated;
revoke all on function chanasta.purge_expired_slug_quarantine() from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 15. Service-role grants (runbook / edge tooling)
-- ----------------------------------------------------------------------------
-- Guarded so this migration also applies on plain Postgres / PGlite where the
-- Supabase service role might not exist. The service role also has BYPASSRLS
-- on Supabase; the grants below are what its SQL/PostgREST paths actually need.

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    execute 'grant usage on schema public to service_role';
    execute 'grant usage on schema chanasta to service_role';
    execute 'grant all privileges on table public.creators to service_role';
    execute 'grant all privileges on table public.payment_methods to service_role';
    execute 'grant all privileges on table public.support_claims to service_role';
    execute 'grant all privileges on table public.reserved_slugs to service_role';
    execute 'grant select on public.public_creators to service_role';
    execute 'grant select on public.public_payment_methods to service_role';
    execute 'grant select on public.public_support_claims to service_role';
    execute 'grant execute on function chanasta.crc16(text) to service_role';
    execute 'grant execute on function chanasta.take_rate_limit(text, integer, integer) to service_role';
    execute 'grant execute on function chanasta.resolve_ip_hash(text) to service_role';
    execute 'grant execute on function chanasta.quarantine_slug(text) to service_role';
    execute 'grant execute on function chanasta.purge_expired_claim_pii() to service_role';
    execute 'grant execute on function chanasta.purge_deleted_creators() to service_role';
    execute 'grant execute on function chanasta.purge_expired_slug_quarantine() to service_role';
    execute 'grant execute on function public.is_slug_available(text) to service_role';
    execute 'grant execute on function public.submit_support_claim(text, numeric, text, text, text, text, text) to service_role';
    execute 'grant execute on function public.review_support_claim(uuid, text) to service_role';
    execute 'grant execute on function public.creator_set_status(text) to service_role';
    execute 'grant execute on function public.creator_change_slug(text) to service_role';
    execute 'grant execute on function public.creator_claim_counts() to service_role';
    execute 'grant execute on function public.creator_reorder_payment_methods(uuid[]) to service_role';
  else
    raise notice 'service_role does not exist; skipping Supabase service-role grants';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- End of schema. Money never lives here.
-- ----------------------------------------------------------------------------
