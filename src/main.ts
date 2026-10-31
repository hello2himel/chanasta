/**
 * App bootstrap: config → mode → router mount → shell → page.
 *
 * Supporter surfaces (landing, creator page, thanks, embed, legal, 404) are
 * imported statically; creator surfaces (onboarding, login, dashboard) are
 * dynamically imported so the public routes stay inside their JS budget. The
 * Supabase client and jsqr are only ever loaded lazily, in their own chunks.
 */
import "remixicon/fonts/remixicon.css";
import "./styles.css";
import { h, clear, focusElement, setCanonical, setDocumentTitle, setMetaDescription, setNoIndex } from "./lib/dom.ts";
import { normalizeBaseUrl, readConfig } from "./lib/config.ts";
import { initData } from "./lib/data.ts";
import { t, applyLang } from "./lib/i18n.ts";
import { getThemePreference, resolveLang, setStoredLang, setThemePreference, applyTheme } from "./lib/prefs.ts";
import { href as makeHref, parseLocation, routePath, routeTitleKey, stripBase } from "./lib/router.ts";
import type { AppContext } from "./lib/app.ts";
import type { Creator, Lang } from "./lib/types.ts";
import { renderHeader, renderFooter, demoBanner } from "./components/layout.ts";
import { renderHome } from "./pages/home.ts";
import { renderCreator } from "./pages/creator.ts";
import { renderThanks } from "./pages/thanks.ts";
import { renderEmbed } from "./pages/embed.ts";
import { renderLegal } from "./pages/legal.ts";
import { renderNotFound } from "./pages/not-found.ts";
import { icon } from "./components/icons.ts";
import { button } from "./components/ui.ts";

const config = readConfig();
const base = normalizeBaseUrl(config.baseUrl || "/");
const data = initData(config);
const root = document.getElementById("app");

let lang: Lang = "bn";
let signedIn = false;
let footerCreator: Creator | null = null;
let lastRouteKey = "";
let firstRender = true;

const ctx: AppContext = {
  lang,
  base,
  origin: window.location.origin,
  config,
  data,
  route: { name: "home" },
  params: { lang: null, theme: null, next: null, slugQuery: null, claimFilter: null },
  t: (key, vars) => t(ctx.lang, key, vars),
  tx: (language, key, vars) => t(language, key, vars),
  navigate: (path, options) => navigate(path, options),
  href: (path) => makeHref(path, base),
  setLang: (next) => setLang(next),
  setTheme: (preference) => setThemePreference(preference),
  refresh: () => {
    void render({ focus: false });
  },
  setMeta: (title, options) => applyMeta(title, options),
  get isDemoMode() {
    return config.mode === "local";
  },
  get isSignedIn() {
    return signedIn;
  },
  get footerCreator() {
    return footerCreator;
  },
  setFooterCreator: (creator) => {
    footerCreator = creator;
  },
};

function applyMeta(title: string, options?: { description?: string; noindex?: boolean; canonicalPath?: string }): void {
  setDocumentTitle(title);
  setMetaDescription(options?.description ?? t(ctx.lang, "app.description"));
  setNoIndex(options?.noindex === true);
  if (options?.noindex) {
    // A noindex page (404/suspended/thanks) must not advertise a canonical URL.
    document.querySelector('link[rel="canonical"]')?.remove();
  } else {
    setCanonical(`${ctx.origin}${makeHref(options?.canonicalPath ?? routePath(ctx.route), base)}`);
  }
}

function navigate(path: string, options: { replace?: boolean } = {}): void {
  const url = makeHref(path, base);
  if (options.replace) window.history.replaceState({}, "", url);
  else window.history.pushState({}, "", url);
  void render({ focus: true });
}

function setLang(next: Lang): void {
  lang = next;
  ctx.lang = next;
  setStoredLang(next);
  applyLang(next);
  const url = new URL(window.location.href);
  if (next === "bn") url.searchParams.delete("lang");
  else url.searchParams.set("lang", next);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  void render({ focus: false });
}

async function loadSession(): Promise<void> {
  if (config.mode === "supabase") {
    const session = await data.getSession().catch(() => null);
    signedIn = Boolean(session);
  } else {
    signedIn = true;
  }
}

function skipLink(): HTMLElement {
  return h("a", {
    class: "skip-link",
    attrs: { href: "#main" },
    text: t(ctx.lang, "a11y.skip"),
    on: {
      click: (event) => {
        event.preventDefault();
        focusElement(document.getElementById("main"));
      },
    },
  });
}

function errorCard(description: string, retry: () => void): HTMLElement {
  return h(
    "section",
    { class: "error-state", attrs: { role: "alert" } },
    h("span", { class: "error-state__icon", html: icon("warning", 32) }),
    h("h1", { class: "error-state__title", text: t(ctx.lang, "error.generic") }),
    h("p", { class: "error-state__body", text: description }),
    button({ label: t(ctx.lang, "common.retry"), variant: "primary", onClick: retry }),
  );
}

