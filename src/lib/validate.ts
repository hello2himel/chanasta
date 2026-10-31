/**
 * Pure validation for the whole product.
 *
 * Rules come from `docs/data-model.md` §3, §4, §5, §6 and the copy deck in
 * `docs/brand-copy.md` §6/§7.3. Everything here is side-effect free so it can
 * run in `node:test` without a DOM.
 */
import type { ClaimInput, PaymentKind } from "./types.ts";

/** Slugs that must never become a page (data-model §6). */
export const RESERVED_SLUGS: readonly string[] = [
  // routes / system
  "admin", "api", "app", "auth", "dashboard", "login", "logout", "signup", "signin",
  "onboarding", "new", "settings", "support", "help", "legal", "terms", "privacy", "docs",
  "dev", "blog", "explore", "embed", "assets", "static", "health", "status", "about",
  "contact", "null", "undefined", "root", "system", "mail", "www", "test", "demo",
  // brand / provider impersonation
  "chanasta", "chanasta-bd", "bkash", "nagad", "rocket", "upay", "bangladesh-bank", "bb",
  "npsb", "banglaqr", "bank",
  // abuse-prone
  "official", "verify", "verified", "security", "donate", "fund", "foundation", "charity",
  "helpdesk", "refund",
];

const RESERVED = new Set(RESERVED_SLUGS);

export const SLUG_MIN = 3;
export const SLUG_MAX = 30;
const SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const CLAIM_LIMITS = {
  minAmount: 1,
  maxAmount: 100_000,
  maxName: 40,
  maxMessage: 280,
  maxTxid: 64,
  maxMethods: 8,
} as const;

export const CREATOR_LIMITS = {
  maxDisplayName: 60,
  maxTagline: 80,
  maxBio: 600,
  maxSocials: 6,
  maxLabel: 40,
  maxAccountHolder: 60,
  maxBankName: 60,
  maxBranch: 60,
} as const;

export type SlugProblem = "empty" | "length" | "uppercase" | "format" | "reserved";

/** Format-level slug shape check (no reservation/availability lookup). */
export function isSlugShapeValid(slug: string): boolean {
  return slugProblem(slug) === null;
}

/** Full client-side rule check (format + reserved list; availability is a server call). */
export function isSlugRuleValid(slug: string): boolean {
  const problem = slugProblem(slug);
  return problem === null;
}

export function slugProblem(slug: string): SlugProblem | null {
  if (typeof slug !== "string" || slug.length === 0) return "empty";
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return "length";
  if (slug !== slug.toLowerCase()) return "uppercase";
  if (!SLUG_RE.test(slug)) return "format";
  if (RESERVED.has(slug)) return "reserved";
  return null;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}

/** Client-side availability result, before asking the backend. */
export function checkSlugLocally(slug: string): { ok: boolean; problem: SlugProblem | null } {
  const problem = slugProblem(slug);
  return { ok: problem === null, problem };
}

/** Strip ৳, commas and spaces from an amount input. Returns null when not numeric. */
export function parseTaka(raw: string): number | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[৳,\s]/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value;
}

export type ClaimField = "amount" | "name" | "message" | "txid" | "method" | "age";

export interface ClaimValidationIssue {
  field: ClaimField;
  code: "REQUIRED" | "TOO_SMALL" | "TOO_LARGE" | "TOO_LONG" | "INVALID";
}

export interface ClaimValidationResult {
  ok: boolean;
  issues: ClaimValidationIssue[];
}

const PAYMENT_KIND_SET = new Set<string>(["bkash", "nagad", "rocket", "bank", "other"]);

export function validateClaim(input: Partial<ClaimInput>): ClaimValidationResult {
  const issues: ClaimValidationIssue[] = [];
  const amount = input.amount_bdt;

  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    issues.push({ field: "amount", code: "REQUIRED" });
  } else if (amount < CLAIM_LIMITS.minAmount) {
    issues.push({ field: "amount", code: "TOO_SMALL" });
  } else if (amount > CLAIM_LIMITS.maxAmount) {
    issues.push({ field: "amount", code: "TOO_LARGE" });
  }

  if (input.supporter_name != null && input.supporter_name.trim().length > CLAIM_LIMITS.maxName) {
    issues.push({ field: "name", code: "TOO_LONG" });
  }
  if (input.message != null && input.message.trim().length > CLAIM_LIMITS.maxMessage) {
    issues.push({ field: "message", code: "TOO_LONG" });
  }
  if (input.txid != null && input.txid.trim().length > CLAIM_LIMITS.maxTxid) {
    issues.push({ field: "txid", code: "TOO_LONG" });
  }
  if (input.method_kind != null && !PAYMENT_KIND_SET.has(input.method_kind)) {
    issues.push({ field: "method", code: "INVALID" });
  }
  if (input.age_ack !== true) {
    issues.push({ field: "age", code: "REQUIRED" });
  }

  return { ok: issues.length === 0, issues };
}

export interface ProfileValidationResult {
  ok: boolean;
  errors: Record<string, "REQUIRED" | "TOO_LONG" | "MULTILINE" | "BANNED" | "INVALID">;
}

const LATIN_BANNED = [
  "\\bdonat(?:e|ion|ions)\\b",
  "\\bfundrais(?:e|er|ers|ing)\\b",
  "\\bcampaigns?\\b",
  "\\bcharity\\b",
  "\\bverified payment\\b",
  "\\bguaranteed\\b",
  "\\bescrow\\b",
  "\\brefunds?\\b",
  "\\btips?\\b",
];
const LATIN_BANNED_RE = new RegExp(LATIN_BANNED.join("|"), "i");
const BANGLA_BANNED = ["অনুদান", "চ্যারিটি", "ক্যাম্পেইন", "ফান্ডরেইজিং", "দান করুন"];

