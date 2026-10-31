/**
 * Shared app context passed to every page render function.
 * Built once in `main.ts`; pages never touch `window.location` directly.
 */
import type { AppConfig } from "./config.ts";
import type { DataApi } from "./data.ts";
import type { Route, RouteParams } from "./router.ts";
import type { ThemePreference } from "./prefs.ts";
import type { Lang } from "./types.ts";

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface MetaOptions {
  description?: string;
  noindex?: boolean;
  /** Path (without base) used for the canonical link. */
  canonicalPath?: string;
}

export interface AppContext {
  lang: Lang;
  base: string;
  origin: string;
  config: AppConfig;
  data: DataApi;
  route: Route;
  params: RouteParams;
  /** Bound translator for the active language. */
  t: Translate;
  /** Translator for an explicit language (used for bilingual honesty strips). */
  tx: (lang: Lang, key: string, vars?: Record<string, string | number>) => string;
  /** Navigate inside the SPA (base-aware, pushes history). */
  navigate: (path: string, options?: { replace?: boolean }) => void;
  /** External/absolute URL helper with the deployment base applied. */
  href: (path: string) => string;
  setLang: (lang: Lang) => void;
  setTheme: (preference: ThemePreference) => void;
  refresh: () => void;
  setMeta: (title: string, options?: MetaOptions) => void;
  isDemoMode: boolean;
  /** True when a browser Supabase session exists (Supabase mode only). */
  isSignedIn: boolean;
  /** The creator whose page chrome (footer report link) is currently rendered. */
  footerCreator: import("./types.ts").Creator | null;
  setFooterCreator: (creator: import("./types.ts").Creator | null) => void;
}

/** Small helper: join class names, dropping falsy values. */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
