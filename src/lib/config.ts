/**
 * Runtime configuration.
 *
 * Two modes (architecture.md §1):
 *  - local demo (default): no env vars, no `window.CHANASTA_CONFIG`; synthetic
 *    demo data + `localStorage` pages. No backend, no auth.
 *  - Supabase: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (build time) or
 *    `window.CHANASTA_CONFIG = { supabaseUrl, supabaseAnonKey }` (runtime).
 *
 * The anon key is the only key that may ever ship in the client.
 */
import type { Lang } from "./types.ts";

export type AppMode = "local" | "supabase";

export interface AppConfig {
  mode: AppMode;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  /** `import.meta.env.BASE_URL`, normalised to end with "/". */
  baseUrl: string;
}

export interface RuntimeConfigShape {
  supabaseUrl?: unknown;
  supabaseAnonKey?: unknown;
  supabase_url?: unknown;
  supabase_anon_key?: unknown;
}

export interface EnvLike {
  VITE_SUPABASE_URL?: string | undefined;
  VITE_SUPABASE_ANON_KEY?: string | undefined;
  BASE_URL?: string | undefined;
}

export const STORAGE_KEYS = {
  lang: "chanasta.lang",
  theme: "chanasta.theme",
  creators: "chanasta.local.creators",
  methods: "chanasta.local.methods",
  claims: "chanasta.local.claims",
  owner: "chanasta.local.owner",
  amount: "chanasta.amount",
  claimContext: "chanasta.claim",
} as const;

export const DEFAULT_LANG: Lang = "bn";

export const REPORT_EMAIL = "hello2himel@proton.me";
export const DESHIQR_URL = "https://github.com/hello2himel/deshiQR";
export const SITE_NAME = "Chanasta";

function cleanUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed.length === 0) return null;
  try {
    const url = new URL(trimmed);
    // Only https (or localhost for dev) is a sane Supabase endpoint.
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

function readRuntimeShape(runtime: unknown): { url: string | null; key: string | null } {
  if (!runtime || typeof runtime !== "object") return { url: null, key: null };
  const shape = runtime as RuntimeConfigShape;
  const url = cleanUrl(
    (shape.supabaseUrl ?? shape.supabase_url) as string | undefined,
  );
  const rawKey = shape.supabaseAnonKey ?? shape.supabase_anon_key;
  const key = typeof rawKey === "string" && rawKey.trim().length > 0 ? rawKey.trim() : null;
  return { url, key };
}

/**
 * Decide the mode. Both values must be present; a half-configured environment
 * stays in local demo mode instead of failing at runtime.
 */
export function resolveConfig(env: EnvLike | null | undefined, runtime?: unknown): AppConfig {
  const envUrl = cleanUrl(env?.VITE_SUPABASE_URL);
  const envKey =
    typeof env?.VITE_SUPABASE_ANON_KEY === "string" && env.VITE_SUPABASE_ANON_KEY.trim().length > 0
      ? env.VITE_SUPABASE_ANON_KEY.trim()
      : null;

  const runtimeShape = readRuntimeShape(runtime);
  const supabaseUrl = envUrl ?? runtimeShape.url;
  const supabaseAnonKey = envKey ?? runtimeShape.key;

  const mode: AppMode = supabaseUrl && supabaseAnonKey ? "supabase" : "local";

  return {
    mode,
    supabaseUrl: mode === "supabase" ? supabaseUrl : null,
    supabaseAnonKey: mode === "supabase" ? supabaseAnonKey : null,
    baseUrl: normalizeBaseUrl(env?.BASE_URL),
  };
}

export function normalizeBaseUrl(value: string | undefined): string {
  if (!value || value === "/" || value === "./") return "/";
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

/**
 * Browser entry point. Kept separate from `resolveConfig` so the pure logic is
 * testable in Node (where `import.meta.env` and `window` do not exist).
 */
export function readConfig(): AppConfig {
  const env = ((import.meta as unknown as { env?: EnvLike }).env ?? {}) as EnvLike;
  const runtime =
    typeof window !== "undefined"
      ? (window as unknown as { CHANASTA_CONFIG?: unknown }).CHANASTA_CONFIG
      : undefined;
  return resolveConfig(env, runtime);
}

/** Human host for display, e.g. `localhost:5180` or `chanasta.example`. */
export function displayHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}
