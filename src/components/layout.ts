/**
 * App chrome: header, footer, dashboard shell, language/theme toggles, report
 * link and the demo-mode banner. Chrome is intentionally thin so dynamic routes
 * render instantly and only their data regions load.
 */
import { DESHIQR_URL } from "../lib/config.ts";
import { h, copyText, toast, announce } from "../lib/dom.ts";
import { formatDate } from "../lib/format.ts";
import { reportMailto } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import { cx } from "../lib/app.ts";
import type { Creator } from "../lib/types.ts";
import { icon, steamMark } from "./icons.ts";
import { avatar, badge, linkButton, statusPill } from "./ui.ts";
import type { ThemePreference } from "../lib/prefs.ts";

// ---- small toggles --------------------------------------------------------

export function languageToggle(ctx: AppContext): HTMLButtonElement {
  const next = ctx.lang === "bn" ? "en" : "bn";
  const label = next === "en" ? "English" : "বাংলা";
  const button = h("button", {
    class: "lang-toggle",
    attrs: {
      type: "button",
      "aria-label": `${ctx.t("lang.change")} — ${label}`,
      lang: next,
    },
    text: label,
  });
  button.addEventListener("click", () => {
    ctx.setLang(next);
    announce(ctx.tx(next, "lang.changed"));
    button.focus();
  });
  return button;
}

export function themeToggle(ctx: AppContext): HTMLButtonElement {
  const currentTheme = document.documentElement.dataset.theme;
  const button = h("button", {
    class: "icon-btn",
    attrs: { type: "button", "aria-label": ctx.t("theme.change"), title: ctx.t("theme.change") },
    html: icon(currentTheme === "dark" ? "moon" : currentTheme === "light" ? "sun" : "globe", 20),
  });
  const order: ThemePreference[] = ["system", "light", "dark"];
  const next = () => {
    const stored = (document.documentElement.dataset.theme ?? "system") as ThemePreference;
    const index = order.indexOf(stored === "light" || stored === "dark" ? stored : "system");
    const preference = order[(index + 1) % order.length] ?? "system";
    ctx.setTheme(preference);
    button.innerHTML = icon(preference === "dark" ? "moon" : preference === "light" ? "sun" : "globe", 20);
    announce(ctx.t("theme.change"));
  };
  button.addEventListener("click", next);
  return button;
}

// ---- header ---------------------------------------------------------------

export type HeaderVariant = "landing" | "supporter" | "dashboard" | "legal" | "onboarding";

export function renderHeader(
  ctx: AppContext,
  options: { variant: HeaderVariant; signedIn?: boolean; creator?: Creator | null; newClaims?: number },
): HTMLElement {
  const variant = options.variant;
  const brand = h(
    "a",
    {
      class: "brand",
      attrs: { href: ctx.href("/"), "data-link": true, "aria-label": ctx.t("app.brandHome") },
    },
    h("span", { class: "brand__mark", html: steamMark(24), attrs: { "aria-hidden": "true" } }),
    h("span", { class: "brand__word", text: ctx.lang === "bn" ? "চানাস্তা" : "Chanasta" }),
  );

  const nav = h("nav", { class: "header__nav", attrs: { "aria-label": ctx.t("nav.primary") } });
  if (variant === "landing") {
    nav.append(
      h("a", { class: "nav-link", attrs: { href: ctx.href("/legal/how-it-works"), "data-link": true }, text: ctx.t("nav.howItWorks") }),
      h("a", { class: "nav-link", attrs: { href: `${ctx.href("/")}#demo-pages`, "data-link": true }, text: ctx.t("nav.demoPages") }),
      ctx.isDemoMode
        ? h("a", { class: "nav-link", attrs: { href: ctx.href("/login"), "data-link": true }, text: ctx.t("nav.login") })
        : h("a", { class: "nav-link", attrs: { href: ctx.href("/login"), "data-link": true }, text: options.signedIn ? ctx.t("nav.dashboard") : ctx.t("nav.login") }),
    );
  }

  const actions = h("div", { class: "header__actions" });
  if (options.newClaims && options.newClaims > 0) {
    actions.appendChild(
      h(
        "a",
        { class: "claim-count", attrs: { href: ctx.href("/dashboard"), "data-link": true } },
        h("span", { class: "claim-count__dot", attrs: { "aria-hidden": "true" } }),
        h("span", { text: String(options.newClaims) }),
        h("span", { class: "sr-only", text: ctx.t("dashboard.newClaims", { count: options.newClaims }) }),
      ),
    );
  }
  actions.appendChild(languageToggle(ctx));
  actions.appendChild(themeToggle(ctx));

  if (variant === "landing") {
    actions.appendChild(
      linkButton({
        href: ctx.href(options.signedIn ? "/dashboard" : "/onboarding"),
        label: ctx.t("nav.create"),
        size: "sm",
      }),
    );
  }
  if (variant === "dashboard" && options.creator) {
    actions.appendChild(avatar(options.creator.avatar_emoji, "sm"));
  }

  return h(
    "header",
    { class: cx("app-header", `app-header--${variant}`) },
    h("div", { class: "app-header__inner" }, brand, nav, actions),
  );
}

