/**
 * Typed data errors.
 *
 * Components never render a raw database error: every failure crosses this
 * boundary as a short machine code which `i18n` maps to a friendly Bangla or
 * English message (architecture.md §6).
 */
export type DataErrorCode =
  | "SLUG_TAKEN"
  | "SLUG_RESERVED"
  | "SLUG_INVALID"
  | "SLUG_RATE_LIMITED"
  | "RATE_LIMITED"
  | "CLAIM_TOO_LARGE"
  | "NOT_PUBLISHED"
  | "PUBLISH_NEEDS_METHOD"
  | "METHOD_LIMIT"
  | "BAD_ORDER"
  | "INVALID_TRANSITION"
  | "NOT_OWNER"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "AUTH_REQUIRED"
  | "AUTH_FAILED"
  | "OFFLINE"
  | "UNKNOWN";

export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly field: string | undefined;

  constructor(code: DataErrorCode, message?: string, field?: string) {
    super(message ?? code);
    this.name = "DataError";
    this.code = code;
    this.field = field;
  }
}

export function isDataError(error: unknown): error is DataError {
  return error instanceof DataError;
}
