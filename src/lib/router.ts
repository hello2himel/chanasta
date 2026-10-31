/**
 * Tiny hand-written router.
 *
 * Base-path aware (`import.meta.env.BASE_URL`, e.g. `/chanasta/` on GitHub
 * Pages) with hash fallbacks for static hosts that cannot rewrite deep links:
 *
 *   /chanasta/@demo-teacher        (canonical, path route)
 *   /chanasta/#/@demo-teacher      (hash fallback)
 *   /chanasta/?c=demo-teacher      (query fallback for old share links)
 *
 * Pure functions only — no `window`, no DOM — so the routing table is covered
 * by `node:test`.
 */
import { isSlugShapeValid } from "./validate.ts";
import type { Lang } from "./types.ts";

export type DashboardSection = "inbox" | "profile" | "payments" | "settings";
export type LegalPage = "terms" | "privacy" | "how-it-works";

export type Route =
  | { name: "home" }
  | { name: "creator"; slug: string }
  | { name: "thanks"; slug: string }
  | { name: "embed"; slug: string }
  | { name: "onboarding" }
  | { name: "login" }
  | { name: "dashboard"; section: DashboardSection }
  | { name: "legal"; page: LegalPage }
  | { name: "notFound" };

export interface RouteInput {
  pathname: string;
  search?: string;
  hash?: string;
  base?: string;
}

export interface LinkParams {
  lang?: Lang | null;
  theme?: "light" | "dark" | null;
  next?: string | null;
  claimFilter?: string | null;
}

/** "/chanasta/" -> "/chanasta"; "/" -> "". */
export function basePrefix(base: string | undefined): string {
  const value = (base ?? "/").trim();
  if (value === "" || value === "/") return "";
  return ("/" + value.replace(/^\/+/, "").replace(/\/+$/, "")).replace(/\/$/, "");
}

/** Strip the deployment base from a pathname. Returns a path that starts with "/". */
export function stripBase(pathname: string, base: string | undefined): string {
  const prefix = basePrefix(base);
  if (!prefix) return ensureLeadingSlash(pathname);
  if (pathname === prefix) return "/";
  if (pathname.startsWith(prefix + "/")) {
    const rest = pathname.slice(prefix.length);
    return ensureLeadingSlash(rest);
  }
  // Some hosts 404 the base itself without the trailing slash; treat it as root.
  if (pathname === prefix + "/") return "/";
  return ensureLeadingSlash(pathname);
}

function ensureLeadingSlash(value: string): string {
  const path = value.startsWith("/") ? value : `/${value}`;
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
}

/** Remove the query/hash and collapse the doubled slashes a static host may add. */
function normalizePath(value: string): string {
  const withoutQuery = value.split("?")[0]?.split("#")[0] ?? "";
  const joined = withoutQuery.replace(/\/{2,}/g, "/");
  return ensureLeadingSlash(joined);
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function validSlug(slug: string): string | null {
  const value = decodeSegment(slug);
  return isSlugShapeValid(value) ? value : null;
}

/** Parse a normalised app path like `/@demo-teacher/thanks` into a route. */
export function parsePath(pathname: string): Route {
  const path = normalizePath(pathname);
  if (path === "/") return { name: "home" };
  if (path === "/onboarding") return { name: "onboarding" };
  if (path === "/login") return { name: "login" };
  if (path === "/dashboard") return { name: "dashboard", section: "inbox" };
  if (path === "/dashboard/profile") return { name: "dashboard", section: "profile" };
  if (path === "/dashboard/payments") return { name: "dashboard", section: "payments" };
  if (path === "/dashboard/settings") return { name: "dashboard", section: "settings" };

  if (path.startsWith("/legal/")) {
    const page = path.slice("/legal/".length);
    if (page === "terms" || page === "privacy" || page === "how-it-works") {
      return { name: "legal", page };
    }
    return { name: "notFound" };
  }

  if (path.startsWith("/embed/")) {
    const rest = path.slice("/embed/".length);
    const slug = validSlug(rest.startsWith("@") ? rest.slice(1) : rest);
    return slug ? { name: "embed", slug } : { name: "notFound" };
  }

  if (path.startsWith("/@")) {
    const rest = path.slice(2);
    if (rest.endsWith("/thanks")) {
      const slug = validSlug(rest.slice(0, -"/thanks".length));
      return slug ? { name: "thanks", slug } : { name: "notFound" };
    }
    if (rest.includes("/")) return { name: "notFound" };
    const slug = validSlug(rest);
    return slug ? { name: "creator", slug } : { name: "notFound" };
  }

  return { name: "notFound" };
}

export interface RouteParams {
  lang: Lang | null;
  theme: "light" | "dark" | null;
  /** Safe post-login destination (allowlist enforced). */
  next: string | null;
  /** `?c=slug` query fallback. */
  slugQuery: string | null;
  /** Dashboard claims filter (`?f=`). */
  claimFilter: string | null;
}

const ALLOWED_NEXT_PREFIXES = ["/onboarding", "/dashboard"];

/** Only allow same-app paths we know: prevents open-redirects via `?next=`. */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  const path = normalizePath(value);
  return ALLOWED_NEXT_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"))
    ? path
    : null;
}