// ---- footer ---------------------------------------------------------------

export type FooterVariant = "supporter" | "landing" | "dashboard";

export function reportLink(
  ctx: AppContext,
  input: { slug: string; creatorName: string; pageUrl: string; variant?: "link" | "button" },
): HTMLAnchorElement {
  const href = reportMailto({
    slug: input.slug,
    creatorName: input.creatorName,
    pageUrl: input.pageUrl,
    lang: ctx.lang,
  });
  return h(
    "a",
    {
      class: input.variant === "button" ? "btn btn--ghost btn--sm" : "footer__link",
      attrs: { href },
    },
    h("span", { class: "footer__link-icon", html: icon("mail", 14) }),
    ctx.t("report.label"),
    h("span", { class: "sr-only", text: ` ${ctx.t("report.sr")}` }),
  );
}

function footerLinkRow(ctx: AppContext, options: { report?: Node; includeLegal?: boolean }): HTMLElement {
  const list = h("ul", { class: "footer__links" });
  list.append(
    h("li", {}, h("a", { class: "footer__link", attrs: { href: ctx.href("/legal/how-it-works"), "data-link": true }, text: ctx.t("footer.howItWorks") })),
    h("li", {}, h("a", { class: "footer__link", attrs: { href: ctx.href("/legal/terms"), "data-link": true }, text: ctx.t("footer.terms") })),
    h("li", {}, h("a", { class: "footer__link", attrs: { href: ctx.href("/legal/privacy"), "data-link": true }, text: ctx.t("footer.privacy") })),
  );
  if (options.report) list.append(h("li", {}, options.report));
  return list;
}

export function disclosureFooterA(ctx: AppContext): HTMLElement {
  return h(
    "div",
    { class: "footer-strip", attrs: { role: "note" } },
    h("p", { class: "footer-strip__bn", text: ctx.tx("bn", "honesty.footer") }),
    h("p", { class: "footer-strip__en", text: ctx.tx("en", "honesty.footer"), attrs: { lang: "en" } }),
  );
}

