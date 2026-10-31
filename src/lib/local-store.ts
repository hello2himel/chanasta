/**
 * Local demo-mode data store.
 *
 * Implements the same interface as the Supabase layer but persists the visitor's
 * own page, payment methods and self-reported claims in `localStorage` under the
 * architecture keys (`chanasta.local.*`). Demo creators themselves are static
 * fixtures in `demo.ts` — only the visitor's page and the claims submitted from
 * this browser are stored.
 *
 * Corrupted storage must never throw: a key that fails to parse or validate is
 * removed and treated as empty (`test/local-store.test.ts` covers this).
 */
import { STORAGE_KEYS } from "./config.ts";
import { DataError } from "./errors.ts";
import { canReview, isReservedSlug, validateClaim, validatePaymentMethod, validateProfileText, slugProblem } from "./validate.ts";
import { findDemoCreator, isDemoSlug } from "./demo.ts";
import type {
  ClaimInput,
  ClaimResult,
  Creator,
  CreatorProfilePatch,
  CreateCreatorInput,
  PaymentKind,
  PaymentMethod,
  PaymentMethodInput,
  ReviewAction,
  SupportClaim,
  QrDecodedSnapshot,
} from "./types.ts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalStoreOptions {
  now?: () => number;
  idFactory?: (prefix: string) => string;
  /** Claim rate limits (mirrors the RPC in data-model §8). */
  rateLimits?: { perHour: number; perDay: number; perCreatorDay: number };
}

const DEFAULT_LIMITS = { perHour: 5, perDay: 20, perCreatorDay: 100 };

const MAX_METHODS = 8;
const DAY_MS = 86_400_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCreatorRow(value: unknown): value is Creator {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.display_name === "string" &&
    (value.status === "draft" || value.status === "published" || value.status === "suspended")
  );
}

function isMethodRow(value: unknown): value is PaymentMethod {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.creator_id === "string" &&
    typeof value.label === "string" &&
    typeof value.kind === "string" &&
    (value.qr_status === "none" ||
      value.qr_status === "verified" ||
      value.qr_status === "unverified" ||
      value.qr_status === "image_only")
  );
}

function isClaimRow(value: unknown): value is SupportClaim {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.creator_id === "string" &&
    typeof value.amount_bdt === "number" &&
    (value.status === "unverified" ||
      value.status === "confirmed" ||
      value.status === "hidden" ||
      value.status === "rejected")
  );
}

export class LocalStore {
  private readonly storage: StorageLike;
  private readonly now: () => number;
  private readonly idFactory: (prefix: string) => string;
  private readonly limits: { perHour: number; perDay: number; perCreatorDay: number };

