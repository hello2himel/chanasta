-- ============================================================================
-- Chanasta — synthetic demo seed (idempotent, OPTIONAL)
-- ============================================================================
--
-- Apply AFTER `supabase/schema.sql`, only on a demo/staging project:
--
--   psql "$DATABASE_URL" -f supabase/schema.sql
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- or paste both into the Supabase SQL editor. Re-running this file is safe:
-- every row has a fixed UUID and upserts by primary key.
--
-- EVERY ROW HERE IS SYNTHETIC. There are no real people, phone numbers,
-- transaction ids, QR accounts or bank details:
--   * demo creators: demo-teacher / demo-artist / demo-writer (names literally
--     say DEMO / ডেমো);
--   * fake account prefix 01000000000 (an unassignable operator prefix);
--   * fake MFS numbers 01000000002 / 01000000001 / 01000000003;
--   * fake bank account 0000000000000 + routing 000000000;
--   * Bangla QR payloads generated in the same NPSB shape as
--     ../deshiQR/docs/demo-payloads.md, with a valid CRC-16/CCITT-FALSE
--     checksum and the synthetic merchant names DEMO TEACHER / DEMO ARTIST /
--     DEMO WRITER. They are not issued by any provider.
--
-- This seed also creates three fake `auth.users` rows so the demo creators have
-- owners (the dashboard needs a logged-in user). Do not use these accounts in
-- production; sign-in by magic link will never deliver mail to the .invalid
-- addresses.
--
-- Money never lives in this database. The claims below are self-reported
-- messages (৳50 "শুভেচ্ছা রইল"), not payments.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Fake auth users (owners of the demo pages)
-- ----------------------------------------------------------------------------
-- Minimal column set that exists on both Supabase's auth.users and the PGlite
-- test stub. These accounts cannot receive magic links (example.invalid).
insert into auth.users (id, email, aud, role)
values
  ('a0000000-0000-4000-8000-000000000001', 'demo-teacher@chanasta.example.invalid', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000002', 'demo-artist@chanasta.example.invalid',  'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000003', 'demo-writer@chanasta.example.invalid',  'authenticated', 'authenticated')
on conflict (id) do update
  set email = excluded.email,
      aud   = excluded.aud,
      role  = excluded.role;


-- ----------------------------------------------------------------------------
-- 2. Demo creators (published, verified = false, clearly DEMO in both languages)
-- ----------------------------------------------------------------------------
-- `verified` stays false: no identity review happened (Lead decision #3).
-- `goal_amount_bdt` stays null: no goal/progress UI ships in MVP.
insert into public.creators (
  id, user_id, slug, display_name, tagline, bio, avatar_emoji, socials,
  default_locale, status, verified, published_at, created_at
)
values
  (
    'c0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'demo-teacher',
    'ডেমো শিক্ষক (DEMO Teacher)',
    'গণিত শেখাই — এটি একটি ডেমো পেজ / I teach maths — a demo page',
    'এটি চানাস্তার একটি সিন্থেটিক ডেমো পেজ। কোনো বাস্তব শিক্ষক, ফোন নম্বর বা পেমেন্ট অ্যাকাউন্ট ব্যবহার করা হয়নি। / This is a synthetic Chanasta demo page. No real teacher, phone number or payment account is used.',
    '📚',
    '{"website":"https://example.com/chanasta-demo-teacher"}'::jsonb,
    'bn',
    'published',
    false,
    now() - interval '14 days',
    now() - interval '20 days'
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'demo-artist',
    'ডেমো শিল্পী (DEMO Artist)',
    'ছবি আঁকি — এটি একটি ডেমো পেজ / I draw — a demo page',
    'এটি চানাস্তার একটি সিন্থেটিক ডেমো পেজ। কোনো বাস্তব শিল্পী বা পেমেন্ট অ্যাকাউন্ট ব্যবহার করা হয়নি। / This is a synthetic Chanasta demo page. No real artist or payment account is used.',
    'ri-palette-line',
    '{"website":"https://example.com/chanasta-demo-artist"}'::jsonb,
    'bn',
    'published',
    false,
    now() - interval '9 days',
    now() - interval '15 days'
  ),
  (
    'c0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000003',
    'demo-writer',
    'ডেমো লেখক (DEMO Writer)',
    'গল্প লিখি — এটি একটি ডেমো পেজ / I write stories — a demo page',
    'এটি চানাস্তার একটি সিন্থেটিক ডেমো পেজ। কোনো বাস্তব লেখক বা পেমেন্ট অ্যাকাউন্ট ব্যবহার করা হয়নি। / This is a synthetic Chanasta demo page. No real writer or payment account is used.',
    'ri-quill-pen-line',
    '{"website":"https://example.com/chanasta-demo-writer"}'::jsonb,
    'bn',
    'published',
    false,
    now() - interval '4 days',
    now() - interval '10 days'
  )
on conflict (id) do update
  set user_id       = excluded.user_id,
      slug          = excluded.slug,
      display_name  = excluded.display_name,
      tagline       = excluded.tagline,
      bio           = excluded.bio,
      avatar_emoji  = excluded.avatar_emoji,
      socials       = excluded.socials,
      default_locale = excluded.default_locale,
      status        = excluded.status,
      verified      = excluded.verified,
      published_at  = excluded.published_at;


-- ----------------------------------------------------------------------------
-- 3. Payment methods (the creators' OWN synthetic accounts)
-- ----------------------------------------------------------------------------
-- The bKash rows carry a valid synthesis of the NPSB Bangla QR shape: the CRC
-- is a real CRC-16/CCITT-FALSE over everything before the trailing checksum, so
-- the `payment_methods_qr_payload_is_valid` CHECK passes. qr_status='verified'
-- only because the DB can prove the payload + decoded NPSB institution; it
-- never means money arrived.
insert into public.payment_methods (
  id, creator_id, kind, label, account_number, account_holder,
  bank_name, branch, routing_number, qr_payload, qr_status, qr_decoded,
  sort_order, enabled
)
values
  -- demo-teacher: verified bKash Bangla QR + manual Nagad + demo bank
  (
    'b0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'bkash',
    'বিকাশ QR / bKash QR (verified)',
    '01000000000',
    'ডেমো শিক্ষক (DEMO Teacher)',
    null, null, null,
    '00020101021126470014bd.org.bb.npsb010202020420020311010000000005204601653030505802BD5912DEMO TEACHER6005Dhaka62060602FT80660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBBIG5vdCByZWFsISE=81660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBCIG5vdCByZWFsISE=63047513',
    'verified',
    '{"merchant_name":"DEMO TEACHER","merchant_city":"Dhaka","account_mask":"01000•••000","institution":"bd.org.bb.npsb","reference":null,"kind":"static","decoded_at":"2026-10-01T00:00:00+00:00"}'::jsonb,
    0, true
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000001',
    'nagad',
    'নগদ নম্বর / Nagad number',
    '01000000001',
    'ডেমো শিক্ষক (DEMO Teacher)',
    null, null, null, null, 'none', null,
    1, true
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    'c0000000-0000-4000-8000-000000000001',
    'bank',
    'ডেমো ব্যাংক / Demo bank account',
    '0000000000000',
    'ডেমো শিক্ষক (DEMO Teacher)',
    'ডেমো ব্যাংক (Demo Bank)',
    'ঢাকা / Dhaka',
    '000000000',
    null, 'none', null,
    2, true
  ),
  -- demo-artist: verified bKash Bangla QR + manual Rocket number
  (
    'b0000000-0000-4000-8000-000000000004',
    'c0000000-0000-4000-8000-000000000002',
    'bkash',
    'বিকাশ QR / bKash QR (verified)',
    '01000000001',
    'ডেমো শিল্পী (DEMO Artist)',
    null, null, null,
    '00020101021126470014bd.org.bb.npsb010202020420020311010000000015204601653030505802BD5911DEMO ARTIST6010Chattogram62060602FT80660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBBIG5vdCByZWFsISE=81660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBCIG5vdCByZWFsISE=63049EF9',
    'verified',
    '{"merchant_name":"DEMO ARTIST","merchant_city":"Chattogram","account_mask":"01000•••001","institution":"bd.org.bb.npsb","reference":null,"kind":"static","decoded_at":"2026-10-01T00:00:00+00:00"}'::jsonb,
    0, true
  ),
  (
    'b0000000-0000-4000-8000-000000000005',
    'c0000000-0000-4000-8000-000000000002',
    'rocket',
    'রকেট নম্বর / Rocket number',
    '01000000002',
    'ডেমো শিল্পী (DEMO Artist)',
    null, null, null, null, 'none', null,
    1, true
  ),
  -- demo-writer: verified bKash Bangla QR + manual Nagad number
  (
    'b0000000-0000-4000-8000-000000000006',
    'c0000000-0000-4000-8000-000000000003',
    'bkash',
    'বিকাশ QR / bKash QR (verified)',
    '01000000002',
    'ডেমো লেখক (DEMO Writer)',
    null, null, null,
    '00020101021126470014bd.org.bb.npsb010202020420020311010000000025204601653030505802BD5911DEMO WRITER6006Sylhet62060602FT80660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBBIG5vdCByZWFsISE=81660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBCIG5vdCByZWFsISE=6304A9AC',
    'verified',
    '{"merchant_name":"DEMO WRITER","merchant_city":"Sylhet","account_mask":"01000•••002","institution":"bd.org.bb.npsb","reference":null,"kind":"static","decoded_at":"2026-10-01T00:00:00+00:00"}'::jsonb,
    0, true
  ),
  (
    'b0000000-0000-4000-8000-000000000007',
    'c0000000-0000-4000-8000-000000000003',
    'nagad',
    'নগদ নম্বর / Nagad number',
    '01000000003',
    'ডেমো লেখক (DEMO Writer)',
    null, null, null, null, 'none', null,
    1, true
  )
on conflict (id) do update
  set creator_id     = excluded.creator_id,
      kind           = excluded.kind,
      label          = excluded.label,
      account_number = excluded.account_number,
      account_holder = excluded.account_holder,
      bank_name      = excluded.bank_name,
      branch         = excluded.branch,
      routing_number = excluded.routing_number,
      qr_payload     = excluded.qr_payload,
      qr_status      = excluded.qr_status,
      qr_decoded     = excluded.qr_decoded,
      sort_order     = excluded.sort_order,
      enabled        = excluded.enabled;


-- ----------------------------------------------------------------------------
-- 4. Synthetic support claims (self-reported messages, NOT payments)
-- ----------------------------------------------------------------------------
-- Covers every public/private claim state the UI needs:
--   * unverified (visible, self-reported badge)  -> teacher ৳50, artist ৳500, writer ৳100
--   * confirmed  (visible, creator-confirmed badge) -> teacher ৳100, artist ৳200
--   * hidden     (not public, owner dashboard only) -> teacher ৳20
-- `txid` values are obviously fake (DEMOTX...); ip_hash is null because no real
-- request was made. Rejected claims are moderation-only and are created by the
-- runbook, not by this seed.
insert into public.support_claims (
  id, creator_id, amount_bdt, payment_method_id, method_kind,
  supporter_name, message, txid, status, confirmed_at, hidden_at, created_at
)
values
  (
    'f0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    50.00,
    'b0000000-0000-4000-8000-000000000001',
    'bkash',
    'রহিম উদ্দিন (ডেমো)',
    'স্যারের ক্লাস থেকে অনেক উপকৃত হয়েছি। এক কাপ চা আর নাস্তার জন্য শুভেচ্ছা!',
    'DEMOTX0001',
    'unverified', null, null,
    now() - interval '3 days'
  ),
  (
    'f0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000001',
    100.00,
    'b0000000-0000-4000-8000-000000000002',
    'nagad',
    'ডেমো শুভানুধ্যায়ী',
    'আপনার লেখা পড়ে ভালো লেগেছে।',
    null,
    'confirmed', now() - interval '1 day', null,
    now() - interval '2 days'
  ),
  (
    'f0000000-0000-4000-8000-000000000003',
    'c0000000-0000-4000-8000-000000000001',
    20.00,
    'b0000000-0000-4000-8000-000000000003',
    'bank',
    'একজন ডেমো',
    'ছোট্ট শুভেচ্ছা।',
    null,
    'hidden', null, now() - interval '12 hours',
    now() - interval '5 days'
  ),
  (
    'f0000000-0000-4000-8000-000000000004',
    'c0000000-0000-4000-8000-000000000002',
    500.00,
    'b0000000-0000-4000-8000-000000000004',
    'bkash',
    'ডেমো ভক্ত',
    'আপনার আঁকা ছবি দুর্দান্ত! এক কাপ চা খেয়ে নিন।',
    'DEMOTX0002',
    'unverified', null, null,
    now() - interval '1 day'
  ),
  (
    'f0000000-0000-4000-8000-000000000005',
    'c0000000-0000-4000-8000-000000000002',
    200.00,
    'b0000000-0000-4000-8000-000000000004',
    'bkash',
    'শিল্পপ্রেমী (ডেমো)',
    'নতুন ছবির জন্য শুভকামনা।',
    null,
    'confirmed', now() - interval '6 hours', null,
    now() - interval '2 days'
  ),
  (
    'f0000000-0000-4000-8000-000000000006',
    'c0000000-0000-4000-8000-000000000003',
    100.00,
    'b0000000-0000-4000-8000-000000000007',
    'nagad',
    'পাঠক (ডেমো)',
    'গল্পটা দারুণ ছিল। আপনার জন্য এক প্লেট নাস্তা।',
    null,
    'unverified', null, null,
    now() - interval '8 hours'
  )
on conflict (id) do update
  set creator_id        = excluded.creator_id,
      amount_bdt        = excluded.amount_bdt,
      payment_method_id = excluded.payment_method_id,
      method_kind       = excluded.method_kind,
      supporter_name    = excluded.supporter_name,
      message           = excluded.message,
      txid              = excluded.txid,
      status            = excluded.status,
      confirmed_at      = excluded.confirmed_at,
      hidden_at         = excluded.hidden_at,
      created_at        = excluded.created_at;

-- Seed summary (visible when run in psql / SQL editor):
--   creators:        3 published demos
--   methods:         7 (3 bKash verified QR, 2 Nagad, 1 Rocket, 1 bank)
--   claims:          6 (3 unverified, 2 confirmed, 1 hidden)
-- Money moved:      none — this product never touches it.
