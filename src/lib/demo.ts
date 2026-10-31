/**
 * Synthetic demo data — safe to ship in the repo.
 *
 * Every account number is `01000000000`-style (an unassignable operator
 * prefix), every merchant name is `DEMO …`, every QR payload is the synthetic
 * deshiQR fixture with dummy tokens, and every creator is marked DEMO in both
 * languages. No real person, account or transaction is represented here.
 */
import type { Creator, PaymentMethod, SupportClaim } from "./types.ts";
import { classifyPayload, snapshotOfDecoded } from "./qr-payload.ts";
import { decodeSafe } from "./deshiqr.ts";

/** The synthetic static NPSB/Bangla QR payload from deshiQR's demo fixtures. */
export const DEMO_QR_STATIC =
  "00020101021126470014bd.org.bb.npsb010202020420020311010000000005204601653030505802BD5910DEMO STORE6005Dhaka62060602FT80660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBBIG5vdCByZWFsISE=81660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBCIG5vdCByZWFsISE=6304295D";

/** Same fixture with a ৳500 dynamic amount (synthetic reference). */
export const DEMO_QR_DYNAMIC =
  "00020101021226470014bd.org.bb.npsb010202020420020311010000000005204601653030505406500.005802BD5910DEMO STORE6005Dhaka62350125DEMOQR0VZeK2MfbVRI6w36osd0602FT80660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBBIG5vdCByZWFsISE=81660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBCIG5vdCByZWFsISE=6304F835";

/** Minimal synthetic Bangla QR (no MCC / tokens / additional data). */
export const DEMO_QR_MINIMAL =
  "00020101021126470014bd.org.bb.npsb0102020204200203110100000000053030505802BD5910DEMO STORE6005Dhaka63049C89";

/** A second synthetic merchant (DEMO SUPER SHOP LTD, Chattogram). */
export const DEMO_QR_LONG =
  "00020101021126470014bd.org.bb.npsb010202020420020311010000000005204541153030505802BD5919DEMO SUPER SHOP LTD6010Chattogram630494E0";

/**
 * Structurally valid Bangla QR with an institution deshiQR has not verified
 * (`bd.org.bb.xyzq`) — deterministic, CRC-sealed, synthetic. Used to show the
 * "unverified" decode label without pretending money moved.
 */
export const DEMO_QR_UNVERIFIED =
  "00020101021126470014bd.org.bb.xyzq010202020420020311010000000005204601653030505802BD5910DEMO STORE6005Dhaka62060602FT80660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBBIG5vdCByZWFsISE=81660014bd.org.bb.npsb0144ZGVzaGlxciBkdW1teSB0b2tlbiBCIG5vdCByZWFsISE=63048B78";

export const DEMO_CREATED_AT = "2026-10-20T09:00:00+06:00";

function demoCreator(
  slug: string,
  display_name: string,
  avatar_emoji: string,
  tagline: string,
  bio: string,
): Creator {
  return {
    id: `demo-creator-${slug}`,
    slug,
    display_name,
    tagline,
    bio,
    avatar_emoji,
    socials: {},
    goal_amount_bdt: null,
    goal_note: null,
    default_locale: "bn",
    status: "published",
    verified: false,
    published_at: "2026-10-21T10:00:00+06:00",
    updated_at: "2026-10-30T18:00:00+06:00",
    created_at: DEMO_CREATED_AT,
    deleted_at: null,
    is_demo: true,
  };
}