function hashPath(hash: string | undefined): string | null {
  if (!hash) return null;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith("/")) return null;
  return raw;
}

export interface ParsedLocation {
  route: Route;
  params: RouteParams;
}

/**
 * Parse the current location. Path routes win; hash routes are used when the
 * path is the app root (the "static host without rewrites" case), and the
 * legacy `?c=` query is accepted as a last fallback.
 */
export function parseRoute(input: RouteInput): Route {
  const { route } = parseLocation(input);
  return route;
}

export function parseLocation(input: RouteInput): ParsedLocation {
  const search = input.search ?? "";
  const hash = input.hash ?? "";
  const params = parseParams(search, hash);

  const pathRoute = parsePath(stripBase(input.pathname ?? "/", input.base));
  const fromHash = hashPath(hash);

  let route = pathRoute;
  if (fromHash && (pathRoute.name === "home" || pathRoute.name === "notFound")) {
    const hashRoute = parsePath(fromHash);
    if (hashRoute.name !== "notFound") route = hashRoute;
  }

  if ((route.name === "home" || route.name === "notFound") && params.slugQuery) {
    const slug = validSlug(params.slugQuery);
    if (slug) route = { name: "creator", slug };
  }

  return { route, params };
}

export function parseParams(search: string, hash: string): RouteParams {
  let query = new URLSearchParams(search);
  // Allow `?lang=`/`?theme=` inside the hash for hash-routed links.
  const hashPathValue = hashPath(hash);
  if (hashPathValue && hashPathValue.includes("?")) {
    const q = hashPathValue.slice(hashPathValue.indexOf("?") + 1);
    query = new URLSearchParams([...new URLSearchParams(q).entries(), ...query.entries()]);
  }

  const lang = query.get("lang");
  const theme = query.get("theme");
  const next = query.get("next");
  const c = query.get("c");
  const f = query.get("f");

  return {
    lang: lang === "en" || lang === "bn" ? lang : null,
    theme: theme === "dark" || theme === "light" ? theme : null,
    next: safeNext(next),
    slugQuery: c && isSlugShapeValid(c) ? c : null,
    claimFilter: f && ["all", "unverified", "confirmed", "hidden"].includes(f) ? f : null,
  };
}

/** Path for a route, without the deployment base. */
export function routePath(route: Route): string {
  switch (route.name) {
    case "home":
      return "/";
    case "creator":
      return `/@${route.slug}`;
    case "thanks":
      return `/@${route.slug}/thanks`;
    case "embed":
      return `/embed/@${route.slug}`;
    case "onboarding":
      return "/onboarding";
    case "login":
      return "/login";
    case "dashboard":
      return route.section === "inbox" ? "/dashboard" : `/dashboard/${route.section}`;
    case "legal":
      return `/legal/${route.page}`;
    case "notFound":
      return "/";
  }
}

/** Prefix a path with the deployment base (`/chanasta`), keeping `#`/`?` intact. */
export function href(path: string, base: string | undefined = "/"): string {
  const prefix = basePrefix(base);
  if (!path.startsWith("/")) return path;
  if (!prefix) return path;
  return path === "/" ? `${prefix}/` : `${prefix}${path}`;
}

/** Absolute URL for share links / embed snippets / report mailto (base-aware). */
export function absoluteUrl(path: string, origin: string, base: string | undefined = "/"): string {
  return `${origin.replace(/\/+$/, "")}${href(path, base)}`;
}

/** Append query params to an href, skipping null/empty values. */
export function withQuery(url: string, params: Record<string, string | null | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]));
  if (entries.length === 0) return url;
  const [pathPart, hashPart] = url.split("#");
  const separator = (pathPart ?? "").includes("?") ? "&" : "?";
  const query = entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
  const result = `${pathPart}${separator}${query}`;
  return hashPart ? `${result}#${hashPart}` : result;
}

/** Human route name for the document title. */
export function routeTitleKey(route: Route): string {
  switch (route.name) {
    case "home":
      return "meta.title.home";
    case "creator":
    case "thanks":
      return "meta.title.creator";
    case "embed":
      return "meta.title.embed";
    case "onboarding":
      return "meta.title.onboarding";
    case "login":
      return "meta.title.login";
    case "dashboard":
      return route.section === "inbox"
        ? "meta.title.dashboard"
        : `meta.title.dashboard.${route.section}`;
    case "legal":
      return `meta.title.legal.${route.page}`;
    case "notFound":
      return "meta.title.notFound";
  }
}
