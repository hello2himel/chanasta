/**
 * QR / payment-method logic. All decoding, checksum checking and amount
 * derivation goes through the vendored deshiQR engine — nothing here parses
 * Bangla QR payloads by hand.
 *
 * Honesty rule: `verified` describes the *data* (checksum + required fields +
 * a scheme deshiQR has verified). It never means money moved.
 */
import {
  DeshiQrError,
  decodeSafe,
  formatTaka,
  institutionOf,
  maskAccount,
  validate,
  verifyChecksum,
  withAmount,
} from "./deshiqr.ts";
import { encode, toSvg } from "./qr.ts";
import type { DecodedQr } from "./deshiqr.ts";
import type { PaymentQrStatus, QrDecodedSnapshot, PaymentKind } from "./types.ts";

export interface Classification {
  ok: boolean;
  /** Mapped to `payment_methods.qr_status`; `none` when the payload is unusable. */
  status: PaymentQrStatus;
  decoded: QrDecodedSnapshot | null;
  merchantName: string | null;
  merchantCity: string | null;
  account: string | null;
  accountMasked: string | null;
  institution: string | null;
  institutionVerified: boolean;
  providerLabel: string | null;
  amount: number | null;
  kind: "static" | "dynamic" | null;
  errorCode: string | null;
  issues: string[];
}

const EMPTY: Classification = {
  ok: false,
  status: "none",
  decoded: null,
  merchantName: null,
  merchantCity: null,
  account: null,
  accountMasked: null,
  institution: null,
  institutionVerified: false,
  providerLabel: null,
  amount: null,
  kind: null,
  errorCode: null,
  issues: [],
};

function providerKind(institution: string | null): PaymentKind {
  if (!institution) return "other";
  // The NPSB scheme (bd.org.bb.npsb) is the one bKash issues.
  if (institution === "bd.org.bb.npsb") return "bkash";
  return "other";
}

/** Build the public, secret-free snapshot stored in `payment_methods.qr_decoded`. */
export function snapshotOfDecoded(decoded: DecodedQr, now: number = Date.now()): QrDecodedSnapshot {
  return {
    merchant_name: decoded.merchant.name,
    merchant_city: decoded.merchant.city,
    account_mask: maskAccount(decoded.merchant.account),
    institution: decoded.merchant.institution,
    reference: decoded.reference,
    kind: decoded.kind,
    decoded_at: new Date(now).toISOString(),
  };
}

/**
 * Classify a pasted payload.
 *  - verified:   decodes, checksum valid, and deshiQR has verified the scheme
 *                (today only the NPSB Bangla QR scheme bKash issues)
 *  - unverified: structurally valid Bangla QR from a scheme we can't verify yet
 *  - none:       not decodable — the UI must reject it and offer a manual number
 */
export function classifyPayload(payload: string, now: number = Date.now()): Classification {
  const text = typeof payload === "string" ? payload.trim() : "";
  if (text.length === 0) {
    return { ...EMPTY, errorCode: "EMPTY_PAYLOAD", issues: ["The payload is empty."] };
  }

  const report = validate(text);
  const decodedResult = report.ok ? decodeSafe(text) : null;
  if (!decodedResult || !decodedResult.ok) {
    const error = decodedResult && !decodedResult.ok
      ? decodedResult.error
      : (report.errors[0] ? { code: report.errors[0].code, message: report.errors[0].message } : null);
    return {
      ...EMPTY,
      errorCode: error?.code ?? "INVALID_PAYLOAD",
      issues: report.errors.map((issue) => issue.message),
    };
  }

  const decoded = decodedResult.qr;
  const institution = institutionOf(decoded);
  const verified = institution?.verified === true;
  const snapshot = snapshotOfDecoded(decoded, now);

  return {
    ok: true,
    status: verified ? "verified" : "unverified",
    decoded: snapshot,
    merchantName: decoded.merchant.name,
    merchantCity: decoded.merchant.city,
    account: decoded.merchant.account,
    accountMasked: maskAccount(decoded.merchant.account),
    institution: decoded.merchant.institution,
    institutionVerified: verified,
    providerLabel: institution?.label ?? decoded.merchant.institution,
    amount: decoded.amount,
    kind: decoded.kind,
    errorCode: null,
    issues: report.warnings.map((issue) => issue.message),
  };
}

