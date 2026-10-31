/**
 * Browser preference + session helpers (localStorage / sessionStorage).
 * Every accessor is defensive: private mode, disabled storage and corrupt JSON
 * all fall back to the default instead of throwing.
 */
import { STORAGE_KEYS, DEFAULT_LANG } from "./config.ts";
import type { ClaimStatus, Lang, PaymentKind } from "./types.ts";

export type ThemePreference = "system" | "light" | "dark";

function safeGet(storage: "localStorage" | "sessionStorage", key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window[storage].getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: "localStorage" | "sessionStorage", key: string, value: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window[storage].removeItem(key);
    else window[storage].setItem(key, value);
  } catch {
    /* ignore */
  }
}

// ---- language -------------------------------------------------------------

export function getStoredLang(): Lang {
  const value = safeGet("localStorage", STORAGE_KEYS.lang);
  return value === "en" || value === "bn" ? value : DEFAULT_LANG;
}

export function setStoredLang(lang: Lang): void {
  safeSet("localStorage", STORAGE_KEYS.lang, lang);
}

// ---- theme ----------------------------------------------------------------

export function getThemePreference(): ThemePreference {
  const value = safeGet("localStorage", STORAGE_KEYS.theme);
  return value === "light" || value === "dark" ? value : "system";
}

/** Apply the preference to `<html data-theme>`; "system" removes the attribute. */
export function applyTheme(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute("data-theme");
  else root.dataset.theme = preference;
}

export function setThemePreference(preference: ThemePreference): void {
  safeSet("localStorage", STORAGE_KEYS.theme, preference === "system" ? null : preference);
  applyTheme(preference);
}

// ---- selected amount (session only) --------------------------------------

export function getSelectedAmount(): number | null {
  const raw = safeGet("sessionStorage", STORAGE_KEYS.amount);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function setSelectedAmount(amount: number | null): void {
  safeSet("sessionStorage", STORAGE_KEYS.amount, amount === null ? null : String(amount));
}

// ---- claim context for the thanks page -----------------------------------

export interface ClaimContext {
  id: string;
  creatorSlug: string;
  creatorName: string;
  amount: number;
  methodKind: PaymentKind | null;
  supporterName: string | null;
  message: string | null;
  status: ClaimStatus;
  createdAt: string;
}

export function saveClaimContext(context: ClaimContext): void {
  try {
    safeSet("sessionStorage", STORAGE_KEYS.claimContext, JSON.stringify(context));
  } catch {
    /* ignore */
  }
}

export function readClaimContext(expectedSlug?: string): ClaimContext | null {
  const raw = safeGet("sessionStorage", STORAGE_KEYS.claimContext);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<ClaimContext>;
    if (typeof value.id !== "string" || typeof value.amount !== "number" || typeof value.creatorSlug !== "string") {
      return null;
    }
    if (expectedSlug && value.creatorSlug !== expectedSlug) return null;
    if (value.status !== "unverified") return null;
    return {
      id: value.id,
      creatorSlug: value.creatorSlug,
      creatorName: typeof value.creatorName === "string" ? value.creatorName : value.creatorSlug,
      amount: value.amount,
      methodKind: (value.methodKind as PaymentKind | null) ?? null,
      supporterName: typeof value.supporterName === "string" ? value.supporterName : null,
      message: typeof value.message === "string" ? value.message : null,
      status: "unverified",
      createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Query the app language (`?lang=`) or fall back to storage. */
export function resolveLang(queryLang: Lang | null | undefined): Lang {
  if (queryLang === "en" || queryLang === "bn") {
    setStoredLang(queryLang);
    return queryLang;
  }
  return getStoredLang();
}