export const DEMO_CREATORS: readonly Creator[] = [
  demoCreator(
    "demo-teacher",
    "ডেমো শিক্ষক",
    "ri-graduation-cap-line",
    "ফ্রি ম্যাথ ক্লাস — ভালো লাগলে এক কাপ চা খাওয়ান।",
    "এইচএসসি শিক্ষার্থীদের জন্য ফ্রি ভিডিও ক্লাস বানাই। আমার কাজ ভালো লাগলে এক কাপ চা খাওয়াতে পারেন। (এটি একটি ডেমো পেজ।)",
  ),
  demoCreator(
    "demo-artist",
    "ডেমো শিল্পী",
    "ri-palette-line",
    "ছোট ছোট আঁকা, বড় ভালোবাসা।",
    "প্রতিদিন একটা স্কেচ আঁকি। পছন্দ হলে এক প্লেট নাস্তা খাওয়ান। (ডেমো পেজ।)",
  ),
  demoCreator(
    "demo-writer",
    "ডেমো লেখক",
    "ri-quill-pen-line",
    "লিখি, পড়ি, ভাবি — আর চা খাই।",
    "বাংলা গল্প লিখি। ভালো লাগলে এক কাপ চা খাওয়ান। (ডেমো পেজ।)",
  ),
];

export const DEMO_SLUGS: readonly string[] = DEMO_CREATORS.map((creator) => creator.slug);

export function findDemoCreator(slug: string): Creator | null {
  return DEMO_CREATORS.find((creator) => creator.slug === slug) ?? null;
}

export function isDemoSlug(slug: string): boolean {
  return DEMO_SLUGS.includes(slug);
}

interface DemoMethodSeed {
  id: string;
  creator_slug: string;
  kind: PaymentMethod["kind"];
  label: string;
  account_number?: string | null;
  account_holder?: string | null;
  bank_name?: string | null;
  branch?: string | null;
  routing_number?: string | null;
  qr_payload?: string | null;
  qr_status?: PaymentMethod["qr_status"];
  sort_order: number;
  updated_at: string;
}

const METHOD_SEEDS: readonly DemoMethodSeed[] = [
  // demo-teacher: a verified synthetic bKash Bangla QR, a manual Nagad number, a bank account.
  {
    id: "demo-method-teacher-qr",
    creator_slug: "demo-teacher",
    kind: "bkash",
    label: "ডেমো বিকাশ (যাচাই করা QR)",
    account_number: "01000000000",
    qr_payload: DEMO_QR_STATIC,
    qr_status: "verified",
    sort_order: 0,
    updated_at: "2026-10-30T18:00:00+06:00",
  },
  {
    id: "demo-method-teacher-nagad",
    creator_slug: "demo-teacher",
    kind: "nagad",
    label: "ডেমো নগদ",
    account_number: "01000000001",
    sort_order: 1,
    updated_at: "2026-10-29T12:00:00+06:00",
  },
  {
    id: "demo-method-teacher-bank",
    creator_slug: "demo-teacher",
    kind: "bank",
    label: "ডেমো ব্যাংক",
    account_number: "0000000000000",
    account_holder: "ডেমো শিক্ষক",
    bank_name: "ডেমো ব্যাংক লিমিটেড",
    branch: "ডেমো শাখা",
    routing_number: "000000000",
    sort_order: 2,
    updated_at: "2026-10-28T09:00:00+06:00",
  },
  // demo-artist: an unverified Bangla QR (unknown institution) + manual bKash number.
  {
    id: "demo-method-artist-qr",
    creator_slug: "demo-artist",
    kind: "nagad",
    label: "ডেমো নগদ QR (অযাচাইকৃত)",
    account_number: "01000000002",
    qr_payload: DEMO_QR_UNVERIFIED,
    qr_status: "unverified",
    sort_order: 0,
    updated_at: "2026-10-30T11:30:00+06:00",
  },
  {
    id: "demo-method-artist-bkash",
    creator_slug: "demo-artist",
    kind: "bkash",
    label: "ডেমো বিকাশ নম্বর",
    account_number: "01000000003",
    sort_order: 1,
    updated_at: "2026-10-27T16:10:00+06:00",
  },
  // demo-writer: manual numbers only (no QR) so the manual-only state renders too.
  {
    id: "demo-method-writer-bkash",
    creator_slug: "demo-writer",
    kind: "bkash",
    label: "ডেমো বিকাশ নম্বর",
    account_number: "01000000004",
    sort_order: 0,
    updated_at: "2026-10-26T20:00:00+06:00",
  },
  {
    id: "demo-method-writer-rocket",
    creator_slug: "demo-writer",
    kind: "rocket",
    label: "ডেমো রকেট",
    account_number: "01000000005",
    sort_order: 1,
    updated_at: "2026-10-25T15:00:00+06:00",
  },
];