/** True when a payload can be safely derived with an amount. */
export function canDeriveAmount(payload: string | null | undefined): boolean {
  if (!payload) return false;
  if (!verifyChecksum(payload)) return false;
  return decodeSafe(payload).ok;
}

/**
 * Derive the amount-specific payload from the creator's base static payload.
 * Merchant name, account, institution and NPSB tokens are preserved verbatim by
 * the engine. Passing `null` (ইচ্ছেমতো / any amount) returns the static payload.
 */
export function deriveAmountPayload(base: string, amount: number | null, options?: { reference?: string | null }): string {
  if (!base) throw new DeshiQrError("EMPTY_PAYLOAD", "No base QR payload.");
  if (amount === null || amount === undefined) return base.trim();
  return withAmount(base, amount, options);
}

export interface QrRenderResult {
  ok: boolean;
  payload: string | null;
  svg: string | null;
  errorCode: string | null;
}

/**
 * Render the provider QR as an inline SVG string via the vendored encoder.
 * Dark-on-white always (a QR must stay scannable; dark mode never inverts it).
 */
export function renderQrSvg(
  payload: string | null | undefined,
  options: { ariaLabel?: string; size?: number; margin?: number; dark?: string; light?: string } = {},
): QrRenderResult {
  const text = (payload ?? "").trim();
  if (!text) return { ok: false, payload: null, svg: null, errorCode: "EMPTY_PAYLOAD" };
  try {
    const matrix = encode(text);
    const svg = toSvg(matrix, {
      margin: options.margin ?? 4,
      scale: 1,
      dark: options.dark ?? "#0b0b0b",
      light: options.light ?? "#ffffff",
      ariaLabel: options.ariaLabel,
    });
    return { ok: true, payload: text, svg, errorCode: null };
  } catch (error) {
    return {
      ok: false,
      payload: text,
      svg: null,
      errorCode: DeshiQrError.is(error) ? error.code : "ENCODE_FAILED",
    };
  }
}

/** Render the amount-specific QR (or the static one for "any amount"). */
export function renderAmountQr(
  base: string | null | undefined,
  amount: number | null,
  options: { ariaLabel?: string; size?: number } = {},
): QrRenderResult {
  if (!base) return { ok: false, payload: null, svg: null, errorCode: "EMPTY_PAYLOAD" };
  if (amount === null) return renderQrSvg(base, options);
  try {
    const payload = deriveAmountPayload(base, amount);
    return renderQrSvg(payload, options);
  } catch (error) {
    return {
      ok: false,
      payload: null,
      svg: null,
      errorCode: DeshiQrError.is(error) ? error.code : "DERIVE_FAILED",
    };
  }
}

/** The `image_only` outcome for an uploaded screenshot we could not decode. */
export function imageOnlyClassification(): Classification {
  return { ...EMPTY, status: "image_only", errorCode: "NOT_DECODED" };
}

/** Human label for the decode status (i18n keys resolved by the UI). */
export const QR_STATUS_I18N: Record<PaymentQrStatus, string> = {
  verified: "creator.qr.status.verified",
  unverified: "creator.qr.status.unverified",
  image_only: "creator.qr.status.imageOnly",
  none: "creator.qr.status.manual",
};

/** Label for a method's decode badge; bank rows say "bank account". */
export function decodeStatusLabelKey(status: PaymentQrStatus, kind: PaymentKind): string {
  if (kind === "bank" && status === "none") return "creator.qr.status.bank";
  if (status === "none") return "creator.qr.status.manual";
  return QR_STATUS_I18N[status];
}

export function decodeStatusHelperKey(status: PaymentQrStatus): string {
  if (status === "verified") return "creator.qr.helper.verified";
  if (status === "unverified") return "creator.qr.helper.unverified";
  if (status === "image_only") return "creator.qr.helper.imageOnly";
  return "creator.method.checkFirst";
}

/** Is this method's QR status a jade/verified surface? */
export function isVerifiedStatus(status: PaymentQrStatus): boolean {
  return status === "verified";
}

/** Format the decoded amount for the creator's review, e.g. `৳50`. */
export function describeDecodedAmount(amount: number | null): string | null {
  return amount === null ? null : formatTaka(amount);
}

export { formatTaka, maskAccount, decodeSafe, validate, verifyChecksum, institutionOf };
export type { QrDecodedSnapshot };