async function render(options: { focus?: boolean } = {}): Promise<void> {
  if (!root) return;
  const location = parseLocation({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    base,
  });
  const route = location.route;
  const params = location.params;
  ctx.route = route;
  ctx.params = params;
  footerCreator = null;
  document.body.classList.remove("is-embed", "is-dash", "is-onboarding");

  // Language: query wins, otherwise the stored preference (Bangla by default).
  lang = resolveLang(params.lang);
  ctx.lang = lang;
  applyLang(lang);

  // Theme: embedders may force it; otherwise the stored preference applies.
  if (params.theme) document.documentElement.dataset.theme = params.theme;
  else applyTheme(getThemePreference());

  await loadSession();

  // Creator surfaces require a session in Supabase mode.
  if (config.mode === "supabase" && !signedIn && (route.name === "dashboard" || route.name === "onboarding")) {
    navigate(`/login?next=${encodeURIComponent(routePath(route))}`, { replace: true });
    return;
  }

  applyMeta(t(lang, routeTitleKey(route)), {
    description: route.name === "home" ? t(lang, "meta.desc.home") : t(lang, "app.description"),
  });

  if (route.name === "embed") {
    document.body.classList.add("is-embed");
    const page = await renderEmbed(ctx).catch(() => renderNotFound(ctx));
    clear(root);
    root.appendChild(h("main", { class: "main main--embed", attrs: { id: "main" } }, page));
    document.documentElement.lang = lang;
    return;
  }

  const isDashboard = route.name === "dashboard";
  if (isDashboard) document.body.classList.add("is-dash");
  if (route.name === "onboarding") document.body.classList.add("is-onboarding");

  let content: HTMLElement;
  try {
    switch (route.name) {
      case "home":
        content = await renderHome(ctx);
        break;
      case "creator":
        content = await renderCreator(ctx);
        break;
      case "thanks":
        content = await renderThanks(ctx);
        break;
      case "legal":
        content = renderLegal(ctx, route.page);
        break;
      case "notFound":
        applyMeta(t(lang, "meta.title.notFound"), { noindex: true });
        content = renderNotFound(ctx);
        break;
      case "onboarding": {
        const module = await import("./pages/onboarding.ts");
        content = await module.renderOnboarding(ctx);
        break;
      }
      case "login": {
        const module = await import("./pages/login.ts");
        content = await module.renderLogin(ctx);
        break;
      }
      case "dashboard": {
        if (route.section === "profile") {
          const profileModule = await import("./pages/dashboard/profile.ts");
          content = await profileModule.renderDashboardProfile(ctx);
        } else if (route.section === "payments") {
          const paymentsModule = await import("./pages/dashboard/payments.ts");
          content = await paymentsModule.renderDashboardPayments(ctx);
        } else if (route.section === "settings") {
          const settingsModule = await import("./pages/dashboard/settings.ts");
          content = await settingsModule.renderDashboardSettings(ctx);
        } else {
          const inboxModule = await import("./pages/dashboard/inbox.ts");
          content = await inboxModule.renderDashboardInbox(ctx);
        }
        break;
      }
      default:
        content = renderNotFound(ctx);
    }
  } catch (error) {
    // Never surface raw errors; a calm retry card instead.
    if (typeof console !== "undefined") console.warn("Render failed", error instanceof Error ? error.message : "");
    content = errorCard(t(lang, "error.generic"), () => void render({ focus: true }));
  }

  const headerVariant =
    route.name === "dashboard"
      ? "dashboard"
      : route.name === "onboarding"
        ? "onboarding"
        : route.name === "legal"
          ? "legal"
          : route.name === "home"
            ? "landing"
            : "supporter";
  const header = renderHeader(ctx, { variant: headerVariant, signedIn });

  const footer =
    route.name === "dashboard"
      ? renderFooter(ctx, { variant: "dashboard" })
      : route.name === "home" || route.name === "legal" || route.name === "login" || route.name === "onboarding" || route.name === "notFound"
        ? renderFooter(ctx, { variant: "landing" })
        : renderFooter(ctx, { variant: "supporter", creator: ctx.footerCreator });

  clear(root);
  const fragment = document.createDocumentFragment();
  fragment.append(skipLink());
  if (config.mode === "local" && (route.name === "home" || route.name === "onboarding" || route.name === "dashboard")) {
    fragment.append(demoBanner(ctx));
  }
  fragment.append(header);
  fragment.append(
    h(
      "main",
      {
        class: isDashboard ? "main main--dash" : "main",
        attrs: { id: "main" },
      },
      content,
    ),
  );
  fragment.append(footer);
  root.append(fragment);

  const routeKey = typeof route === "object" ? `${route.name}:${"slug" in route ? route.slug : ""}:${"section" in route ? route.section : ""}:${"page" in route ? route.page : ""}` : "home";
  const changed = routeKey !== lastRouteKey;
  lastRouteKey = routeKey;
  if (!firstRender && options.focus && changed) {
    const heading = root.querySelector<HTMLElement>("h1");
    focusElement(heading);
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  firstRender = false;

  // Plain in-page anchors (e.g. `#demo-pages`) are not routes: scroll to them.
  const hash = window.location.hash;
  if (hash && !hash.startsWith("#/") && !hash.startsWith("#/@")) {
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target as Element | null;
  const anchor = target?.closest("a[data-link]") as HTMLAnchorElement | null;
  if (!anchor) return;
  if (anchor.target === "_blank") return;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  if (url.pathname === window.location.pathname && url.hash && !url.search) {
    // Same-page anchor: let the browser handle it (and keep the smooth scroll).
    return;
  }
  event.preventDefault();
  const path = `${stripBase(url.pathname, base)}${url.search}${url.hash}`;
  navigate(path);
});

window.addEventListener("popstate", () => void render({ focus: true }));

// Surface mode for CSS/debugging (never user data).
document.documentElement.dataset.mode = config.mode;

void render({ focus: false }).catch(() => {
  if (root) {
    clear(root);
    root.append(errorCard(t("bn", "error.generic"), () => window.location.reload()));
  }
});