function methodsForSeed(seed: DemoMethodSeed): PaymentMethod {
  let qr_decoded: PaymentMethod["qr_decoded"] = null;
  if (seed.qr_payload) {
    const decoded = decodeSafe(seed.qr_payload);
    if (decoded.ok) qr_decoded = snapshotOfDecoded(decoded.qr, Date.parse("2026-10-30T18:00:00+06:00"));
  }
  return {
    id: seed.id,
    creator_id: `demo-creator-${seed.creator_slug}`,
    creator_slug: seed.creator_slug,
    kind: seed.kind,
    label: seed.label,
    account_number: seed.account_number ?? null,
    account_holder: seed.account_holder ?? null,
    bank_name: seed.bank_name ?? null,
    branch: seed.branch ?? null,
    routing_number: seed.routing_number ?? null,
    qr_payload: seed.qr_payload ?? null,
    qr_image_path: null,
    qr_status: seed.qr_status ?? "none",
    qr_decoded,
    sort_order: seed.sort_order,
    enabled: true,
    created_at: DEMO_CREATED_AT,
    updated_at: seed.updated_at,
  };
}

export const DEMO_METHODS: readonly PaymentMethod[] = METHOD_SEEDS.map(methodsForSeed);

export function demoMethodsFor(slug: string): PaymentMethod[] {
  return DEMO_METHODS.filter((method) => method.creator_slug === slug && method.enabled).sort(
    (a, b) => a.sort_order - b.sort_order,
  );
}

export const DEMO_CLAIM_SEEDS: readonly {
  id: string;
  creator_slug: string;
  amount_bdt: number;
  supporter_name: string | null;
  message: string | null;
  method_kind: SupportClaim["method_kind"];
  status: SupportClaim["status"];
  age_days: number;
  txid: string | null;
}[] = [
  {
    id: "demo-claim-teacher-1",
    creator_slug: "demo-teacher",
    amount_bdt: 50,
    supporter_name: null,
    message: "স্যার, অধ্যায়টা পরীক্ষার আগে কাজে লেগেছে। ধন্যবাদ!",
    method_kind: "bkash",
    status: "unverified",
    age_days: 2,
    txid: "DEMO-TXID-DEMO01",
  },
  {
    id: "demo-claim-teacher-2",
    creator_slug: "demo-teacher",
    amount_bdt: 100,
    supporter_name: "রাফসান",
    message: null,
    method_kind: "bank",
    status: "confirmed",
    age_days: 5,
    txid: null,
  },
  {
    id: "demo-claim-teacher-3",
    creator_slug: "demo-teacher",
    amount_bdt: 20,
    supporter_name: "একজন ডেমো সমর্থক",
    message: "আপনার ক্লাস দেখে ভাইভা দিলাম।",
    method_kind: "bkash",
    status: "hidden",
    age_days: 8,
    txid: null,
  },
  {
    id: "demo-claim-artist-1",
    creator_slug: "demo-artist",
    amount_bdt: 100,
    supporter_name: "রুমি",
    message: "আঁকাটা দেখে সকালটা ভালো হয়ে গেল।",
    method_kind: "bkash",
    status: "unverified",
    age_days: 1,
    txid: "DEMO-TXID-DEMO02",
  },
  {
    id: "demo-claim-artist-2",
    creator_slug: "demo-artist",
    amount_bdt: 50,
    supporter_name: null,
    message: "এক প্লেট নাস্তার জন্য — ধন্যবাদ।",
    method_kind: "nagad",
    status: "confirmed",
    age_days: 4,
    txid: null,
  },
  {
    id: "demo-claim-writer-1",
    creator_slug: "demo-writer",
    amount_bdt: 20,
    supporter_name: "নীলা",
    message: "গল্পটা পড়ে অনেকদিন পর বাংলা বই ধরলাম।",
    method_kind: "rocket",
    status: "unverified",
    age_days: 3,
    txid: null,
  },
  {
    id: "demo-claim-writer-2",
    creator_slug: "demo-writer",
    amount_bdt: 500,
    supporter_name: null,
    message: "লেখাটা কাজে লেগেছে, ভালো থাকুন।",
    method_kind: "bkash",
    status: "confirmed",
    age_days: 6,
    txid: null,
  },
];