export function renderFooter(
  ctx: AppContext,
  options: { variant: FooterVariant; creator?: Creator | null },
): HTMLElement {
  const variant = options.variant;
  const footer = h("footer", { class: cx("app-footer", `app-footer--${variant}`) });
  footer.appendChild(h("div", { class: "app-footer__inner" }));

  if (variant === "supporter" && options.creator) {
    const pageUrl = `${ctx.origin}${ctx.href(`/@${options.creator.slug}`)}`;
    const report = reportLink(ctx, {
      slug: options.creator.slug,
      creatorName: options.creator.display_name,
      pageUrl,
    });
    footer.firstElementChild?.append(
      disclosureFooterA(ctx),
      h(
        "p",
        { class: "footer__fees" },
        h("span", { class: "footer__fees-icon", html: icon("heart", 14) }),
        ctx.t("honesty.noFees"),
      ),
      footerLinkRow(ctx, { report }),
      ...(ctx.isDemoMode ? [h("p", { class: "footer__demo", text: ctx.t("demo.pageNote") })] : []),
      h(
        "div",
        { class: "footer__credit" },
        h(
          "a",
          {
            class: "footer__credit-link",
            attrs: { href: DESHIQR_URL, target: "_blank", rel: "noopener noreferrer", referrerpolicy: "no-referrer" },
          },
          "Powered by deshiQR",
          h("span", { class: "sr-only", text: ` — ${ctx.t("footer.creditSr")} ${ctx.t("a11y.newTab")}` }),
        ),
      ),
      h("p", { class: "footer__beta", text: `${ctx.t("app.name")} · ${ctx.t("footer.terms")} — ${ctx.t("legal.draft")}` }),
    );
  } else if (variant === "landing") {
    const pageUrl = `${ctx.origin}${ctx.href("/")}`;
    const report = reportLink(ctx, { slug: "home", creatorName: ctx.t("app.name"), pageUrl });
    footer.firstElementChild?.append(
      h(
        "div",
        { class: "footer-strip", attrs: { role: "note" } },
        h("p", { class: "footer-strip__bn", text: ctx.tx("bn", "honesty.landingFooter") }),
        h("p", { class: "footer-strip__en", text: ctx.tx("en", "honesty.landingFooter"), attrs: { lang: "en" } }),
      ),
      h(
        "p",
        { class: "footer__tos" },
        h("span", { text: ctx.lang === "bn" ? "চানাস্তা পেমেন্ট প্রসেসর নয় — " : "Chanasta is not a payment processor — " }),
        h("a", { class: "footer__link", attrs: { href: ctx.href("/legal/terms"), "data-link": true }, text: ctx.t("footer.terms") }),
        " / ",
        h("a", { class: "footer__link", attrs: { href: ctx.href("/legal/privacy"), "data-link": true }, text: ctx.t("footer.privacy") }),
      ),
      h(
        "p",
        { class: "footer__fees" },
        h("span", { class: "footer__fees-icon", html: icon("heart", 14) }),
        ctx.t("honesty.noFees"),
      ),
      footerLinkRow(ctx, { report }),
      h(
        "div",
        { class: "footer__credit" },
        h(
          "a",
          {
            class: "footer__credit-link",
            attrs: { href: DESHIQR_URL, target: "_blank", rel: "noopener noreferrer", referrerpolicy: "no-referrer" },
          },
          "Powered by deshiQR",
          h("span", { class: "sr-only", text: ` — ${ctx.t("footer.creditSr")} ${ctx.t("a11y.newTab")}` }),
        ),
      ),
      h("p", { class: "footer__beta", text: `beta · ${ctx.t("legal.draft")}` }),
    );
  } else {
    footer.firstElementChild?.append(
      h(
        "ul",
        { class: "footer__links footer__links--compact" },
        h("li", {}, h("a", { class: "footer__link", attrs: { href: ctx.href("/legal/terms"), "data-link": true }, text: ctx.t("footer.terms") })),
        h("li", {}, h("a", { class: "footer__link", attrs: { href: ctx.href("/legal/privacy"), "data-link": true }, text: ctx.t("footer.privacy") })),
        h("li", {}, h("a", { class: "footer__link", attrs: { href: ctx.href("/legal/how-it-works"), "data-link": true }, text: ctx.t("footer.howItWorks") })),
      ),
      h("p", { class: "footer__beta", text: ctx.t("dashboard.footer.version") }),
    );
  }
  return footer;
}

// ---- demo banner ----------------------------------------------------------

export function demoBanner(ctx: AppContext, textKey = "demo.modeBanner"): HTMLElement {
  return h(
    "div",
    { class: "demo-banner", attrs: { role: "note" } },
    h("span", { class: "demo-banner__icon", html: icon("info", 16), attrs: { "aria-hidden": "true" } }),
    h("p", { class: "demo-banner__text", text: ctx.t(textKey), attrs: { lang: ctx.lang } }),
    badge({ label: ctx.t("demo.badge"), variant: "demo" }),
  );
}

// ---- dashboard shell ------------------------------------------------------

export type DashboardSection = "inbox" | "profile" | "payments" | "settings";