  constructor(storage: StorageLike, options: LocalStoreOptions = {}) {
    this.storage = storage;
    this.now = options.now ?? (() => Date.now());
    this.idFactory =
      options.idFactory ??
      ((prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`);
    this.limits = options.rateLimits ?? DEFAULT_LIMITS;
  }

  // ---- storage primitives ------------------------------------------------
  private readArray<T>(key: string, isValid: (value: unknown) => value is T): T[] {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(key);
    } catch {
      return [];
    }
    if (raw === null || raw === "") return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      const valid = parsed.filter(isValid);
      if (valid.length !== parsed.length) this.writeArray(key, valid);
      return valid;
    } catch {
      this.remove(key);
      return [];
    }
  }

  private writeArray(key: string, value: unknown[]): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota/private mode: keep the in-memory behaviour of the caller, never throw */
    }
  }

  private remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  creators(): Creator[] {
    return this.readArray(STORAGE_KEYS.creators, isCreatorRow);
  }

  methods(): PaymentMethod[] {
    return this.readArray(STORAGE_KEYS.methods, isMethodRow);
  }

  claims(): SupportClaim[] {
    return this.readArray(STORAGE_KEYS.claims, isClaimRow);
  }

  ownerId(): string | null {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(STORAGE_KEYS.owner);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isObject(parsed) && typeof parsed.creator_id === "string") return parsed.creator_id;
      throw new Error("invalid owner");
    } catch {
      this.remove(STORAGE_KEYS.owner);
      return null;
    }
  }

  private writeOwner(creatorId: string | null): void {
    if (creatorId === null) this.remove(STORAGE_KEYS.owner);
    else {
      try {
        this.storage.setItem(STORAGE_KEYS.owner, JSON.stringify({ creator_id: creatorId }));
      } catch {
        /* ignore */
      }
    }
  }

  private saveCreators(rows: Creator[]): void {
    this.writeArray(STORAGE_KEYS.creators, rows);
  }

  private saveMethods(rows: PaymentMethod[]): void {
    this.writeArray(STORAGE_KEYS.methods, rows);
  }

  private saveClaims(rows: SupportClaim[]): void {
    this.writeArray(STORAGE_KEYS.claims, rows);
  }

  // ---- creators ----------------------------------------------------------
  /** The visitor's own page (null when none exists, deleted, or storage recovered). */
  getOwner(): Creator | null {
    const id = this.ownerId();
    if (!id) return null;
    const creator = this.creators().find((row) => row.id === id) ?? null;
    if (!creator || creator.deleted_at) return null;
    return creator;
  }

  listOwnedCreators(): Creator[] {
    return this.creators().filter((creator) => !creator.deleted_at);
  }

  getCreatorBySlug(slug: string): Creator | null {
    return this.creators().find((creator) => creator.slug === slug) ?? null;
  }

  isSlugAvailable(slug: string): boolean {
    if (slugProblem(slug) !== null) return false;
    if (isReservedSlug(slug)) return false;
    if (isDemoSlug(slug)) return false;
    return !this.creators().some((creator) => creator.slug === slug);
  }

  createCreator(input: CreateCreatorInput): Creator {
    const problem = slugProblem(input.slug);
    if (problem === "reserved") throw new DataError("SLUG_RESERVED", "That link can't be used.", "slug");
    if (problem !== null) throw new DataError("SLUG_INVALID", "That link isn't valid.", "slug");
    if (!this.isSlugAvailable(input.slug)) throw new DataError("SLUG_TAKEN", "That link is taken.", "slug");

    const profile = validateProfileText({ display_name: input.display_name, tagline: input.tagline, bio: input.bio });
    if (!profile.ok) {
      const field = Object.keys(profile.errors)[0] ?? "display_name";
      throw new DataError("INVALID_INPUT", "Check the profile fields.", field);
    }

    const timestamp = new Date(this.now()).toISOString();
    const creator: Creator = {
      id: this.idFactory("creator"),
      slug: input.slug,
      display_name: input.display_name.trim(),
      tagline: input.tagline?.trim() || null,
      bio: input.bio?.trim() || null,
      avatar_emoji: input.avatar_emoji ?? "☕",
      socials: {},
      goal_amount_bdt: null,
      goal_note: null,
      default_locale: input.default_locale ?? "bn",
      status: "draft",
      verified: false,
      published_at: null,
      updated_at: timestamp,
      created_at: timestamp,
      deleted_at: null,
      last_slug_change_at: null,
      is_demo: false,
    };
    this.saveCreators([...this.creators(), creator]);
    this.writeOwner(creator.id);
    return creator;
  }

  updateCreator(id: string, patch: CreatorProfilePatch): Creator {
    const rows = this.creators();
    const index = rows.findIndex((creator) => creator.id === id);
    if (index < 0) throw new DataError("NOT_FOUND", "Creator not found.");
    const creator = rows[index] as Creator;
    const next: Creator = { ...creator };

    if (patch.display_name !== undefined) {
      const profile = validateProfileText({
        display_name: patch.display_name,
        tagline: patch.tagline ?? creator.tagline,
        bio: patch.bio ?? creator.bio,
      });
      if (!profile.ok) {
        const field = Object.keys(profile.errors)[0] ?? "display_name";
        throw new DataError("INVALID_INPUT", "Check the profile fields.", field);
      }
      next.display_name = patch.display_name.trim();
    }
    if (patch.tagline !== undefined) {
      next.tagline = patch.tagline?.trim() || null;
    }
    if (patch.bio !== undefined) {
      next.bio = patch.bio?.trim() || null;
    }
    if (patch.avatar_emoji !== undefined) {
      next.avatar_emoji = patch.avatar_emoji;
    }
    if (patch.socials !== undefined) {
      next.socials = patch.socials;
    }
    if (patch.default_locale !== undefined) {
      next.default_locale = patch.default_locale;
    }
    next.updated_at = new Date(this.now()).toISOString();
    rows[index] = next;
    this.saveCreators(rows);
    return next;
  }

  setCreatorStatus(id: string, status: "published" | "draft"): Creator {
    const rows = this.creators();
    const index = rows.findIndex((creator) => creator.id === id);
    if (index < 0) throw new DataError("NOT_FOUND", "Creator not found.");
    const creator = rows[index] as Creator;
    if (creator.deleted_at) throw new DataError("NOT_FOUND", "Creator not found.");

    if (status === "published") {
      const enabled = this.methods().filter((method) => method.creator_id === id && method.enabled);
      if (enabled.length === 0) {
        throw new DataError("PUBLISH_NEEDS_METHOD", "Add a payment method first.");
      }
    }

    const timestamp = new Date(this.now()).toISOString();
    const next: Creator = {
      ...creator,
      status,
      published_at: status === "published" ? (creator.published_at ?? timestamp) : creator.published_at,
      updated_at: timestamp,
    };
    rows[index] = next;
    this.saveCreators(rows);
    return next;
  }

  changeSlug(id: string, slug: string): Creator {
    const problem = slugProblem(slug);
    if (problem === "reserved") throw new DataError("SLUG_RESERVED", "That link can't be used.", "slug");
    if (problem !== null) throw new DataError("SLUG_INVALID", "That link isn't valid.", "slug");
    if (!this.isSlugAvailable(slug)) throw new DataError("SLUG_TAKEN", "That link is taken.", "slug");

    const rows = this.creators();
    const index = rows.findIndex((creator) => creator.id === id);
    if (index < 0) throw new DataError("NOT_FOUND", "Creator not found.");
    const creator = rows[index] as Creator;

    if (creator.last_slug_change_at) {
      const elapsed = this.now() - Date.parse(creator.last_slug_change_at);
      if (Number.isFinite(elapsed) && elapsed < 30 * DAY_MS) {
        throw new DataError("SLUG_RATE_LIMITED", "You can change the link once every 30 days.", "slug");
      }
    }

    const timestamp = new Date(this.now()).toISOString();
    const next: Creator = { ...creator, slug, last_slug_change_at: timestamp, updated_at: timestamp };
    rows[index] = next;
    this.saveCreators(rows);
    return next;
  }

  softDeleteCreator(id: string): void {
    const rows = this.creators();
    const index = rows.findIndex((creator) => creator.id === id);
    if (index < 0) throw new DataError("NOT_FOUND", "Creator not found.");
    const timestamp = new Date(this.now()).toISOString();
    rows[index] = { ...(rows[index] as Creator), deleted_at: timestamp, status: "suspended", updated_at: timestamp };
    this.saveCreators(rows);
    if (this.ownerId() === id) this.writeOwner(null);
  }

  // ---- payment methods ---------------------------------------------------
  listMethodsForCreator(creatorId: string, options: { includeDisabled?: boolean } = {}): PaymentMethod[] {
    return this.methods()
      .filter((method) => method.creator_id === creatorId)
      .filter((method) => (options.includeDisabled ? true : method.enabled))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  savePaymentMethod(input: PaymentMethodInput): PaymentMethod {
    const creators = this.creators();
    if (!creators.some((creator) => creator.id === input.creator_id)) {
      throw new DataError("NOT_FOUND", "Creator not found.");
    }
    const validation = validatePaymentMethod({
      kind: input.kind,
      label: input.label,
      account_number: input.account_number,
      account_holder: input.account_holder,
      bank_name: input.bank_name,
      routing_number: input.routing_number,
      qr_payload: input.qr_payload,
    });
    if (!validation.ok) {
      const issue = validation.issues[0];
      throw new DataError("INVALID_INPUT", "Check the payment fields.", issue?.field ?? "label");
    }

    const rows = this.methods();
    const existingIndex = input.id ? rows.findIndex((method) => method.id === input.id) : -1;
    const timestamp = new Date(this.now()).toISOString();

    const enabled = input.enabled ?? (existingIndex >= 0 ? (rows[existingIndex] as PaymentMethod).enabled : true);
    const nextEnabledCount =
      rows.filter((method) => method.creator_id === input.creator_id && method.enabled && method.id !== input.id).length +
      (enabled ? 1 : 0);
    if (nextEnabledCount > MAX_METHODS) throw new DataError("METHOD_LIMIT", "Up to 8 methods.");

    const sortOrder =
      input.sort_order ??
      (existingIndex >= 0
        ? (rows[existingIndex] as PaymentMethod).sort_order
        : rows.filter((method) => method.creator_id === input.creator_id).length);

    const status = input.qr_status ?? "none";
    const qrDecoded: QrDecodedSnapshot | null = input.qr_decoded ?? null;
    if (status === "verified" && (!input.qr_payload || !qrDecoded)) {
      throw new DataError("INVALID_INPUT", "Verified QR needs a decoded snapshot.", "payload");
    }
    if (status === "unverified" && !input.qr_payload) {
      throw new DataError("INVALID_INPUT", "Unverified QR needs a payload.", "payload");
    }
    if (status === "none" && (input.qr_payload || input.qr_image_path)) {
      // Callers pass the classification status; a payload without a status is wrong.
      throw new DataError("INVALID_INPUT", "QR status does not match the stored evidence.", "payload");
    }

    const row: PaymentMethod = {
      id: input.id ?? this.idFactory("method"),
      creator_id: input.creator_id,
      creator_slug: creators.find((creator) => creator.id === input.creator_id)?.slug,
      kind: input.kind,
      label: input.label.trim(),
      account_number: input.account_number?.trim() || null,
      account_holder: input.account_holder?.trim() || null,
      bank_name: input.bank_name?.trim() || null,
      branch: input.branch?.trim() || null,
      routing_number: input.routing_number?.trim() || null,
      qr_payload: input.qr_payload?.trim() || null,
      qr_image_path: input.qr_image_path ?? null,
      qr_status: status,
      qr_decoded: qrDecoded,
      sort_order: sortOrder,
      enabled,
      created_at: existingIndex >= 0 ? (rows[existingIndex] as PaymentMethod).created_at : timestamp,
      updated_at: timestamp,
    };

    if (existingIndex >= 0) rows[existingIndex] = row;
    else rows.push(row);
    this.saveMethods(rows);
    return row;
  }

  deletePaymentMethod(id: string): void {
    const rows = this.methods();
    const next = rows.filter((method) => method.id !== id);
    if (next.length === rows.length) throw new DataError("NOT_FOUND", "Method not found.");
    this.saveMethods(next);
  }

  reorderPaymentMethods(ids: string[]): void {
    const rows = this.methods();
    const known = new Set(rows.map((method) => method.id));
    if (ids.some((id) => !known.has(id))) throw new DataError("NOT_FOUND", "Method not found.");
    const order = new Map(ids.map((id, index) => [id, index]));
    const next = rows.map((method) => {
      const index = order.get(method.id);
      return index === undefined ? method : { ...method, sort_order: index, updated_at: new Date(this.now()).toISOString() };
    });
    this.saveMethods(next);
  }

  // ---- claims ------------------------------------------------------------
  private resolveCreator(slug: string): { id: string; slug: string; status: Creator["status"] } | null {
    const demo = findDemoCreator(slug);
    if (demo) return { id: demo.id, slug: demo.slug, status: demo.status };
    const local = this.creators().find((creator) => creator.slug === slug && !creator.deleted_at);
    if (local) return { id: local.id, slug: local.slug, status: local.status };
    return null;
  }

  submitClaim(input: ClaimInput): ClaimResult {
    const creator = this.resolveCreator(input.creator_slug);
    if (!creator) throw new DataError("NOT_FOUND", "Creator not found.", "creator");
    if (creator.status !== "published") throw new DataError("NOT_PUBLISHED", "This page isn't public yet.");

    const validation = validateClaim(input);
    if (!validation.ok) {
      const issue = validation.issues[0];
      if (issue?.field === "amount" && issue.code === "TOO_LARGE") {
        throw new DataError("CLAIM_TOO_LARGE", "That amount is too large.", "amount");
      }
      throw new DataError("INVALID_INPUT", "Check the claim form.", issue?.field ?? "amount");
    }

    const amount = input.amount_bdt as number;
    const now = this.now();
    const existing = this.claims();

    const lastHour = existing.filter((claim) => now - Date.parse(claim.created_at) < 3_600_000).length;
    if (lastHour >= this.limits.perHour) throw new DataError("RATE_LIMITED", "Too many attempts.");
    const lastDay = existing.filter((claim) => now - Date.parse(claim.created_at) < DAY_MS).length;
    if (lastDay >= this.limits.perDay) throw new DataError("RATE_LIMITED", "Too many attempts.");
    const perCreator = existing.filter(
      (claim) => claim.creator_id === creator.id && now - Date.parse(claim.created_at) < DAY_MS,
    ).length;
    if (perCreator >= this.limits.perCreatorDay) throw new DataError("RATE_LIMITED", "Too many attempts.");

    const claim: SupportClaim = {
      id: this.idFactory("claim"),
      creator_id: creator.id,
      creator_slug: creator.slug,
      amount_bdt: amount,
      payment_method_id: input.payment_method_id ?? null,
      method_kind: (input.method_kind ?? null) as PaymentKind | null,
      supporter_name: input.supporter_name?.trim() || null,
      message: input.message?.trim() || null,
      txid: input.txid?.trim() || null,
      status: "unverified",
      created_at: new Date(now).toISOString(),
      confirmed_at: null,
      hidden_at: null,
      rejected_at: null,
    };
    this.saveClaims([claim, ...existing]);
    return { id: claim.id, status: claim.status, created_at: claim.created_at };
  }

  /** Claims for a page; public mode only ever returns unverified/confirmed. */
  listClaimsForSlug(
    slug: string,
    options: { publicOnly?: boolean; limit?: number } = {},
  ): SupportClaim[] {
    const creator = this.resolveCreator(slug);
    if (!creator) return [];
    const rows = this.claims()
      .filter((claim) => claim.creator_id === creator.id)
      .filter((claim) => (options.publicOnly ? claim.status === "unverified" || claim.status === "confirmed" : true))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    return typeof options.limit === "number" ? rows.slice(0, options.limit) : rows;
  }

  listMyClaims(): SupportClaim[] {
    const owned = new Set(this.listOwnedCreators().map((creator) => creator.id));
    return this.claims()
      .filter((claim) => owned.has(claim.creator_id))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }

  reviewClaim(claimId: string, action: ReviewAction): SupportClaim {
    const owned = new Set(this.listOwnedCreators().map((creator) => creator.id));
    const rows = this.claims();
    const index = rows.findIndex((claim) => claim.id === claimId);
    if (index < 0) throw new DataError("NOT_FOUND", "Claim not found.");
    const claim = rows[index] as SupportClaim;
    if (!owned.has(claim.creator_id)) throw new DataError("NOT_OWNER", "Not your claim.");
    if (!canReview(claim.status, action)) throw new DataError("INVALID_TRANSITION", "That transition isn't allowed.");

    const timestamp = new Date(this.now()).toISOString();
    const next: SupportClaim = { ...claim };
    if (action === "confirm") {
      next.status = "confirmed";
      next.confirmed_at = timestamp;
    } else if (action === "hide") {
      next.status = "hidden";
      next.hidden_at = timestamp;
    } else {
      next.status = "unverified";
      next.hidden_at = null;
      next.confirmed_at = null;
    }
    rows[index] = next;
    this.saveClaims(rows);
    return next;
  }

  /** Dashboard filter counts for the owner's claims. */
  claimCounts(): { all: number; unverified: number; confirmed: number; hidden: number } {
    const claims = this.listMyClaims();
    return {
      all: claims.length,
      unverified: claims.filter((claim) => claim.status === "unverified").length,
      confirmed: claims.filter((claim) => claim.status === "confirmed").length,
      hidden: claims.filter((claim) => claim.status === "hidden").length,
    };
  }
}

/** In-memory `StorageLike` used by tests and as a last-resort fallback. */
export class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

/** Safe access to the browser's localStorage; falls back to memory in private mode. */
export function browserStorage(): StorageLike {
  try {
    if (typeof localStorage !== "undefined") {
      const probe = "__chanasta_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    /* fall through to memory */
  }
  return getMemoryFallback();
}

let memoryFallback: MemoryStorage | null = null;
function getMemoryFallback(): MemoryStorage {
  if (!memoryFallback) memoryFallback = new MemoryStorage();
  return memoryFallback;
}