/** Demo claims, dated relative to `now` so the supporter pages feel fresh. */
export function demoClaims(now: number = Date.now()): SupportClaim[] {
  return DEMO_CLAIM_SEEDS.map((seed) => {
    const created = new Date(now - seed.age_days * 86_400_000).toISOString();
    return {
      id: seed.id,
      creator_id: `demo-creator-${seed.creator_slug}`,
      creator_slug: seed.creator_slug,
      amount_bdt: seed.amount_bdt,
      payment_method_id: null,
      method_kind: seed.method_kind,
      supporter_name: seed.supporter_name,
      message: seed.message,
      txid: seed.txid,
      status: seed.status,
      created_at: created,
      confirmed_at: seed.status === "confirmed" ? created : null,
      hidden_at: seed.status === "hidden" ? created : null,
      rejected_at: null,
    };
  });
}

/** A demo creator's public claims (public statuses only, newest first). */
export function demoPublicClaims(slug: string, now: number = Date.now()): SupportClaim[] {
  return demoClaims(now)
    .filter((claim) => claim.creator_slug === slug)
    .filter((claim) => claim.status === "unverified" || claim.status === "confirmed")
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export interface DemoInvariantViolation {
  creator: string;
  problem: string;
}

/**
 * Used by the demo-data test AND by the local data layer before it renders demo
 * creators: refuse to ever present a demo page that looks like a real account.
 */
export function checkDemoInvariants(): DemoInvariantViolation[] {
  const problems: DemoInvariantViolation[] = [];
  for (const creator of DEMO_CREATORS) {
    if (!creator.slug.startsWith("demo-")) problems.push({ creator: creator.slug, problem: "slug is not demo-prefixed" });
    if (!creator.is_demo) problems.push({ creator: creator.slug, problem: "creator is not marked demo" });
    if (!creator.display_name.includes("ডেমো")) problems.push({ creator: creator.slug, problem: "display name is not marked ডেমো" });
    if (creator.status !== "published") problems.push({ creator: creator.slug, problem: "demo creator is not published" });
    const methods = demoMethodsFor(creator.slug);
    if (methods.length === 0) problems.push({ creator: creator.slug, problem: "no enabled payment method" });
    for (const method of methods) {
      // A real Bangladeshi MFS number starts 013/014/015/016/017/018/019; the
      // synthetic fixtures use the unassignable 010… prefix, and the demo bank
      // account is all zeroes.
      if (method.account_number) {
        const fake = /^0[0-9]+$/.test(method.account_number) && !/^01[3-9]/.test(method.account_number);
        if (!fake) {
          problems.push({ creator: creator.slug, problem: `account "${method.account_number}" is not obviously fake` });
        }
      }
      if (method.qr_status === "verified" && !method.qr_payload) {
        problems.push({ creator: creator.slug, problem: "verified QR without a payload" });
      }
      if (method.qr_payload) {
        const classification = classifyPayload(method.qr_payload);
        if (!classification.ok) problems.push({ creator: creator.slug, problem: "demo QR payload does not decode" });
        if (classification.merchantName && !classification.merchantName.startsWith("DEMO")) {
          problems.push({ creator: creator.slug, problem: "demo QR merchant is not a DEMO name" });
        }
      }
    }
  }
  const statuses = new Set(demoClaims().map((claim) => claim.status));
  if (!statuses.has("unverified")) problems.push({ creator: "*", problem: "demo claims have no unverified row" });
  if (!statuses.has("confirmed")) problems.push({ creator: "*", problem: "demo claims have no confirmed row" });
  if (!statuses.has("hidden")) problems.push({ creator: "*", problem: "demo claims have no hidden row" });
  return problems;
}