export function renderDashboardShell(
  ctx: AppContext,
  options: {
    active: DashboardSection;
    creator: Creator | null;
    counts?: { unverified: number; all: number };
    content: Node;
    signedIn: boolean;
  },
): HTMLElement {
  const items: { section: DashboardSection; key: string; icon: Parameters<typeof icon>[0]; href: string }[] = [
    { section: "inbox", key: "nav.messages", icon: "message", href: "/dashboard" },
    { section: "profile", key: "nav.profile", icon: "user", href: "/dashboard/profile" },
    { section: "payments", key: "nav.payments", icon: "card", href: "/dashboard/payments" },
    { section: "settings", key: "nav.settings", icon: "settings", href: "/dashboard/settings" },
  ];

  const navList = items.map((item) => {
    const isActive = item.section === options.active;
    return h(
      "a",
      {
        class: cx("dash-nav__link", isActive && "dash-nav__link--active"),
        attrs: { href: ctx.href(item.href), "data-link": true, "aria-current": isActive ? "page" : null },
      },
      h("span", { class: "dash-nav__icon", html: icon(item.icon, 20) }),
      h("span", { class: "dash-nav__label", text: ctx.t(item.key) }),
      item.section === "inbox" && options.counts?.unverified
        ? h(
            "span",
            { class: "dash-nav__badge", attrs: { title: ctx.t("dashboard.newClaims", { count: options.counts.unverified }) } },
            String(options.counts.unverified),
            h("span", { class: "sr-only", text: ctx.t("dashboard.newClaims", { count: options.counts.unverified }) }),
          )
        : null,
    );
  });

  const brand = h(
    "a",
    { class: "brand", attrs: { href: ctx.href("/"), "data-link": true, "aria-label": ctx.t("app.brandHome") } },
    h("span", { class: "brand__mark", html: steamMark(22), attrs: { "aria-hidden": "true" } }),
    h("span", { class: "brand__word", text: ctx.lang === "bn" ? "চানাস্তা" : "Chanasta" }),
  );

  const sidebar = h(
    "aside",
    { class: "dash__sidebar" },
    h(
      "div",
      { class: "dash__brand-row" },
      brand,
      options.creator ? statusPill(ctx, options.creator.status) : null,
    ),
    h("nav", { class: "dash__nav", attrs: { "aria-label": ctx.t("nav.dashboardLabel") } }, h("ul", { class: "dash-nav" }, ...navList.map((link) => h("li", {}, link)))),
    h(
      "div",
      { class: "dash__side-foot" },
      options.creator
        ? h(
            "a",
            {
              class: "dash__view-page",
              attrs: { href: ctx.href(`/@${options.creator.slug}`), "data-link": true },
            },
            h("span", { html: icon("external", 16) }),
            ctx.t("dashboard.viewPage"),
          )
        : null,
      h("div", { class: "dash__side-toggles" }, languageToggle(ctx), themeToggle(ctx)),
      options.signedIn && !ctx.isDemoMode
        ? h("button", {
            class: "dash__logout",
            attrs: { type: "button" },
            text: ctx.t("nav.logout"),
            on: {
              click: () => {
                void ctx.data.signOut().then(() => {
                  ctx.navigate("/");
                });
              },
            },
          })
        : null,
    ),
  );

  const mobileHeader = h(
    "div",
    { class: "dash__mobile-header" },
    brand,
    h(
      "div",
      { class: "dash__mobile-actions" },
      options.creator ? statusPill(ctx, options.creator.status) : null,
      options.counts?.unverified
        ? h(
            "a",
            { class: "claim-count", attrs: { href: ctx.href("/dashboard"), "data-link": true } },
            h("span", { class: "claim-count__dot", attrs: { "aria-hidden": "true" } }),
            String(options.counts.unverified),
            h("span", { class: "sr-only", text: ctx.t("dashboard.newClaims", { count: options.counts.unverified }) }),
          )
        : null,
      options.creator ? avatar(options.creator.avatar_emoji, "sm") : null,
    ),
  );

  const mobileTabs = h(
    "nav",
    { class: "dash__tabs", attrs: { "aria-label": ctx.t("nav.dashboardLabel") } },
    ...items.map((item) => {
      const isActive = item.section === options.active;
      return h(
        "a",
        {
          class: cx("dash-tab", isActive && "dash-tab--active"),
          attrs: { href: ctx.href(item.href), "data-link": true, "aria-current": isActive ? "page" : null },
        },
        h("span", { html: icon(item.icon, 20) }),
        h("span", { text: ctx.t(item.key) }),
      );
    }),
  );

  return h(
    "div",
    { class: "dash" },
    sidebar,
    h("div", { class: "dash__main" }, mobileHeader, mobileTabs, options.content),
  );
}

/** Small "view page" + share action row used by dashboard headers. */
export function dashboardActions(
  ctx: AppContext,
  creator: Creator | null,
  handlers: { onShare: () => void },
): HTMLElement {
  const row = h("div", { class: "page-actions" });
  row.appendChild(
    h(
      "button",
      {
        class: "btn btn--secondary btn--sm",
        attrs: { type: "button" },
        on: { click: handlers.onShare },
      },
      h("span", { class: "btn__icon", html: icon("share", 18) }),
      h("span", { class: "btn__label", text: ctx.t("dashboard.share") }),
    ),
  );
  if (creator) {
    row.appendChild(
      linkButton({
        href: ctx.href(`/@${creator.slug}`),
        label: ctx.t("dashboard.viewPage"),
        variant: "ghost",
        size: "sm",
        icon: "external",
      }),
    );
  }
  return row;
}

/** Copy the page link (share kit quick action). */
export async function copyPageLink(ctx: AppContext, slug: string): Promise<void> {
  const url = `${ctx.origin}${ctx.href(`/@${slug}`)}`;
  const ok = await copyText(url);
  toast(ok ? ctx.t("common.linkCopied") : ctx.t("common.selectToCopy"));
}

/** Formatted "last updated" line for payment methods. */
export function lastUpdatedLine(ctx: AppContext, iso: string): HTMLElement {
  const [before, after] = ctx.t("creator.method.lastUpdated", { date: "\u0000" }).split("\u0000");
  return h(
    "p",
    { class: "method__updated" },
    before ?? "",
    h("time", { attrs: { datetime: iso }, text: formatDate(ctx.lang, iso) }),
    after ?? "",
  );
}
