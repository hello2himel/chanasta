/**
 * Friendly error messages. Raw SQL/RPC errors must never reach the screen:
 * every `DataError` maps to a calm Bangla/English sentence.
 */
import { isDataError } from "./errors.ts";
import type { AppContext } from "./app.ts";

const CODE_KEYS: Record<string, string> = {
  SLUG_TAKEN: "error.slugTaken",
  SLUG_RESERVED: "error.slugReserved",
  SLUG_INVALID: "error.slugInvalid",
  SLUG_RATE_LIMITED: "error.slugRateLimited",
  RATE_LIMITED: "error.rateLimited",
  CLAIM_TOO_LARGE: "error.claimTooLarge",
  NOT_PUBLISHED: "error.notPublished",
  PUBLISH_NEEDS_METHOD: "error.publishNeedsMethod",
  METHOD_LIMIT: "error.methodLimit",
  BAD_ORDER: "error.reorder",
  INVALID_TRANSITION: "error.invalidTransition",
  NOT_OWNER: "error.notOwner",
  NOT_FOUND: "error.notFound",
  INVALID_INPUT: "error.generic",
  AUTH_REQUIRED: "error.authRequired",
  AUTH_FAILED: "error.authFailed",
  OFFLINE: "error.offline",
  UNKNOWN: "error.generic",
};

export function messageForError(ctx: AppContext, error: unknown): string {
  if (isDataError(error) && error.code in CODE_KEYS) {
    return ctx.t(CODE_KEYS[error.code] as string);
  }
  if (error instanceof TypeError) return ctx.t("error.offline");
  return ctx.t("error.generic");
}

export function errorCodeOf(error: unknown): string | null {
  return isDataError(error) ? error.code : null;
}

export function isOfflineError(error: unknown): boolean {
  return isDataError(error) ? error.code === "OFFLINE" : error instanceof TypeError;
}
