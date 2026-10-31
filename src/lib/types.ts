/**
 * Shared data types.
 *
 * Field names deliberately mirror the Postgres columns in `docs/data-model.md`
 * (snake_case) so local demo mode, the Supabase mapping and the tests all speak
 * one vocabulary. Chanasta never stores a ledger: the only money column is the
 * self-reported `support_claims.amount_bdt`.
 */

export type CreatorStatus = "draft" | "published" | "suspended";
export type PaymentKind = "bkash" | "nagad" | "rocket" | "bank" | "other";
export type PaymentQrStatus = "none" | "verified" | "unverified" | "image_only";
export type ClaimStatus = "unverified" | "confirmed" | "hidden" | "rejected";
export type Lang = "bn" | "en";

/** Allowlisted social platforms (data-model §3.1); never email/phone. */
export type SocialKey =
  | "youtube"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "x"
  | "threads"
  | "telegram"
  | "linkedin"
  | "website";

/** A creator page, public columns plus the owner-only ones (undefined when public). */
export interface Creator {
  id: string;
  user_id?: string;
  slug: string;
  display_name: string;
  tagline: string | null;
  bio: string | null;
  avatar_emoji: string;
  socials: Record<string, string>;
  goal_amount_bdt: number | null;
  goal_note: string | null;
  default_locale: Lang;
  status: CreatorStatus;
  verified: boolean;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  deleted_at?: string | null;
  last_slug_change_at?: string | null;
  /** Local demo marker (never stored in the database). */
  is_demo?: boolean;
}

/** One of the creator's own ways to receive money. */
export interface PaymentMethod {
  id: string;
  creator_id: string;
  /** Present on public view rows (`public_payment_methods.creator_slug`). */
  creator_slug?: string;
  kind: PaymentKind;
  label: string;
  account_number: string | null;
  account_holder: string | null;
  bank_name: string | null;
  branch: string | null;
  routing_number: string | null;
  qr_payload: string | null;
  qr_image_path: string | null;
  qr_status: PaymentQrStatus;
  qr_decoded: QrDecodedSnapshot | null;
  sort_order: number;
  enabled: boolean;
  created_at?: string;
  updated_at: string;
}

/** The public, non-secret snapshot of a decoded Bangla QR (data-model §4). */
export interface QrDecodedSnapshot {
  merchant_name: string;
  merchant_city: string | null;
  account_mask: string;
  institution: string;
  reference: string | null;
  kind: "static" | "dynamic";
  decoded_at: string;
}

/** A self-reported "I sent it" message. Never a receipt, never proof. */
export interface SupportClaim {
  id: string;
  creator_id: string;
  creator_slug?: string;
  amount_bdt: number;
  payment_method_id: string | null;
  method_kind: PaymentKind | null;
  supporter_name: string | null;
  message: string | null;
  /** Private: owner-only, never in public views/renders/exports-by-default. */
  txid: string | null;
  status: ClaimStatus;
  created_at: string;
  confirmed_at?: string | null;
  hidden_at?: string | null;
  rejected_at?: string | null;
}

/** Input for the public claim RPC / local implementation. */
export interface ClaimInput {
  creator_slug: string;
  amount_bdt: number;
  supporter_name?: string | null;
  message?: string | null;
  txid?: string | null;
  method_kind?: PaymentKind | null;
  payment_method_id?: string | null;
  /** The supporter must acknowledge the age line; verified client-side. */
  age_ack?: boolean;
}

export interface ClaimResult {
  id: string;
  status: ClaimStatus;
  created_at: string;
}

/** Input for creating a page. */
export interface CreateCreatorInput {
  slug: string;
  display_name: string;
  tagline?: string | null;
  bio?: string | null;
  avatar_emoji?: string;
  default_locale?: Lang;
}

export type CreatorProfilePatch = Partial<
  Pick<Creator, "display_name" | "tagline" | "bio" | "avatar_emoji" | "socials" | "default_locale">
>;

export interface PaymentMethodInput {
  id?: string;
  creator_id: string;
  kind: PaymentKind;
  label: string;
  account_number?: string | null;
  account_holder?: string | null;
  bank_name?: string | null;
  branch?: string | null;
  routing_number?: string | null;
  qr_payload?: string | null;
  qr_image_path?: string | null;
  qr_status?: PaymentQrStatus;
  qr_decoded?: QrDecodedSnapshot | null;
  sort_order?: number;
  enabled?: boolean;
}

export type ReviewAction = "confirm" | "hide" | "restore";

/** Session shape shared by local demo mode and Supabase auth. */
export interface Session {
  user_id: string;
  email: string | null;
  is_demo: boolean;
}

export const PAYMENT_KINDS: readonly PaymentKind[] = ["bkash", "nagad", "rocket", "bank", "other"];
export const CLAIM_STATUSES: readonly ClaimStatus[] = ["unverified", "confirmed", "hidden", "rejected"];

/** The claim state machine (data-model §7). Invalid transitions are rejected. */
export const CLAIM_TRANSITIONS: Readonly<Record<ClaimStatus, readonly ClaimStatus[]>> = {
  unverified: ["confirmed", "hidden", "rejected"],
  confirmed: ["hidden", "rejected"],
  hidden: ["unverified", "rejected"],
  rejected: [],
};

export const DEMO_WISHER = null;

/** Public label keys for claim status badges (i18n keys). */
export const CLAIM_BADGE_KEY: Readonly<Record<ClaimStatus, string | null>> = {
  unverified: "claim.badge.selfReported",
  confirmed: "claim.badge.creatorConfirmed",
  hidden: "claim.badge.hidden",
  rejected: "claim.badge.rejected",
};
