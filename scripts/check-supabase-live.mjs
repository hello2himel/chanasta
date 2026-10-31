#!/usr/bin/env node
/**
 * Live verification of the Chanasta Supabase backend against a running local stack.
 *
 * This is the "does the real thing actually work?" check that the PGlite harness
 * (scripts/check-sql.mjs) cannot do: real Auth users, real PostgREST requests, real
 * RLS, real RPCs.
 *
 * It is LOCAL-ONLY by default: it needs the service-role key to create two synthetic
 * users, so it refuses to run against a remote URL unless ALLOW_REMOTE=1 (do not do
 * that against real users).
 *
 * Usage:
 *   npx supabase start
 *   eval "$(npx supabase status -o env | sed 's/^/export /')"
 *   node scripts/check-supabase-live.mjs
 *
 * Creates two @example.invalid users, publishes one synthetic demo page, exercises
 * claims/rate limits/RLS, then deletes those users (cascades their rows).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.API_URL ?? "http://127.0.0.1:54321";
const localHost = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(API);
if (!localHost && process.env.ALLOW_REMOTE !== "1") {
  console.error(`Refusing to run against a non-local Supabase URL (${API}).`);
  console.error("This test creates and deletes auth users with the service-role key. Set ALLOW_REMOTE=1 only on a throwaway project.");
  process.exit(1);
}
const ANON = process.env.ANON_KEY;
const SERVICE = process.env.SERVICE_ROLE_KEY;
if (!ANON || !SERVICE) throw new Error("ANON_KEY / SERVICE_ROLE_KEY missing; export supabase status env");

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const demo = readFileSync(`${REPO}/src/lib/demo.ts`, "utf8");
const QR_PAYLOAD = demo.match(/"(0002010102[^"]+)"/)?.[1];
if (!QR_PAYLOAD) throw new Error("could not read the synthetic QR payload from src/lib/demo.ts");

let passes = 0;
let failures = 0;
const log = (ok, name, detail = "") => {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

async function call(path, { method = "GET", token, key = ANON, body, prefer } = {}) {
  const headers = { apikey: key, Authorization: `Bearer ${token ?? key}` };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (prefer) headers.prefer = prefer;
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

async function signIn(email, password) {
  const { status, data } = await call("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  if (status !== 200) throw new Error(`sign-in failed for ${email}: ${status} ${JSON.stringify(data)}`);
  return data.access_token;
}

const stamp = Date.now();
const emailA = `smoke-a-${stamp}@example.invalid`;
const emailB = `smoke-b-${stamp}@example.invalid`;
const password = `Smoke-${stamp}-pass`;
const slug = `smoke-page-${stamp}`;

// ---------------------------------------------------------------------------
// Cleanup of any previous run happens via deleting the users when done.
// ---------------------------------------------------------------------------

try {
  // 1. Create two users with the admin API (service role)
  const adminCreate = async (email) => {
    const { status, data } = await call("/auth/v1/admin/users", {
      method: "POST",
      key: SERVICE,
      token: SERVICE,
      body: { email, password, email_confirm: true },
    });
    if (status !== 200 && status !== 201) throw new Error(`admin create ${email}: ${status} ${JSON.stringify(data)}`);
    return data.id;
  };
  const userA = await adminCreate(emailA);
  const userB = await adminCreate(emailB);
  log(Boolean(userA && userB), "admin API creates two synthetic users");

  const tokenA = await signIn(emailA, password);
  const tokenB = await signIn(emailB, password);
  log(Boolean(tokenA && tokenB), "password sign-in returns access tokens (Auth live)");

  // 2. Owner A creates and publishes a page
  const created = await call("/rest/v1/creators", {
    method: "POST",
    token: tokenA,
    prefer: "return=representation",
    body: {
      slug,
      display_name: "SMOKE TEST CREATOR",
      tagline: "Live RLS smoke test — synthetic only",
      avatar_emoji: "☕",
      default_locale: "bn",
    },
  });
  log(created.status === 201, "owner can insert their own creator row", `status=${created.status}`);
  const creatorId = created.data?.[0]?.id;

  const method = await call("/rest/v1/payment_methods", {
    method: "POST",
    token: tokenA,
    prefer: "return=representation",
    body: {
      creator_id: creatorId,
      kind: "bkash",
      label: "bKash (synthetic QR)",
      qr_payload: QR_PAYLOAD,
      qr_status: "verified",
      qr_decoded: {
        institution: "bd.org.bb.npsb",
        merchant_name: "DEMO STORE",
        account: "01000000000",
        city: "Dhaka",
      },
      sort_order: 0,
      enabled: true,
    },
  });
  log(method.status === 201, "owner can add a CRC-valid synthetic QR method", `status=${method.status}`);

  const publish = await call("/rest/v1/rpc/creator_set_status", {
    method: "POST",
    token: tokenA,
    body: { p_status: "published" },
  });
  log(publish.status === 200, "publishing requires a method and succeeds", JSON.stringify(publish.data));

  // 3. Public (anon) reads through the views
  const publicCreator = await call(`/rest/v1/public_creators?slug=eq.${slug}&select=*`);
  const row = publicCreator.data?.[0];
  log(
    publicCreator.status === 200 && row?.slug === slug && !("user_id" in (row ?? {})),
    "anon reads the published creator via public_creators (no user_id)",
  );
  log(row?.verified === false, "new pages are unverified (honest label)");

  const publicMethods = await call(`/rest/v1/public_payment_methods?creator_slug=eq.${slug}&select=*`);
  log(
    publicMethods.status === 200 && publicMethods.data?.length === 1 && publicMethods.data[0].qr_status === "verified",
    "anon reads the enabled payment method with its decode status",
  );

  // 4. Anon never touches base tables
  const baseCreators = await call("/rest/v1/creators?select=id");
  const baseClaims = await call("/rest/v1/support_claims?select=id");
  log(baseCreators.status !== 200, "anon CANNOT select the creators base table", `status=${baseCreators.status}`);
  log(baseClaims.status !== 200, "anon CANNOT select the support_claims base table", `status=${baseClaims.status}`);

  // 5. Anonymous self-reported claim via RPC
  const claimBody = (i) => ({
    p_slug: slug,
    p_amount: 20 + i,
    p_name: `শুভাকাঙ্ক্ষী ${i}`,
    p_message: `স্মোক টেস্ট ধন্যবাদ ${i}`,
    p_txid: i === 0 ? "DEMOTXID00000001" : null,
    p_method_kind: "bkash",
    p_ip_hash: null,
  });
  const claim = await call("/rest/v1/rpc/submit_support_claim", {
    method: "POST",
    body: claimBody(0),
  });
  const claimId = claim.data?.id;
  log(
    claim.status === 200 && claim.data?.status === "unverified",
    "anon submits a self-reported claim via RPC (status=unverified)",
    JSON.stringify(claim.data),
  );
  log(claim.data && !JSON.stringify(claim.data).includes("DEMOTXID00000001"), "the RPC response never returns the txid");

  // rate limit: 5 per hour per IP hash; 4 more allowed, 6th denied
  let allowed = 0;
  let limited = 0;
  for (let i = 1; i <= 5; i++) {
    const result = await call("/rest/v1/rpc/submit_support_claim", { method: "POST", body: claimBody(i) });
    if (result.status === 200) allowed++;
    else limited++;
  }
  log(allowed === 4 && limited === 1, "per-IP claim rate limit (5/hour) is enforced", `allowed=${allowed} limited=${limited}`);

  // 6. Public claim surface
  const publicClaims = await call(`/rest/v1/public_support_claims?creator_slug=eq.${slug}&select=*&order=created_at.asc`);
  const serialized = JSON.stringify(publicClaims.data ?? []);
  log(publicClaims.status === 200 && publicClaims.data?.length === 5, "anon sees the self-reported claims through the view");
  log(!serialized.includes("txid") && !serialized.includes("DEMOTXID00000001"), "public claim view never exposes txid");
  log(!serialized.includes("ip_hash"), "public claim view never exposes ip_hash");

  // 7. Owner dashboard read includes the private txid
  const ownerClaims = await call("/rest/v1/support_claims?select=id,txid,status&order=created_at.asc", { token: tokenA });
  const withTxid = (ownerClaims.data ?? []).find((c) => c.txid === "DEMOTXID00000001");
  log(Boolean(withTxid), "owner (RLS) can see the private txid in their dashboard");
  const ownerIds = new Set((ownerClaims.data ?? []).map((c) => c.id));
  log(ownerIds.has(claimId), "owner sees their claims only (row-scoped RLS)");

  // 8. Owner confirms → public badge changes
  const review = await call("/rest/v1/rpc/review_support_claim", {
    method: "POST",
    token: tokenA,
    body: { p_claim_id: claimId, p_action: "confirm" },
  });
  log(review.status === 200, "owner can confirm a claim (creator-confirmed, not verified payment)", JSON.stringify(review.data));
  const after = await call(`/rest/v1/public_support_claims?creator_slug=eq.${slug}&select=id,status&id=eq.${claimId}`);
  log(after.data?.[0]?.status === "confirmed", "confirmed claim is public with the creator-confirmed status");

  // 9. Another user is isolated
  const otherView = await call("/rest/v1/creators?select=id,slug", { token: tokenB });
  log(
    otherView.status === 200 && (otherView.data ?? []).length === 0,
    "another signed-in user cannot see the first user's page (RLS isolation)",
  );
  const foreignReview = await call("/rest/v1/rpc/review_support_claim", {
    method: "POST",
    token: tokenB,
    body: { p_claim_id: claimId, p_action: "hide" },
  });
  log(foreignReview.status >= 400, "another user cannot review the first user's claim", `status=${foreignReview.status}`);

  // 10. Reserved slugs and invalid slugs are rejected
  const reserved = await call("/rest/v1/rpc/creator_change_slug", {
    method: "POST",
    token: tokenA,
    body: { p_slug: "bkash" },
  });
  log(reserved.status >= 400, "reserved slug (bkash) is rejected", `status=${reserved.status}`);
  const invalid = await call("/rest/v1/rpc/creator_change_slug", {
    method: "POST",
    token: tokenA,
    body: { p_slug: "Bad_Slug!" },
  });
  log(invalid.status >= 400, "invalid slug format is rejected", `status=${invalid.status}`);

  // 11. Published page is slug-addressable through the data layer's view
  const bySlug = await call(`/rest/v1/public_creators?slug=eq.${slug}&select=slug,display_name`);
  log(bySlug.data?.[0]?.display_name === "SMOKE TEST CREATOR", "public page is addressable by slug (supporter page path)");
} catch (error) {
  failures++;
  console.error("UNEXPECTED FAILURE:", error);
} finally {
  // cleanup: deleting the auth users cascades creators → methods → claims
  try {
    const users = await call("/auth/v1/admin/users?per_page=200", { key: SERVICE, token: SERVICE });
    for (const user of users.data?.users ?? []) {
      if (String(user.email).startsWith("smoke-")) {
        await call(`/auth/v1/admin/users/${user.id}`, { method: "DELETE", key: SERVICE, token: SERVICE });
      }
    }
    console.log("cleanup: synthetic smoke users deleted (cascades their rows)");
  } catch (error) {
    console.error("cleanup failed:", error);
  }
  console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${passes} live Supabase assertions passed, ${failures} failed`);
  process.exitCode = failures === 0 ? 0 : 1;
}
