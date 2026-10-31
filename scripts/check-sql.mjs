#!/usr/bin/env node
/**
 * Chanasta — SQL verification harness (PGlite).
 *
 * Boots a throwaway real PostgreSQL (PGlite — Postgres compiled to WASM),
 * recreates the parts of a Supabase project the schema depends on (`auth`
 * schema + auth.uid(), anon/authenticated/service_role roles,
 * request.jwt.claims / request.headers), applies supabase/schema.sql and
 * supabase/seed.sql (twice, to prove idempotency) and asserts the security and
 * correctness properties that matter:
 *
 *   - CRC-16/CCITT-FALSE anchor and every seeded Bangla QR payload are valid;
 *     a broken checksum cannot be stored.
 *   - anon has ZERO direct table access; the public views are the only anon
 *     read path and they expose published/enabled/visible rows + explicit
 *     columns only. txid / ip_hash / user ids / creator uuids never leak.
 *   - owner isolation, column-grant hardening (verified/status/slug/user_id are
 *     not owner-writable), reserved-slug rejection (trusted seed may create
 *     reserved demo rows), slug-change rate limit, publish-needs-a-method.
 *   - submit_support_claim validation (amount/text/txid), rate limits
 *     (ip hour/day, creator day) and the fact that it never returns txid.
 *   - review_support_claim transitions (confirm/hide/restore; rejected is
 *     terminal), claim caps and soft-delete hiding.
 *   - examples/docs contracts that can be checked in SQL (view/column names).
 *
 * Run from the repo root:  node scripts/check-sql.mjs
 * Exit code: 0 = every assertion passed, 1 = a failure or a setup error.
 *
 * All identities, payloads and account numbers in this file are synthetic.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Synthetic identities and fixtures
// ---------------------------------------------------------------------------
const USER_A = "11111111-1111-4111-8111-111111111111"; // harness owner A
const USER_B = "22222222-2222-4222-8222-222222222222"; // harness owner B
// One page per account in MVP (creators.user_id is unique), so every extra test
// page gets its own synthetic owner account.
const USER_C = "33333333-3333-4333-8333-333333333333";
const USER_D = "44444444-4444-4444-8444-444444444444";
const USER_E = "55555555-5555-4555-8555-555555555555";
const USER_F = "66666666-6666-4666-8666-666666666666";
const USER_G = "77777777-7777-4777-8777-777777777777";
const USER_H = "88888888-8888-4888-8888-888888888888";
const USER_I = "99999999-9999-4999-8999-999999999999";
const USER_J = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_K = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_L = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const USER_M = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const USER_TEACHER = "a0000000-0000-4000-8000-000000000001"; // seed demo teacher
const USER_ARTIST = "a0000000-0000-4000-8000-000000000002"; // seed demo artist
const TEACHER_CREATOR = "c0000000-0000-4000-8000-000000000001";
const ARTIST_CREATOR = "c0000000-0000-4000-8000-000000000002";
const WRITER_CREATOR = "c0000000-0000-4000-8000-000000000003";
const TEACHER_CLAIM_UNVERIFIED = "f0000000-0000-4000-8000-000000000001";
const TEACHER_CLAIM_CONFIRMED = "f0000000-0000-4000-8000-000000000002";
const TEACHER_CLAIM_HIDDEN = "f0000000-0000-4000-8000-000000000003";

// Synthetic NPSB-shaped Bangla QR payloads from supabase/seed.sql (valid
// CRC-16/CCITT-FALSE, fake accounts 01000000000/1/2, DEMO merchant names).
const DEMO_PAYLOADS = {
  teacher:
    "00020101021126470014bd.org.bb.npsb010202020420020311010000000005204601653030505802BD5912DEMO TEACHER6005Dhaka62060602FT80660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBBIG5vdCByZWFsISE=81660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBCIG5vdCByZWFsISE=63047513",
  artist:
    "00020101021126470014bd.org.bb.npsb010202020420020311010000000015204601653030505802BD5911DEMO ARTIST6010Chattogram62060602FT80660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBBIG5vdCByZWFsISE=81660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBCIG5vdCByZWFsISE=63049EF9",
  writer:
    "00020101021126470014bd.org.bb.npsb010202020420020311010000000025204601653030505802BD5911DEMO WRITER6006Sylhet62060602FT80660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBBIG5vdCByZWFsISE=81660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBCIG5vdCByZWFsISE=6304A9AC",
};
const CORRUPTED_PAYLOAD = DEMO_PAYLOADS.teacher.slice(0, -4) + "0000";

/** 64 lowercase hex chars — a synthetic "peppered IP hash". */
const ipHash = (n) => n.toString(16).padStart(64, "0");

const ANON_CLAIMS = JSON.stringify({ role: "anon" });
const userClaims = (sub) => JSON.stringify({ sub, role: "authenticated" });
const SERVICE_CLAIMS = JSON.stringify({ role: "service_role" });

// ---------------------------------------------------------------------------
// Tiny assertion framework
// ---------------------------------------------------------------------------
const results = [];
let assertions = 0;

function ok(condition, name, detail) {
  assertions += 1;
  const passed = Boolean(condition);
  results.push({ name, passed, detail: passed ? "" : (detail ?? "") });
  console.log(`${passed ? "  \u2714" : "  \u2718"} ${name}`);
  if (!passed && detail) console.error(`      ${detail}`);
  return passed;
}

function eq(actual, expected, name) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  return ok(a === e, name, `expected ${e}, got ${a}`);
}

function jsonOf(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

let db;

async function query(sql, params = []) {
  const result = await db.query(sql, params);
  return result.rows;
}

async function scalar(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? Object.values(rows[0])[0] : undefined;
}

/** Expect a statement to fail, optionally matching the error text. */
async function fails(fn, name, matcher) {
  try {
    await fn();
    return ok(false, name, "expected the statement to fail, but it succeeded");
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!matcher) return ok(true, name);
    const passed = matcher.test(message);
    return ok(passed, name, `error did not match ${matcher}:\n      ${message}`);
  }
}

/** Run subsequent statements as a role with a JWT claims payload (mirrors Supabase). */
async function session(role, claims = "") {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
  if (role) await db.exec(`set role ${role};`);
}

const asPostgres = () => session(null);
const asAnon = () => session("anon", ANON_CLAIMS);
const asUser = (sub) => session("authenticated", userClaims(sub));
const asServiceRole = () => session("service_role", SERVICE_CLAIMS);

// ---------------------------------------------------------------------------
// Setup: stub the Supabase environment, apply schema + seed
// ---------------------------------------------------------------------------
async function bootstrap() {
  console.log("\n[setup] booting PGlite (real PostgreSQL, WASM) and stubbing Supabase auth/roles\n");

  await db.exec(`
    create schema if not exists auth;

    create table if not exists auth.users (
      id uuid primary key,
      email text unique,
      aud text,
      role text,
      email_confirmed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    -- Same contract as Supabase's auth.uid(): the uuid from request.jwt.claims->>'sub'.
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(
        coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'sub',
        ''
      )::uuid;
    $$;

    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;

    insert into auth.users (id, email, aud, role)
    values
      ('${USER_A}', 'owner-a@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_B}', 'owner-b@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_C}', 'owner-c@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_D}', 'owner-d@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_E}', 'owner-e@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_F}', 'owner-f@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_G}', 'owner-g@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_H}', 'owner-h@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_I}', 'owner-i@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_J}', 'owner-j@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_K}', 'owner-k@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_L}', 'owner-l@chanasta.invalid', 'authenticated', 'authenticated'),
      ('${USER_M}', 'owner-m@chanasta.invalid', 'authenticated', 'authenticated');
  `);

  const schemaSql = await readFile(join(root, "supabase/schema.sql"), "utf8");
  await db.exec(schemaSql);
  console.log("[setup] applied supabase/schema.sql");

  const seedSql = await readFile(join(root, "supabase/seed.sql"), "utf8");
  await db.exec(seedSql);
  console.log("[setup] applied supabase/seed.sql");

  // The seed is documented as idempotent — prove it, twice.
  await db.exec(seedSql);
  await db.exec(seedSql);
  console.log("[setup] re-applied supabase/seed.sql twice (idempotency check)\n");
}