/** Detect prohibited vocabulary in free-text profile fields (compliance §7). */
export function findBannedTerm(text: string): string | null {
  if (!text) return null;
  const latin = text.match(LATIN_BANNED_RE);
  if (latin) return latin[0];
  for (const term of BANGLA_BANNED) {
    if (text.includes(term)) return term;
  }
  return null;
}

export function validateProfileText(input: {
  display_name?: string;
  tagline?: string | null;
  bio?: string | null;
}): ProfileValidationResult {
  const errors: ProfileValidationResult["errors"] = {};
  const name = (input.display_name ?? "").trim();
  if (name.length === 0) errors.display_name = "REQUIRED";
  else if (name.length > CREATOR_LIMITS.maxDisplayName) errors.display_name = "TOO_LONG";
  else if (/[\r\n]/.test(name)) errors.display_name = "MULTILINE";

  if (input.tagline != null) {
    const tagline = input.tagline.trim();
    if (tagline.length > CREATOR_LIMITS.maxTagline) errors.tagline = "TOO_LONG";
    else if (/[\r\n]/.test(tagline)) errors.tagline = "MULTILINE";
    else if (findBannedTerm(tagline)) errors.tagline = "BANNED";
  }
  if (input.bio != null) {
    if (input.bio.trim().length > CREATOR_LIMITS.maxBio) errors.bio = "TOO_LONG";
    else if (findBannedTerm(input.bio)) errors.bio = "BANNED";
  }
  if (name && findBannedTerm(name)) errors.display_name = "BANNED";

  return { ok: Object.keys(errors).length === 0, errors };
}

export function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

const ACCOUNT_RE = /^[0-9][0-9 -]{5,33}$/;

export function isValidAccountNumber(value: string): boolean {
  return ACCOUNT_RE.test(value.trim());
}

export function isValidRoutingNumber(value: string): boolean {
  return /^\d{6,9}$/.test(value.trim());
}

export type PaymentField = "kind" | "label" | "account" | "holder" | "bank" | "routing" | "payload" | "evidence";

export interface PaymentValidationResult {
  ok: boolean;
  issues: { field: PaymentField; code: "REQUIRED" | "TOO_LONG" | "INVALID" }[];
}

export function validatePaymentMethod(input: {
  kind: PaymentKind;
  label: string;
  account_number?: string | null;
  account_holder?: string | null;
  bank_name?: string | null;
  branch?: string | null;
  routing_number?: string | null;
  qr_payload?: string | null;
}): PaymentValidationResult {
  const issues: PaymentValidationResult["issues"] = [];
  const kind = input.kind;
  if (!PAYMENT_KIND_SET.has(kind)) issues.push({ field: "kind", code: "INVALID" });

  const label = (input.label ?? "").trim();
  if (label.length === 0) issues.push({ field: "label", code: "REQUIRED" });
  else if (label.length > CREATOR_LIMITS.maxLabel) issues.push({ field: "label", code: "TOO_LONG" });

  const account = (input.account_number ?? "").trim();
  const payload = (input.qr_payload ?? "").trim();
  const hasEvidence = account.length > 0 || payload.length > 0;

  if (kind === "bank") {
    if (account.length === 0) issues.push({ field: "account", code: "REQUIRED" });
    else if (!isValidAccountNumber(account)) issues.push({ field: "account", code: "INVALID" });
    if (((input.bank_name ?? "").trim()).length === 0) issues.push({ field: "bank", code: "REQUIRED" });
    if (((input.bank_name ?? "").trim()).length > CREATOR_LIMITS.maxBankName) issues.push({ field: "bank", code: "TOO_LONG" });
    if (((input.branch ?? "").trim()).length > CREATOR_LIMITS.maxBranch) issues.push({ field: "bank", code: "TOO_LONG" });
    if (!isValidRoutingNumber(input.routing_number ?? "")) issues.push({ field: "routing", code: "INVALID" });
  } else if (kind !== "other") {
    if (account.length > 0 && !isValidAccountNumber(account)) issues.push({ field: "account", code: "INVALID" });
  }

  if (!hasEvidence) issues.push({ field: "evidence", code: "REQUIRED" });
  if (payload.length > 1024) issues.push({ field: "payload", code: "TOO_LONG" });
  if (((input.account_holder ?? "").trim()).length > CREATOR_LIMITS.maxAccountHolder) {
    issues.push({ field: "holder", code: "TOO_LONG" });
  }
  if (((input.account_number ?? "").trim()).length > 34) issues.push({ field: "account", code: "TOO_LONG" });

  return { ok: issues.length === 0, issues };
}

/** Which claim review actions are legal from a given status (mirrors RPC). */
export function canReview(status: string, action: "confirm" | "hide" | "restore"): boolean {
  if (action === "confirm") return status === "unverified";
  if (action === "hide") return status === "unverified" || status === "confirmed";
  if (action === "restore") return status === "hidden";
  return false;
}

/** SQL/RPC error codes we know how to explain to a person. */
const KNOWN_ERROR_CODES = [
  "SLUG_TAKEN",
  "SLUG_RESERVED",
  "SLUG_INVALID",
  "SLUG_RATE_LIMITED",
  "RATE_LIMITED",
  "CLAIM_TOO_LARGE",
  "NOT_PUBLISHED",
  "PUBLISH_NEEDS_METHOD",
  "METHOD_LIMIT",
  "BAD_ORDER",
  "INVALID_TRANSITION",
  "NOT_OWNER",
] as const;

export function errorCodeFromMessage(message: string): string | null {
  const upper = message.toUpperCase();
  for (const code of KNOWN_ERROR_CODES) {
    if (upper.includes(code)) return code;
  }
  return null;
}
