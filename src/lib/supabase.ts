/**
 * Supabase adapter.
 *
 * `@supabase/supabase-js` is imported **dynamically**, and only when
 * `resolveConfig()` says Supabase mode is configured — demo mode never downloads
 * the client (architecture.md §7). Only the anon key is ever used.
 *
 * Public reads go through the `public_*` views; owner reads use the base tables
 * under RLS; writes use the documented RPCs. Raw errors are mapped to
 * `DataError` machine codes so the UI can show friendly bn/en copy.
 */
import type { SupabaseClient, Session as AuthSession, User } from "@supabase/supabase-js";
import type { AppConfig } from "./config.ts";
import { DataError } from "./errors.ts";
import { errorCodeFromMessage } from "./validate.ts";
import type { Lang } from "./types.ts";

export type Client = SupabaseClient;

let clientPromise: Promise<Client> | null = null;

/** Lazily create (once) the Supabase client. Never called in local demo mode. */
export function getClient(config: AppConfig): Promise<Client> {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return Promise.reject(new DataError("AUTH_REQUIRED", "Supabase is not configured."));
  }
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then((module) =>
      module.createClient(config.supabaseUrl as string, config.supabaseAnonKey as string, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }),
    );
  }
  return clientPromise;
}

interface SupabaseLikeError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

/** Map a Postgres/RPC/network error to our small, friendly error vocabulary. */
export function mapSupabaseError(error: unknown): DataError {
  if (error instanceof DataError) return error;
  if (!error || typeof error !== "object") return new DataError("UNKNOWN");
  const shape = error as SupabaseLikeError;
  const haystack = `${shape.message ?? ""} ${shape.details ?? ""} ${shape.hint ?? ""}`;
  if (/failed to fetch|networkerror|network request failed|fetch failed/i.test(haystack)) {
    return new DataError("OFFLINE");
  }
  const known = errorCodeFromMessage(haystack);
  if (known) return new DataError(known as DataError["code"], shape.message);
  if (/\bFORBIDDEN\b/i.test(haystack)) return new DataError("NOT_OWNER", shape.message);
  if (shape.code === "23505") {
    return new DataError(/slug/i.test(haystack) ? "SLUG_TAKEN" : "INVALID_INPUT", shape.message);
  }
  if (shape.code === "PGRST116") return new DataError("NOT_FOUND", shape.message);
  if (shape.code === "42501" || /permission denied|row-level security/i.test(haystack)) {
    return new DataError("NOT_OWNER", shape.message);
  }
  return new DataError("UNKNOWN", shape.message);
}

function normaliseLang(value: unknown): Lang {
  return value === "en" ? "en" : "bn";
}

/** A creator row from `creators` (owner) or `public_creators` (public view). */
export function mapCreatorRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    tagline: typeof row.tagline === "string" ? row.tagline : null,
    bio: typeof row.bio === "string" ? row.bio : null,
    avatar_emoji: typeof row.avatar_emoji === "string" ? row.avatar_emoji : "☕",
    socials: typeof row.socials === "object" && row.socials !== null ? row.socials : {},
    default_locale: normaliseLang(row.default_locale),
    verified: row.verified === true,
    is_demo: false,
  };
}

export interface SupabaseSession {
  client: Client;
  session: AuthSession | null;
  user: User | null;
}

export async function loadSession(client: Client): Promise<{ user: User | null; session: AuthSession | null }> {
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw mapSupabaseError(error);
    return { user: data.session?.user ?? null, session: data.session ?? null };
  } catch (error) {
    throw mapSupabaseError(error);
  }
}

/**
 * Auth state subscription. The callback runs once with the current session and
 * then on every change; returns an unsubscribe function that is safe to call
 * before the lazy client has loaded.
 */
export async function subscribeAuth(
  client: Client,
  callback: (user: User | null) => void,
): Promise<() => void> {
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

export async function sendMagicLink(client: Client, email: string, redirectTo: string): Promise<void> {
  try {
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw mapSupabaseError(error);
  } catch (error) {
    throw mapSupabaseError(error);
  }
}

export async function signOutClient(client: Client): Promise<void> {
  try {
    const { error } = await client.auth.signOut();
    if (error) throw mapSupabaseError(error);
  } catch (error) {
    throw mapSupabaseError(error);
  }
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