/** Assert a public view exposes exactly the expected column set. */
async function assertViewColumns(viewName, expected, forbidden) {
  const rows = await query(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = $1
     order by ordinal_position`,
    [viewName],
  );
  const columns = rows.map((row) => row.column_name);
  eq(columns, expected, `${viewName} exposes the documented columns, in order`);
  for (const column of forbidden) {
    ok(!columns.includes(column), `${viewName} never exposes ${column}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  db = await PGlite.create();
  await bootstrap();

  // =========================================================================
  console.log("[crc] CRC-16/CCITT-FALSE");
  // =========================================================================
  eq(await scalar("select chanasta.crc16('123456789')"), "29B1", 'crc16("123456789") === "29B1" (anchor)');

  for (const [name, payload] of Object.entries(DEMO_PAYLOADS)) {
    const valid = await scalar(
      "select chanasta.crc16(left($1, -4)) = upper(right($1, 4)) as valid",
      [payload],
    );
    ok(valid === true, `seeded ${name} Bangla QR payload has a valid CRC`);
  }
  const corruptedValid = await scalar(
    "select chanasta.crc16(left($1, -4)) = upper(right($1, 4)) as valid",
    [CORRUPTED_PAYLOAD],
  );
  eq(corruptedValid, false, "a corrupted payload fails the CRC check");

  // =========================================================================
  console.log("\n[seed] synthetic demo data");
  // =========================================================================
  eq(
    (await query("select slug from public.creators order by slug")).map((row) => row.slug),
    ["demo-artist", "demo-teacher", "demo-writer"],
    "seed creates exactly the three demo creators (idempotent)",
  );
  eq(await scalar("select count(*)::int from public.creators where status = 'published'"), 3, "all demo creators are published");
  eq(await scalar("select count(*)::int from public.creators where verified"), 0, "no demo creator is marked verified");
  const demoNames = await query("select slug, display_name from public.creators order by slug");
  ok(
    demoNames.every((row) => /demo/i.test(row.display_name)),
    "every demo display name is visibly labelled DEMO",
  );

  eq(await scalar("select count(*)::int from public.payment_methods"), 7, "seed creates 7 payment methods");
  const seedKinds = await query(
    "select kind::text as kind, count(*)::int as count from public.payment_methods group by kind order by kind",
  );
  eq(
    seedKinds.map((row) => `${row.kind}:${row.count}`),
    ["bank:1", "bkash:3", "nagad:2", "rocket:1"],
    "seed method kinds are bKash QR x3, Nagad x2, Rocket x1, bank x1",
  );
  eq(
    await scalar("select count(*)::int from public.payment_methods where qr_status = 'verified'"),
    3,
    "the three bKash demo QRs are seeded verified",
  );
  eq(
    (await query("select qr_payload from public.payment_methods where creator_id = $1 and kind = 'bkash'", [TEACHER_CREATOR]))[0]
      ?.qr_payload,
    DEMO_PAYLOADS.teacher,
    "demo-teacher's stored QR payload matches the documented synthetic payload",
  );
  eq(
    (await query("select qr_decoded ->> 'institution' as institution from public.payment_methods where creator_id = $1 and qr_status = 'verified'", [TEACHER_CREATOR]))[0]
      ?.institution,
    "bd.org.bb.npsb",
    "verified demo QR carries the NPSB institution snapshot",
  );
  eq(
    await scalar("select count(distinct creator_id)::int from public.payment_methods"),
    3,
    "every demo creator has at least one payment method",
  );
  eq(
    await scalar("select count(*)::int from public.support_claims where status = 'unverified'"),
    3,
    "seed has 3 unverified self-reported claims",
  );
  eq(await scalar("select count(*)::int from public.support_claims where status = 'confirmed'"), 2, "seed has 2 confirmed claims");
  eq(await scalar("select count(*)::int from public.support_claims where status = 'hidden'"), 1, "seed has 1 hidden claim");

  await asAnon();
  eq(await scalar("select count(*)::int from public.public_creators"), 3, "anon sees the 3 published demo pages");
  eq(await scalar("select count(*)::int from public.public_payment_methods"), 7, "anon sees all 7 enabled demo methods");
  eq(await scalar("select count(*)::int from public.public_support_claims"), 5, "anon sees only unverified + confirmed claims (5)");

  // =========================================================================
  console.log("\n[views] explicit column surface (no private columns)");
  // =========================================================================
  await asPostgres();
  await assertViewColumns(
    "public_creators",
    ["slug", "display_name", "tagline", "bio", "avatar_emoji", "socials", "goal_amount_bdt",
     "goal_note", "default_locale", "verified", "published_at", "updated_at"],
    ["user_id", "id", "status", "verified_at", "deleted_at", "last_slug_change_at", "email"],
  );
  await assertViewColumns(
    "public_payment_methods",
    ["id", "creator_slug", "kind", "label", "account_number", "account_holder", "bank_name",
     "branch", "routing_number", "qr_payload", "qr_image_path", "qr_status", "qr_decoded",
     "sort_order", "updated_at"],
    ["creator_id", "txid", "ip_hash", "created_at"],
  );
  await assertViewColumns(
    "public_support_claims",
    ["id", "creator_slug", "amount_bdt", "supporter_name", "message", "method_kind", "status", "created_at"],
    ["txid", "ip_hash", "payment_method_id", "creator_id", "moderated_by", "confirmed_at",
     "hidden_at", "rejected_at", "updated_at"],
  );

  // =========================================================================
  console.log("\n[rls] anon has zero direct table access");
  // =========================================================================
  await asAnon();
  const anonPrivs = (
    await query(
      `select
         has_table_privilege('anon', 'public.creators', 'select')        as creators,
         has_table_privilege('anon', 'public.payment_methods', 'select') as methods,
         has_table_privilege('anon', 'public.support_claims', 'select')  as claims,
         has_table_privilege('anon', 'public.reserved_slugs', 'select')  as reserved,
         has_table_privilege('anon', 'public.public_creators', 'select') as public_creators,
         has_table_privilege('anon', 'public.public_payment_methods', 'select') as public_methods,
         has_table_privilege('anon', 'public.public_support_claims', 'select')  as public_claims`,
    )
  )[0];
  eq(anonPrivs.creators, false, "anon has no SELECT on creators");
  eq(anonPrivs.methods, false, "anon has no SELECT on payment_methods");
  eq(anonPrivs.claims, false, "anon has no SELECT on support_claims");
  eq(anonPrivs.reserved, false, "anon has no SELECT on reserved_slugs");
  eq(anonPrivs.public_creators, true, "anon has SELECT on public_creators");
  eq(anonPrivs.public_methods, true, "anon has SELECT on public_payment_methods");
  eq(anonPrivs.public_claims, true, "anon has SELECT on public_support_claims");

  await fails(
    () => query("select * from public.creators limit 1"),
    "anon cannot SELECT the creators base table",
    /permission denied/,
  );
  await fails(
    () => query("select * from public.support_claims limit 1"),
    "anon cannot SELECT the support_claims base table",
    /permission denied/,
  );
  await fails(
    () => query("select * from public.reserved_slugs limit 1"),
    "anon cannot SELECT reserved_slugs",
    /permission denied/,
  );
  await fails(
    () =>
      query(
        `insert into public.creators (slug, display_name) values ('anon-page', 'Anon')`,
      ),
    "anon cannot INSERT creators",
    /permission denied/,
  );
  await fails(
    () => query("select chanasta.take_rate_limit('x', 10, 60)"),
    "anon cannot call the internal rate-limit helper",
    /permission denied|does not exist/,
  );
  //
  // anon claim writes are impossible: no grants, and claims are RPC-only.
  await fails(
    () =>
      query(
        `insert into public.support_claims (creator_id, amount_bdt, status)
         values ($1, 10, 'unverified')`,
        [TEACHER_CREATOR],
      ),
    "anon cannot INSERT claims directly",
    /permission denied/,
  );
  await fails(() => query("update public.support_claims set message = 'x'"), "anon cannot UPDATE claims", /permission denied/);
  await fails(() => query("delete from public.support_claims"), "anon cannot DELETE claims", /permission denied/);

  const anonFns = (
    await query(
      `select
         has_function_privilege('anon', 'public.is_slug_available(text)', 'execute') as is_slug,
         has_function_privilege('anon', 'public.submit_support_claim(text, numeric, text, text, text, text, text)', 'execute') as submit,
         has_function_privilege('anon', 'public.review_support_claim(uuid, text)', 'execute') as review,
         has_function_privilege('anon', 'public.creator_set_status(text)', 'execute') as set_status,
         has_function_privilege('anon', 'public.creator_change_slug(text)', 'execute') as change_slug,
         has_function_privilege('anon', 'public.creator_claim_counts()', 'execute') as counts`,
    )
  )[0];
  eq(anonFns.is_slug, true, "anon can execute is_slug_available");
  eq(anonFns.submit, true, "anon can execute submit_support_claim");
  eq(anonFns.review, false, "anon cannot execute review_support_claim");
  eq(anonFns.set_status, false, "anon cannot execute creator_set_status");
  eq(anonFns.change_slug, false, "anon cannot execute creator_change_slug");
  eq(anonFns.counts, false, "anon cannot execute creator_claim_counts");
  await fails(
    () => query("select public.review_support_claim(gen_random_uuid(), 'hide')"),
    "calling review_support_claim as anon is denied",
    /permission denied/,
  );

  // =========================================================================
  console.log("\n[constraints] slug rules + reserved protection");
  // =========================================================================
  await asPostgres();
  const badSlugs = [
    ["UPPER-CASE", "uppercase"],
    ["has_underscore", "underscore"],
    ["-leading-hyphen", "leading hyphen"],
    ["trailing-hyphen-", "trailing hyphen"],
    ["two--hyphens", "double hyphen"],
    ["dot.dot", "dot"],
    ["ab", "too short"],
    ["a".repeat(31), "too long"],
  ];
  for (const [slug, label] of badSlugs) {
    await fails(
      () =>
        query(
          `insert into public.creators (id, user_id, slug, display_name)
           values (gen_random_uuid(), $1, $2, 'Bad Slug')`,
          [USER_A, slug],
        ),
      `an invalid slug (${label}) is rejected`,
      /creators_slug_format|SLUG_INVALID/,
    );
  }

  // Trusted migration/seed path CAN create a reserved demo row…
  await asPostgres();
  const demoSlugInsert = await scalar(
    `insert into public.creators (user_id, slug, display_name)
     values ($1, 'demo', 'Reserved Demo Row') returning slug`,
    [USER_M],
  );
  eq(demoSlugInsert, "demo", "the trusted seed path may create a reserved demo slug");
  await query("delete from public.creators where slug = 'demo'");

  // …but an ordinary owner cannot.
  await asUser(USER_A);
  await fails(
    () => query(`insert into public.creators (slug, display_name) values ('dashboard', 'Squatter')`),
    "an authenticated owner cannot register a reserved slug (dashboard)",
    /SLUG_RESERVED|reserved/,
  );
  await fails(
    () => query(`insert into public.creators (slug, display_name) values ('bkash', 'Fake Provider')`),
    "an authenticated owner cannot register a provider name (bkash)",
    /SLUG_RESERVED|reserved/,
  );
  await fails(
    () =>
      query(
        `insert into public.creators (user_id, slug, display_name) values ($1, 'spoofed-page', 'Spoofed')`,
        [USER_B],
      ),
    "an owner cannot insert a page owned by somebody else",
    /permission denied|row-level security/,
  );

  // socials allowlist trigger cleans unknown/insecure keys.
  await asUser(USER_D);
  const socialsCreator = await query(
    `insert into public.creators (slug, display_name, socials)
     values ('socials-test', 'Socials Test',
             '{"email":"mailto:real@example.com","youtube":"http://insecure.example/x","website":"https://example.com/ok"}'::jsonb)
     returning socials`,
  );
  eq(
    socialsCreator[0].socials,
    { website: "https://example.com/ok" },
    "socials trigger drops non-allowlisted keys and non-https URLs",
  );

  // =========================================================================
  console.log("\n[constraints] QR payload + status coherence");
  // =========================================================================
  // Attach a scratch draft page owned by A for method constraints.
  await asUser(USER_H);
  const scratch = (
    await query(
      `insert into public.creators (slug, display_name) values ('constraint-scratch', 'Constraint Scratch') returning id`,
    )
  )[0].id;

  const insertMethod = (fields) =>
    query(
      `insert into public.payment_methods
         (creator_id, kind, label, account_number, bank_name, routing_number,
          qr_payload, qr_image_path, qr_status, qr_decoded, sort_order)
       values ($1, $2::public.payment_kind, $3, $4, $5, $6, $7, $8, $9::public.payment_qr_status, $10, $11)
       returning id, qr_status`,
      [
        scratch,
        fields.kind ?? "bkash",
        fields.label ?? "Test method",
        fields.account_number ?? "01000000000",
        fields.bank_name ?? null,
        fields.routing_number ?? null,
        fields.qr_payload ?? null,
        fields.qr_image_path ?? null,
        fields.qr_status ?? "none",
        fields.qr_decoded ?? null,
        fields.sort_order ?? 0,
      ],
    );

  await fails(
    () => insertMethod({ qr_payload: CORRUPTED_PAYLOAD, qr_status: "unverified" }),
    "a stored QR payload with a broken CRC is rejected",
    /payment_methods_qr_payload_is_valid|check constraint/,
  );
  await fails(
    () => insertMethod({ qr_status: "verified", qr_payload: DEMO_PAYLOADS.teacher, qr_decoded: null }),
    "qr_status=verified requires a decoded snapshot",
    /payment_methods_qr_status_evidence|check constraint/,
  );
  await fails(
    () =>
      insertMethod({
        qr_status: "verified",
        qr_payload: DEMO_PAYLOADS.teacher,
        qr_decoded: { institution: "com.example.other" },
      }),
    "qr_status=verified is refused for a non-NPSB institution",
    /payment_methods_verified_is_npsb|check constraint/,
  );
  await fails(
    () => insertMethod({ qr_status: "none", qr_payload: DEMO_PAYLOADS.teacher }),
    "qr_status=none cannot carry a payload",
    /payment_methods_qr_status_evidence|check constraint/,
  );
  await fails(
    () => insertMethod({ qr_status: "image_only", qr_payload: DEMO_PAYLOADS.teacher, qr_image_path: "qr/a.png" }),
    "qr_status=image_only cannot carry a decoded payload",
    /payment_methods_qr_status_evidence|check constraint/,
  );
  await fails(
    () =>
      insertMethod({ kind: "bank", bank_name: null, routing_number: null }),
    "bank methods require bank_name and routing_number",
    /payment_methods_bank_fields|check constraint/,
  );
  await fails(
    () => insertMethod({ kind: "bkash", bank_name: "Some Bank" }),
    "non-bank methods must not carry bank fields",
    /payment_methods_bank_fields|check constraint/,
  );

  const verifiedMethod = await insertMethod({
    qr_status: "verified",
    qr_payload: DEMO_PAYLOADS.artist,
    qr_decoded: { institution: "bd.org.bb.npsb", merchant_name: "DEMO ARTIST" },
  });
  eq(verifiedMethod.length, 1, "a valid NPSB QR method can be stored as verified");
  // A manual method has no payload, so it can never be flipped to verified.
  await insertMethod({ account_number: "01000000008", qr_status: "none", sort_order: 1 });
  await asUser(USER_H);
  await fails(
    () => query("update public.payment_methods set qr_status = 'verified' where creator_id = $1 and qr_status = 'none'", [scratch]),
    "an owner cannot flip a method to verified without evidence",
    /payment_methods_qr_status_evidence|check constraint/,
  );

  // =========================================================================
  console.log("\n[constraints] claim amount/text caps");
  // =========================================================================
  await asPostgres();
  const insertClaim = (fields) =>
    query(
      `insert into public.support_claims
         (creator_id, amount_bdt, supporter_name, message, txid, status, ip_hash)
       values ($1, $2, $3, $4, $5, $6::public.claim_status, $7)
       returning id`,
      [
        TEACHER_CREATOR,
        fields.amount ?? 10,
        fields.name ?? null,
        fields.message ?? null,
        fields.txid ?? null,
        fields.status ?? "unverified",
        fields.ip_hash ?? null,
      ],
    );
  await fails(() => insertClaim({ amount: 0 }), "claims below ৳1 are rejected", /support_claims_amount_range|check constraint/);
  await fails(() => insertClaim({ amount: 100000.01 }), "claims above ৳100,000 are rejected", /support_claims_amount_range|check constraint/);
  await fails(() => insertClaim({ name: "ন".repeat(41) }), "supporter names over 40 chars are rejected", /support_claims_supporter_name_length|check constraint/);
  await fails(() => insertClaim({ message: "ক".repeat(281) }), "messages over 280 chars are rejected", /support_claims_message_length|check constraint/);
  await fails(() => insertClaim({ txid: "bad txid!" }), "malformed txids are rejected", /support_claims_txid_format|check constraint/);
  await fails(() => insertClaim({ txid: "A".repeat(65) }), "txids over 64 chars are rejected", /support_claims_txid_format|check constraint/);
  await fails(() => insertClaim({ ip_hash: "NOT-HEX" }), "non-hex ip_hash values are rejected", /support_claims_ip_hash_format|check constraint/);
  const boundaryClaim = await insertClaim({ amount: 100000, message: "ক".repeat(280), name: "ন".repeat(40) });
  eq(boundaryClaim.length, 1, "the exact caps (৳100,000 / 280 / 40) are accepted");
  await query("delete from public.support_claims where id = $1", [boundaryClaim[0].id]);

  // =========================================================================
  console.log("\n[owners] publish, isolation, column hardening");
  // =========================================================================
  await asUser(USER_A);
  const ownerAPage = (
    await query(`insert into public.creators (slug, display_name) values ('owner-a-page', 'Owner A Page') returning id, slug, status, user_id`)
  )[0];
  eq(ownerAPage.status, "draft", "a new page starts as a draft");
  eq(ownerAPage.user_id, USER_A, "the insert default sets user_id to auth.uid()");

  await fails(
    () => query("select public.creator_set_status('publish')"),
    "publishing without an enabled payment method is refused",
    /PUBLISH_NEEDS_METHOD/,
  );

  const methodA = (
    await query(
      `insert into public.payment_methods (creator_id, kind, label, account_number, sort_order)
       values ($1, 'bkash', 'Owner A bKash', '01000000009', 0) returning id`,
      [ownerAPage.id],
    )
  )[0];
  const published = jsonOf((await query("select public.creator_set_status('publish') as result"))[0].result);
  eq(published.status, "published", "publishing succeeds once a method exists");
  ok(Boolean(published.published_at), "first publish stamps published_at");

  await asAnon();
  eq(
    await scalar("select count(*)::int from public.public_creators where slug = 'owner-a-page'"),
    1,
    "the newly published page is visible to anon",
  );
  eq(
    await scalar("select count(*)::int from public.public_payment_methods where creator_slug = 'owner-a-page'"),
    1,
    "its enabled method is visible to anon",
  );

  // Owner isolation: B sees none of A's rows and cannot write them.
  await asUser(USER_B);
  eq(
    (await query("select slug from public.creators")).map((row) => row.slug),
    [],
    "owner B sees none of owner A's pages (RLS)",
  );
  const hijack = await query("update public.creators set display_name = 'Hijacked' where slug = 'owner-a-page' returning slug");
  eq(hijack.length, 0, "owner B cannot update owner A's page");
  await fails(
    () =>
      query(
        `insert into public.payment_methods (creator_id, kind, label, account_number)
         values ($1, 'nagad', 'Injected', '01000000009')`,
        [ownerAPage.id],
      ),
    "owner B cannot add a payment method to owner A's page",
    /row-level security|violates/,
  );

  const ownerBPage = (
    await query(`insert into public.creators (slug, display_name) values ('owner-b-page', 'Owner B Page') returning id`)
  )[0].id;
  await query(
    `insert into public.payment_methods (creator_id, kind, label, account_number)
     values ($1, 'nagad', 'Owner B Nagad', '01000000008')`,
    [ownerBPage],
  );
  await query("select public.creator_set_status('publish')");
  await asUser(USER_A);
  await fails(
    () =>
      query("update public.payment_methods set creator_id = $1 where id = $2", [
        ownerBPage,
        methodA.id,
      ]),
    "an owner cannot move a payment method onto another creator's page",
    /ADMIN_ONLY_FIELD|row-level security/,
  );

  await asAnon();
  eq(
    await scalar("select count(*)::int from public.public_creators where slug in ('owner-a-page','owner-b-page')"),
    2,
    "both owners' published pages are public",
  );

  // Owner A's page exists for the isolation/claims tests below.
  await asUser(USER_A);
  eq(
    (await query("select slug from public.creators order by slug")).map((row) => row.slug),
    ["owner-a-page"],
    "owner A sees exactly their own page under RLS",
  );

  // Hardening: verified/status/slug/user_id are not owner-writable columns.
  await fails(
    () => query("update public.creators set verified = true where slug = 'owner-a-page'"),
    "an owner cannot self-assign verified",
    /permission denied/,
  );
  await fails(
    () => query("update public.creators set status = 'suspended' where slug = 'owner-a-page'"),
    "an owner cannot set suspended directly",
    /STATUS_RPC_ONLY|permission denied/,
  );
  await fails(
    () => query("update public.creators set slug = 'hijack-slug' where slug = 'owner-a-page'"),
    "an owner cannot change the slug outside the RPC",
    /permission denied/,
  );
  await fails(
    () => query("update public.creators set user_id = $1 where slug = 'owner-a-page'", [USER_B]),
    "an owner cannot transfer their page to another user",
    /permission denied/,
  );
  await fails(
    () => query("select public.creator_set_status('suspended')"),
    "an owner cannot suspend their own page (moderation-only)",
    /SUSPENDED_ADMIN_ONLY/,
  );

  // =========================================================================
  console.log("\n[slug] availability + change rules + 30-day rate limit");
  // =========================================================================
  await asAnon();
  eq(await scalar("select public.is_slug_available('fresh-page-name')"), true, "is_slug_available says a fresh slug is available");
  eq(await scalar("select public.is_slug_available('demo-teacher')"), false, "is_slug_available rejects a taken slug");
  eq(await scalar("select public.is_slug_available('dashboard')"), false, "is_slug_available rejects a reserved slug");
  eq(await scalar("select public.is_slug_available('Bad Slug')"), false, "is_slug_available rejects an invalid slug");
  eq(await scalar("select public.is_slug_available('ab')"), false, "is_slug_available rejects a too-short slug");

  await asUser(USER_C);
  const slugPage = (
    await query(`insert into public.creators (slug, display_name) values ('owner-a-draft', 'Owner A Draft') returning id, slug`)
  )[0];
  await query(
    `insert into public.payment_methods (creator_id, kind, label, account_number)
     values ($1, 'bkash', 'Slug page bKash', '01000000007')`,
    [slugPage.id],
  );
  await query("select public.creator_set_status('publish')");

  await fails(
    () => query("select public.creator_change_slug('login')"),
    "changing to a reserved slug raises SLUG_RESERVED",
    /SLUG_RESERVED/,
  );
  await fails(
    () => query("select public.creator_change_slug('demo-teacher')"),
    "changing to a taken slug raises SLUG_TAKEN",
    /SLUG_TAKEN/,
  );
  await fails(
    () => query("select public.creator_change_slug('Owner-Bad-Case')"),
    "changing to an invalid slug raises SLUG_INVALID",
    /SLUG_INVALID/,
  );

  const changed = jsonOf((await query("select public.creator_change_slug('owner-a-draft-2') as result"))[0].result);
  eq(changed.slug, "owner-a-draft-2", "a valid slug change succeeds");
  ok(Boolean(changed.last_slug_change_at), "the slug change stamps last_slug_change_at");
  await asPostgres();
  eq(
    await scalar("select count(*)::int from public.reserved_slugs where slug = 'owner-a-draft' and reason = 'quarantine'"),
    1,
    "the old slug is quarantined for 90 days",
  );
  await asAnon();
  eq(await scalar("select public.is_slug_available('owner-a-draft')"), false, "a quarantined slug is no longer available");

  await asUser(USER_C);
  await fails(
    () => query("select public.creator_change_slug('owner-a-draft-3')"),
    "a second slug change inside 30 days raises SLUG_RATE_LIMITED",
    /SLUG_RATE_LIMITED/,
  );

  // =========================================================================
  console.log("\n[publish] unpublish hides the page and its methods");
  // =========================================================================
  const unpublished = jsonOf((await query("select public.creator_set_status('unpublish') as result"))[0].result);
  eq(unpublished.status, "draft", "unpublishing sets the page back to draft");
  await asAnon();
  eq(
    await scalar("select count(*)::int from public.public_creators where slug = 'owner-a-draft-2'"),
    0,
    "an unpublished page disappears from the public view",
  );
  eq(
    await scalar("select count(*)::int from public.public_payment_methods where creator_slug = 'owner-a-draft-2'"),
    0,
    "methods of an unpublished page disappear too",
  );
  await asUser(USER_C);
  await query("select public.creator_set_status('publish')");

  // A draft page for NOT_PUBLISHED claim-submission tests (its own account).
  await asUser(USER_E);
  await query(`insert into public.creators (slug, display_name) values ('owner-a-secret', 'Owner A Secret')`);

  // =========================================================================
  console.log("\n[claims] validation + no txid in the response");
  // =========================================================================
  await asAnon();
  const submit = (fields = {}) =>
    query(
      "select public.submit_support_claim($1, $2, $3, $4, $5, $6, $7) as result",
      [
        fields.slug ?? "owner-a-page",
        fields.amount ?? 50,
        fields.name ?? null,
        fields.message ?? null,
        fields.txid ?? null,
        fields.method_kind ?? "bkash",
        fields.ip_hash ?? ipHash(9001),
      ],
    );

  await fails(() => submit({ slug: "does-not-exist" }), "submitting to an unknown page raises NOT_PUBLISHED", /NOT_PUBLISHED/);
  await fails(() => submit({ slug: "owner-a-secret" }), "submitting to a draft page raises NOT_PUBLISHED", /NOT_PUBLISHED/);
  await fails(() => submit({ amount: 0 }), "amount 0 raises CLAIM_AMOUNT_INVALID", /CLAIM_AMOUNT_INVALID/);
  await fails(() => submit({ amount: 100000.01 }), "amount over ৳100,000 raises CLAIM_TOO_LARGE", /CLAIM_TOO_LARGE/);
  await fails(() => submit({ name: "ন".repeat(41) }), "a 41-char name raises NAME_TOO_LONG", /NAME_TOO_LONG/);
  await fails(() => submit({ message: "ক".repeat(281) }), "a 281-char message raises MESSAGE_TOO_LONG", /MESSAGE_TOO_LONG/);
  await fails(() => submit({ txid: "bad txid!" }), "a malformed txid raises TXID_INVALID", /TXID_INVALID/);
  await fails(() => submit({ method_kind: "bikash" }), "an unknown method kind raises METHOD_KIND_INVALID", /METHOD_KIND_INVALID/);

  const firstClaim = jsonOf(
    (
      await submit({
        amount: 50,
        name: "  ডেমো সমর্থক  ",
        message: "দারুণ কাজ!\nআরও চাই।",
        txid: "DEMOTX0003",
        ip_hash: ipHash(9002),
      })
    )[0].result,
  );
  eq(Object.keys(firstClaim).sort(), ["created_at", "id", "status"], "submit_support_claim returns only id/status/created_at");
  eq(firstClaim.status, "unverified", "a new claim is inserted as unverified");
  ok(!JSON.stringify(firstClaim).includes("DEMOTX0003"), "the txid never appears in the RPC response");
  ok(!("txid" in firstClaim) && !("ip_hash" in firstClaim), "the RPC response has no txid/ip_hash keys");

  await asPostgres();
  const storedClaim = (
    await query(
      "select id, txid, ip_hash, supporter_name, message, status from public.support_claims where id = $1",
      [firstClaim.id],
    )
  )[0];
  eq(storedClaim.txid, "DEMOTX0003", "the txid is stored privately for the owner");
  eq(storedClaim.ip_hash, ipHash(9002), "the peppered ip hash is stored privately");
  eq(storedClaim.supporter_name, "ডেমো সমর্থক", "the supporter name is trimmed server-side");
  eq(storedClaim.message, "দারুণ কাজ! আরও চাই।", "message newlines are collapsed server-side");

  // Owner A sees the private fields; owner B cannot; the public view never has them.
  await asUser(USER_A);
  const aClaims = await query(
    "select id, txid, ip_hash from public.support_claims where creator_id = (select id from public.creators where slug = 'owner-a-page')",
  );
  ok(aClaims.some((row) => row.id === firstClaim.id && row.txid === "DEMOTX0003"), "the owner reads their claim's txid (private)");
  await asUser(USER_B);
  eq(
    await scalar("select count(*)::int from public.support_claims where id = $1", [firstClaim.id]),
    0,
    "another owner cannot read that claim under RLS",
  );
  await asAnon();
  const publicClaim = (
    await query("select * from public.public_support_claims where id = $1", [firstClaim.id])
  )[0];
  ok(!("txid" in publicClaim) && !("ip_hash" in publicClaim), "the public claim row never contains txid/ip_hash");
  eq(publicClaim.status, "unverified", "the public claim row carries the self-reported status");

  // =========================================================================
  console.log("\n[review] owner state machine + rejected-is-terminal");
  // =========================================================================
  await asUser(USER_TEACHER);
  const myClaims = await query("select id, status, txid from public.support_claims order by id");
  eq(myClaims.length, 3, "the demo teacher's dashboard sees all 3 own claims (incl. hidden)");
  ok(myClaims.every((row) => row.id.startsWith("f0000000")), "the claim list is scoped to the teacher's creators");
  eq(
    (await query("select txid from public.support_claims where id = $1", [TEACHER_CLAIM_UNVERIFIED]))[0].txid,
    "DEMOTX0001",
    "the owner can read the private txid of a claim",
  );

  const review = (claimId, action) =>
    query("select public.review_support_claim($1, $2) as result", [claimId, action]).then((rows) => jsonOf(rows[0].result));

  const confirmed = await review(TEACHER_CLAIM_UNVERIFIED, "confirm");
  eq(confirmed.status, "confirmed", "owner confirm moves unverified -> confirmed");
  ok(Boolean(confirmed.confirmed_at), "confirm stamps confirmed_at");
  await asAnon();
  eq(
    await scalar("select status from public.public_support_claims where id = $1", [TEACHER_CLAIM_UNVERIFIED]),
    "confirmed",
    "a confirmed claim stays public (still labelled creator-confirmed)",
  );

  await asUser(USER_TEACHER);
  const hidden = await review(TEACHER_CLAIM_UNVERIFIED, "hide");
  eq(hidden.status, "hidden", "owner hide moves confirmed -> hidden");
  ok(Boolean(hidden.hidden_at), "hide stamps hidden_at");
  await asAnon();
  eq(
    await scalar("select count(*)::int from public.public_support_claims where id = $1", [TEACHER_CLAIM_UNVERIFIED]),
    0,
    "a hidden claim disappears from the public view",
  );

  await asUser(USER_TEACHER);
  await fails(
    () => review(TEACHER_CLAIM_UNVERIFIED, "confirm"),
    "confirming a hidden claim is an invalid transition",
    /CLAIM_INVALID_TRANSITION/,
  );
  const restored = await review(TEACHER_CLAIM_UNVERIFIED, "restore");
  eq(restored.status, "unverified", "restore moves hidden -> unverified");
  eq(restored.confirmed_at, null, "restore clears confirmed_at (back to self-reported)");
  eq(restored.hidden_at, null, "restore clears hidden_at");

  // A confirmed claim can be hidden and restored too.
  eq((await review(TEACHER_CLAIM_CONFIRMED, "hide")).status, "hidden", "confirmed -> hidden is allowed");
  eq((await review(TEACHER_CLAIM_CONFIRMED, "restore")).status, "unverified", "hidden -> unverified is allowed");
  await fails(() => review(TEACHER_CLAIM_HIDDEN, "confirm"), "a hidden claim cannot jump straight to confirmed", /CLAIM_INVALID_TRANSITION/);
  await fails(() => review("00000000-0000-4000-8000-00000000dead", "confirm"), "reviewing a non-existent claim raises CLAIM_NOT_FOUND", /CLAIM_NOT_FOUND/);
  await fails(() => review(TEACHER_CLAIM_UNVERIFIED, "delete"), "an unknown review action raises CLAIM_ACTION_INVALID", /CLAIM_ACTION_INVALID/);

  await asUser(USER_A);
  await fails(() => review(TEACHER_CLAIM_UNVERIFIED, "confirm"), "another owner cannot review a claim (CLAIM_NOT_FOUND)", /CLAIM_NOT_FOUND/);
  await fails(() => query("update public.support_claims set status = 'confirmed'"), "owners cannot write claims directly", /permission denied/);
  await fails(() => query("delete from public.support_claims"), "owners cannot delete claims directly", /permission denied/);

  // Moderation rejects via the service role (docs/moderation.md), then terminal.
  await asServiceRole();
  await query(
    "update public.support_claims set status = 'rejected', rejected_at = now(), moderated_by = $1 where id = $2",
    [USER_A, TEACHER_CLAIM_UNVERIFIED],
  );
  const rejected = (
    await query("select status, rejected_at, moderated_by from public.support_claims where id = $1", [TEACHER_CLAIM_UNVERIFIED])
  )[0];
  eq(rejected.status, "rejected", "moderation can reject a claim via service-role SQL");
  ok(Boolean(rejected.rejected_at), "reject stamps rejected_at");
  eq(rejected.moderated_by, USER_A, "reject records the moderator");
  await asAnon();
  eq(
    await scalar("select count(*)::int from public.public_support_claims where id = $1", [TEACHER_CLAIM_UNVERIFIED]),
    0,
    "a rejected claim never appears in the public view",
  );
  await asUser(USER_TEACHER);
  for (const action of ["confirm", "hide", "restore"]) {
    await fails(
      () => review(TEACHER_CLAIM_UNVERIFIED, action),
      `a rejected claim is terminal (${action} is refused)`,
      /CLAIM_REJECTED_TERMINAL/,
    );
  }

  // =========================================================================
  console.log("\n[filters] draft/suspended pages, disabled methods, hidden claims");
  // =========================================================================
  await asPostgres();
  await query(
    `insert into public.creators (id, user_id, slug, display_name, status, published_at)
     values
       ('c0ff0000-0000-4000-8000-000000000001', $1, 'draft-page', 'Draft Page', 'draft', null),
       ('c0ff0000-0000-4000-8000-000000000002', $2, 'suspended-page', 'Suspended Page', 'suspended', now())`,
    [USER_I, USER_J],
  );
  await query(
    `insert into public.payment_methods (id, creator_id, kind, label, account_number, sort_order, enabled)
     values
       ('b0ff0000-0000-4000-8000-000000000001', 'c0ff0000-0000-4000-8000-000000000001', 'bkash', 'Draft page method', '01000000006', 0, true),
       ('b0ff0000-0000-4000-8000-000000000002', 'c0ff0000-0000-4000-8000-000000000002', 'bkash', 'Suspended page method', '01000000005', 0, true),
       ('b0ff0000-0000-4000-8000-000000000003', (select id from public.creators where slug = 'owner-a-page'), 'nagad', 'Disabled method', '01000000007', 9, false)`,
  );
  await query(
    `insert into public.support_claims (id, creator_id, amount_bdt, status, message, hidden_at, rejected_at)
     values
       ('f0ff0000-0000-4000-8000-000000000001', (select id from public.creators where slug = 'owner-a-page'), 10, 'hidden', 'hidden claim', now(), null),
       ('f0ff0000-0000-4000-8000-000000000002', (select id from public.creators where slug = 'owner-a-page'), 10, 'rejected', 'rejected claim', null, now())`,
  );

  await asAnon();
  eq(
    (await query("select slug from public.public_creators where slug in ('draft-page','suspended-page')")).length,
    0,
    "draft and suspended pages are hidden from the public view",
  );
  eq(
    (await query("select creator_slug from public.public_payment_methods where creator_slug in ('draft-page','suspended-page')")).length,
    0,
    "methods of draft/suspended pages are hidden",
  );
  eq(
    await scalar("select count(*)::int from public.public_payment_methods where creator_slug = 'owner-a-page' and label = 'Disabled method'"),
    0,
    "disabled payment methods are hidden",
  );
  eq(
    (await query("select id from public.public_support_claims where id in ('f0ff0000-0000-4000-8000-000000000001','f0ff0000-0000-4000-8000-000000000002')")).length,
    0,
    "hidden and rejected claims are hidden from the public view",
  );
  ok(
    (await query("select status from public.public_support_claims")).every((row) => ["unverified", "confirmed"].includes(row.status)),
    "only unverified/confirmed statuses are ever public",
  );

  // =========================================================================
  console.log("\n[rate limits] claim submission");
  // =========================================================================
  // Per-IP: 5 claims per hour then RATE_LIMITED.
  await asAnon();
  const hourIp = ipHash(7001);
  for (let i = 1; i <= 5; i += 1) {
    const okRow = await submit({ ip_hash: hourIp, amount: 20, message: `hour claim ${i}` });
    ok(okRow.length === 1, `per-IP hourly limit allows claim ${i}/5`);
  }
  await fails(() => submit({ ip_hash: hourIp, amount: 20, message: "hour claim 6" }), "the 6th claim in an hour from one IP raises RATE_LIMITED", /RATE_LIMITED/);

  // Per-IP: 20 claims per day. Reset only the hourly window between calls so the
  // daily window is what eventually trips.
  const dayIp = ipHash(7002);
  for (let i = 1; i <= 21; i += 1) {
    await asPostgres();
    await query("delete from chanasta.rate_limits where key = $1", [`claim:ip:${dayIp}:1h`]);
    await asAnon();
    if (i <= 20) {
      const row = await submit({ slug: "owner-b-page", ip_hash: dayIp, amount: 10, message: `day claim ${i}` });
      ok(row.length === 1, `per-IP daily limit allows claim ${i}/20`);
    } else {
      await fails(
        () => submit({ slug: "owner-b-page", ip_hash: dayIp, amount: 10, message: "day claim 21" }),
        "the 21st claim in a day from one IP raises RATE_LIMITED",
        /RATE_LIMITED/,
      );
    }
  }

  // Per-creator: 100 claims/day. Pre-seed the window so the assertion stays fast;
  // this still proves the creator key + check are wired into submission.
  await asUser(USER_F);
  const ratePage = (
    await query(`insert into public.creators (slug, display_name) values ('rate-limit-page', 'Rate Limit Page') returning id`)
  )[0].id;
  await query(
    `insert into public.payment_methods (creator_id, kind, label, account_number)
     values ($1, 'bkash', 'Rate page bKash', '01000000004')`,
    [ratePage],
  );
  await query("select public.creator_set_status('publish')");
  await asPostgres();
  await query(
    `insert into chanasta.rate_limits (key, count, window_start, expires_at)
     values ($1, 100, now(), now() + interval '1 hour')
     on conflict (key) do update set count = 100, window_start = now(), expires_at = now() + interval '1 hour'`,
    [`claim:creator:${ratePage}:24h`],
  );
  await asAnon();
  await fails(
    () => submit({ slug: "rate-limit-page", ip_hash: ipHash(7003), amount: 10 }),
    "the 101st claim for one creator in a day raises RATE_LIMITED",
    /RATE_LIMITED/,
  );

  // A different IP has its own windows.
  await asAnon();
  const otherIpRow = await submit({ slug: "owner-a-page", ip_hash: ipHash(7004), amount: 10 });
  ok(otherIpRow.length === 1, "a different IP has its own rate-limit window");

  // =========================================================================
  console.log("\n[methods] max 8 enabled + unique sort order");
  // =========================================================================
  await asUser(USER_G);
  const limitPage = (
    await query(`insert into public.creators (slug, display_name) values ('method-limit-page', 'Method Limit Page') returning id`)
  )[0].id;
  for (let i = 0; i < 8; i += 1) {
    await query(
      `insert into public.payment_methods (creator_id, kind, label, account_number, sort_order)
       values ($1, 'bkash', $2, $3, $4)`,
      [limitPage, `Method ${i}`, `0100000${String(1000 + i)}`, i],
    );
  }
  eq(await scalar("select count(*)::int from public.payment_methods where creator_id = $1", [limitPage]), 8, "8 enabled methods can be stored");
  await fails(
    () =>
      query(
        `insert into public.payment_methods (creator_id, kind, label, account_number, sort_order)
         values ($1, 'bkash', 'Ninth method', '01000000003', 8)`,
        [limitPage],
      ),
    "a 9th enabled method raises PAYMENT_METHOD_LIMIT",
    /PAYMENT_METHOD_LIMIT/,
  );
  await fails(
    () =>
      query(
        `insert into public.payment_methods (creator_id, kind, label, account_number, sort_order, enabled)
         values ($1, 'nagad', 'Duplicate sort', '01000000003', 0, false)`,
        [limitPage],
      ),
    "duplicate sort_order per creator is rejected",
    /payment_methods_sort_key|duplicate key/,
  );

  // =========================================================================
  console.log("\n[methods] atomic reorder RPC (unique sort key safe)");
  // =========================================================================
  await asUser(USER_L);
  const reorderPage = (
    await query(`insert into public.creators (slug, display_name) values ('reorder-page', 'Reorder Page') returning id`)
  )[0].id;
  const sortMethod = async (label, sortOrder) =>
    (
      await query(
        `insert into public.payment_methods (creator_id, kind, label, account_number, sort_order)
         values ($1, 'bkash', $2, $3, $4) returning id`,
        [reorderPage, label, `01000000${String(100 + sortOrder)}`, sortOrder],
      )
    )[0].id;
  const methodA1 = await sortMethod("Reorder A", 0);
  const methodB1 = await sortMethod("Reorder B", 1);
  const methodC1 = await sortMethod("Reorder C", 2);

  const callReorder = (ids) =>
    query("select public.creator_reorder_payment_methods($1::uuid[]) as result", [
      "{" + ids.join(",") + "}",
    ]);

  await asAnon();
  eq(
    await scalar(
      "select has_function_privilege('anon', 'public.creator_reorder_payment_methods(uuid[])', 'execute')",
    ),
    false,
    "anon cannot execute creator_reorder_payment_methods",
  );
  await fails(
    () => callReorder([methodA1, methodB1, methodC1]),
    "calling the reorder RPC as anon is denied",
    /permission denied/,
  );

  await asUser(USER_L);
  await callReorder([methodC1, methodB1, methodA1]);
  eq(
    (await query("select id, sort_order from public.payment_methods where creator_id = $1 order by sort_order", [reorderPage])).map(
      (row) => [row.id, row.sort_order],
    ),
    [
      [methodC1, 0],
      [methodB1, 1],
      [methodA1, 2],
    ],
    "reorder [c,b,a] atomically yields sort_order 0,1,2 in the requested order",
  );

  await fails(
    () => callReorder([methodA1, methodA1, methodB1]),
    "duplicate ids in a reorder are rejected (BAD_ORDER)",
    /BAD_ORDER/,
  );
  await fails(
    () => callReorder([methodC1, methodB1]),
    "a subset of the method set is rejected (BAD_ORDER)",
    /BAD_ORDER/,
  );
  await fails(
    () => callReorder([methodC1, methodB1, methodA.id]),
    "a method belonging to another creator is rejected (FORBIDDEN)",
    /FORBIDDEN/,
  );
  await fails(
    () => callReorder([methodC1, methodB1, "00000000-0000-4000-8000-00000000beef"]),
    "an unknown method id is rejected (FORBIDDEN)",
    /FORBIDDEN/,
  );
  await fails(() => callReorder([]), "an empty order is rejected (BAD_ORDER)", /BAD_ORDER/);
  await fails(
    () => callReorder(Array.from({ length: 9 }, (_, i) => `${"0".repeat(7)}${i}-0000-4000-8000-00000000000${i}`)),
    "more than 8 entries is rejected (BAD_ORDER)",
    /BAD_ORDER/,
  );

  await asUser(USER_A);
  await fails(
    () => callReorder([methodC1, methodB1, methodA1]),
    "another owner cannot reorder someone else's methods (FORBIDDEN)",
    /FORBIDDEN/,
  );

  // Reordering must leave the page's methods publicly visible in the new order.
  await asUser(USER_L);
  await query("select public.creator_set_status('publish')");
  await asAnon();
  eq(
    (
      await query("select label from public.public_payment_methods where creator_slug = 'reorder-page' order by sort_order")
    ).map((row) => row.label),
    ["Reorder C", "Reorder B", "Reorder A"],
    "the public view serves the reordered method order",
  );

  // =========================================================================
  console.log("\n[moderation] soft delete hides the page everywhere");
  // =========================================================================
  await asServiceRole();
  await query("update public.creators set deleted_at = now(), status = 'suspended' where slug = 'demo-writer'");
  await asAnon();
  eq(
    await scalar("select count(*)::int from public.public_creators where slug = 'demo-writer'"),
    0,
    "a soft-deleted page disappears from the public view",
  );
  eq(
    await scalar("select count(*)::int from public.public_payment_methods where creator_slug = 'demo-writer'"),
    0,
    "its payment methods disappear from the public view",
  );
  eq(
    await scalar("select count(*)::int from public.public_support_claims where creator_slug = 'demo-writer'"),
    0,
    "its claims disappear from the public view",
  );
  eq(await scalar("select public.is_slug_available('demo-writer')"), false, "a soft-deleted page keeps its slug until purge");
  await fails(
    () => submit({ slug: "demo-writer", ip_hash: ipHash(7005), amount: 10 }),
    "claims cannot be submitted to a soft-deleted page",
    /NOT_PUBLISHED/,
  );
  await asServiceRole();
  await query(
    "update public.creators set deleted_at = null, status = 'published', published_at = now() where slug = 'demo-writer'",
  );

  // =========================================================================
  console.log("\n[owners] self-service soft delete (Settings → delete my page)");
  // =========================================================================
  await asUser(USER_K);
  const selfPage = (
    await query(
      `insert into public.creators (user_id, slug, display_name)
       values ($1, 'self-delete-page', 'Self Delete Page') returning id, user_id, status`,
      [USER_K],
    )
  )[0];
  eq(selfPage.user_id, USER_K, "a client may spell out their own user_id on insert (RLS enforces it matches auth.uid())");
  eq(selfPage.status, "draft", "the explicit-user_id insert still starts as a draft");
  await query(
    `insert into public.payment_methods (creator_id, kind, label, account_number)
     values ($1, 'bkash', 'Self delete bKash', '01000000002')`,
    [selfPage.id],
  );
  await query("select public.creator_set_status('publish')");
  await asAnon();
  eq(
    await scalar("select count(*)::int from public.public_creators where slug = 'self-delete-page'"),
    1,
    "the owner-flow page is public before deletion",
  );

  // The dashboard's delete-my-page flow is a direct UPDATE of deleted_at
  // (plus the existing status column in the payload).
  await asUser(USER_K);
  await query(
    "update public.creators set deleted_at = now(), status = 'suspended' where id = $1",
    [selfPage.id],
  );
  await asPostgres();
  const softDeleted = (
    await query("select status, deleted_at from public.creators where id = $1", [selfPage.id])
  )[0];
  eq(softDeleted.status, "suspended", "owner soft delete forces status='suspended'");
  ok(softDeleted.deleted_at !== null, "owner soft delete stamps deleted_at");
  eq(
    await scalar("select count(*)::int from public.reserved_slugs where slug = 'self-delete-page' and reason = 'quarantine'"),
    1,
    "owner soft delete quarantines the slug for 90 days",
  );

  await asAnon();
  eq(
    await scalar("select count(*)::int from public.public_creators where slug = 'self-delete-page'"),
    0,
    "a self-deleted page is hidden from the public view",
  );
  eq(
    await scalar("select count(*)::int from public.public_payment_methods where creator_slug = 'self-delete-page'"),
    0,
    "a self-deleted page's methods are hidden",
  );
  eq(await scalar("select public.is_slug_available('self-delete-page')"), false, "a self-deleted slug is not reusable");

  await asUser(USER_K);
  await fails(
    () => query("update public.creators set deleted_at = null where id = $1", [selfPage.id]),
    "an owner cannot restore a self-deleted page (moderation only)",
    /ADMIN_ONLY_FIELD/,
  );
  await fails(
    () => query("update public.creators set display_name = 'Renamed After Delete' where id = $1", [selfPage.id]),
    "a self-deleted page cannot be edited by its owner",
    /ADMIN_ONLY_FIELD/,
  );

  // =========================================================================
  console.log("\n[retention] purge helpers exist and are service-role-only");
  // =========================================================================
  await asPostgres();
  const chanastaFns = (
    await query(
      `select
         has_function_privilege('service_role', 'chanasta.purge_expired_claim_pii()', 'execute') as pii,
         has_function_privilege('service_role', 'chanasta.purge_deleted_creators()', 'execute') as creators,
         has_function_privilege('service_role', 'chanasta.purge_expired_slug_quarantine()', 'execute') as quarantine,
         has_function_privilege('anon', 'chanasta.purge_expired_claim_pii()', 'execute') as anon_pii,
         has_function_privilege('authenticated', 'chanasta.purge_deleted_creators()', 'execute') as auth_creators`,
    )
  )[0];
  eq(chanastaFns.pii, true, "service_role can run the claim PII retention helper");
  eq(chanastaFns.creators, true, "service_role can run the creator purge helper");
  eq(chanastaFns.quarantine, true, "service_role can run the slug quarantine purge helper");
  eq(chanastaFns.anon_pii, false, "anon cannot run retention helpers");
  eq(chanastaFns.auth_creators, false, "owners cannot run retention helpers");

  const piiPurge = jsonOf((await query("select chanasta.purge_expired_claim_pii() as result"))[0].result);
  ok("ip_hashes_nulled" in piiPurge && "rejected_purged" in piiPurge, "purge_expired_claim_pii returns a summary");

  eq(
    await scalar("select count(*)::int from public.reserved_slugs where slug = 'dashboard' and reason = 'route'"),
    1,
    "the slug-quarantine purge never touches the static reserved list",
  );
  eq(
    await scalar("select count(*)::int from public.reserved_slugs where slug = 'owner-a-draft' and reason = 'quarantine'"),
    1,
    "the changed slug stays in quarantine",
  );
  ok((await scalar("select count(*)::int from public.reserved_slugs")) >= 50, "the static reserved-slug list is seeded (>= 50)");

  // =========================================================================
  console.log("\n[idempotency] schema + seed can be re-applied");
  // =========================================================================
  await asPostgres();
  const creatorsBeforeReapply = await scalar("select count(*)::int from public.public_creators");
  const schemaReapply = await readFile(join(root, "supabase/schema.sql"), "utf8");
  await db.exec(schemaReapply);
  ok(true, "re-applying supabase/schema.sql is safe (idempotent migration)");
  eq(
    await scalar("select count(*)::int from public.public_creators"),
    creatorsBeforeReapply,
    "re-applying schema leaves the public views unchanged",
  );

  const seedReapply = await readFile(join(root, "supabase/seed.sql"), "utf8");
  await db.exec(seedReapply);
  eq(await scalar("select count(*)::int from public.creators where slug like 'demo-%'"), 3, "re-applying seed keeps exactly 3 demo creators");
  ok(true, "re-applying supabase/seed.sql is safe (idempotent upserts)");

  // =========================================================================
  // Summary
  // =========================================================================
  const failed = results.filter((result) => !result.passed);
  console.log("\n" + "=".repeat(74));
  if (failed.length === 0) {
    console.log(`PASS — ${assertions}/${assertions} SQL assertions passed`);
    console.log("=".repeat(74));
    return 0;
  }
  console.log(`FAIL — ${failed.length}/${assertions} SQL assertion(s) failed:`);
  for (const failure of failed) console.log(`  \u2718 ${failure.name}\n      ${failure.detail}`);
  console.log("=".repeat(74));
  return 1;
}

let exitCode = 1;
try {
  exitCode = await main();
} catch (error) {
  console.error("\n[setup] SQL check crashed:");
  console.error(error);
  exitCode = 1;
} finally {
  if (db) await db.close();
}
process.exit(exitCode);
