/**
 * Legal pages in the coffee/ledger language. Every page carries the visible
 * draft-review banner (Lead decision 12) — no invented entity, no jurisdiction
 * promise. Section copy stays in `src/lib/i18n.ts` (Lead-owned); only the chrome
 * is re-themed here.
 */
import { h } from "../lib/dom.ts";
import { formatDate } from "../lib/format.ts";
import type { AppContext } from "../lib/app.ts";
import type { LegalPage } from "../lib/router.ts";
import { appButton, appLink } from "../components/app/ui.ts";

/**
 * Legal chrome stays static-imported by the router for every route, so it must
 * not pull the (larger) creator-app copy bank into the landing/supporter bundle.
 * These are the only two strings it needs beyond shared i18n keys; the mandated
 * draft banner is shown in both languages.
 */
const DRAFT_BN = "খসড়া — আইনি পর্যালোচনার অপেক্ষায়";
const DRAFT_EN = "Draft — pending legal review";
const DRAFT_NOTE_BN = "এই লেখা এখনো খসড়া। আইনি পর্যালোচনার আগে এটিকে চূড়ান্ত শর্ত হিসেবে ধরবেন না।";
const DRAFT_NOTE_EN = "This text is still a draft. Don't treat it as final terms before legal review.";

const LEGAL_UPDATED = "2026-11-01";

interface LegalSection {
  id: string;
  titleKey: string;
  bodyKey: string;
}

const SECTIONS: Record<LegalPage, { titleKey: string; sections: LegalSection[] }> = {
  "how-it-works": {
    titleKey: "legal.hiw.title",
    sections: [
      { id: "what", titleKey: "legal.hiw.what.title", bodyKey: "legal.hiw.what.body" },
      { id: "not", titleKey: "legal.hiw.not.title", bodyKey: "legal.hiw.not.body" },
      { id: "verified", titleKey: "legal.hiw.verified.title", bodyKey: "legal.hiw.verified.body" },
      { id: "check", titleKey: "legal.hiw.check.title", bodyKey: "legal.hiw.check.body" },
    ],
  },
  terms: {
    titleKey: "legal.terms.title",
    sections: [
      { id: "service", titleKey: "legal.terms.s1.title", bodyKey: "legal.terms.s1.body" },
      { id: "no-custody", titleKey: "legal.terms.s2.title", bodyKey: "legal.terms.s2.body" },
      { id: "creator", titleKey: "legal.terms.s3.title", bodyKey: "legal.terms.s3.body" },
      { id: "supporter", titleKey: "legal.terms.s4.title", bodyKey: "legal.terms.s4.body" },
      { id: "moderation", titleKey: "legal.terms.s5.title", bodyKey: "legal.terms.s5.body" },
      { id: "other", titleKey: "legal.terms.s6.title", bodyKey: "legal.terms.s6.body" },
      { id: "changes", titleKey: "legal.terms.s7.title", bodyKey: "legal.terms.s7.body" },
    ],
  },
  privacy: {
    titleKey: "legal.privacy.title",
    sections: [
      { id: "store", titleKey: "legal.privacy.s1.title", bodyKey: "legal.privacy.s1.body" },
      { id: "public", titleKey: "legal.privacy.s2.title", bodyKey: "legal.privacy.s2.body" },
      { id: "cookies", titleKey: "legal.privacy.s3.title", bodyKey: "legal.privacy.s3.body" },
      { id: "processors", titleKey: "legal.privacy.s4.title", bodyKey: "legal.privacy.s4.body" },
      { id: "retention", titleKey: "legal.privacy.s5.title", bodyKey: "legal.privacy.s5.body" },
      { id: "rights", titleKey: "legal.privacy.s6.title", bodyKey: "legal.privacy.s6.body" },
      { id: "security", titleKey: "legal.privacy.s7.title", bodyKey: "legal.privacy.s7.body" },
    ],
  },
};

function moneyPath(ctx: AppContext): HTMLElement {
  return h(
    "figure",
    { class: "app-money-path" },
    h(
      "div",
      { class: "app-money-path__row" },
      h("span", { class: "app-money-path__box", text: ctx.t("legal.hiw.path.you") }),
      h("span", { class: "app-money-path__arrow", html: '<i class="ri-arrow-right-line ri" aria-hidden="true"></i>' }),
      h("span", { class: "app-money-path__box", text: ctx.t("legal.hiw.path.provider") }),
      h("span", { class: "app-money-path__arrow", html: '<i class="ri-arrow-right-line ri" aria-hidden="true"></i>' }),
      h("span", { class: "app-money-path__box", text: ctx.t("legal.hiw.path.creator") }),
    ),
    h(
      "div",
      { class: "app-money-path__outside" },
      h("span", { class: "app-money-path__dash", attrs: { "aria-hidden": "true" } }),
      h("span", { text: ctx.t("legal.hiw.path.chanasta") }),
    ),
    h("figcaption", { class: "app-field__helper", text: ctx.t("legal.hiw.path.note") }),
  );
}

export function renderLegal(ctx: AppContext, page: LegalPage): HTMLElement {
  const isBn = ctx.lang === "bn";
  const draftLabel = isBn ? DRAFT_BN : DRAFT_EN;
  const draftSibling = isBn ? DRAFT_EN : DRAFT_BN;
  const draftNote = isBn ? DRAFT_NOTE_BN : DRAFT_NOTE_EN;
  const config = SECTIONS[page];
  const lastUpdated = formatDate(ctx.lang, LEGAL_UPDATED);

  const toc = h(
    "nav",
    { class: "app-legal__toc", attrs: { "aria-label": ctx.t("legal.toc") } },
    h("p", { class: "app-eyebrow", text: ctx.t("legal.toc") }),
    h(
      "ul",
      { class: "app-legal__toc-list" },
      ...config.sections.map((section) =>
        h("li", {}, h("a", { attrs: { href: `#${section.id}` }, text: ctx.t(section.titleKey) })),
      ),
    ),
  );

  const article = h(
    "article",
    { class: "app-legal" },
    h(
      "header",
      { class: "app-legal__header" },
      h("p", { class: "app-eyebrow", text: ctx.t("app.name") }),
      h("h1", { class: "app-legal__title", text: ctx.t(config.titleKey) }),
      h("p", { class: "app-field__helper", text: ctx.t("legal.lastUpdated", { date: lastUpdated }) }),
      h(
        "div",
        { class: "app-legal__draft", attrs: { role: "note" } },
        h("span", { class: "app-legal__draft-badge", text: draftLabel }),
        h(
          "p",
          { class: "app-field__helper", attrs: { lang: isBn ? "en" : "bn" } },
          draftSibling,
        ),
        h("p", { class: "app-field__helper", text: draftNote }),
      ),
    ),
    page === "how-it-works" ? moneyPath(ctx) : null,
    ...config.sections.map((section) =>
      h(
        "section",
        { class: "app-legal__section", attrs: { "aria-labelledby": `legal-${section.id}` } },
        h("h2", { class: "app-legal__h2", id: `legal-${section.id}`, text: ctx.t(section.titleKey) }),
        h("p", { class: "app-legal__body", text: ctx.t(section.bodyKey) }),
      ),
    ),
    page === "how-it-works"
      ? h(
          "section",
          { class: "app-legal__section app-legal__section--safety", attrs: { "aria-labelledby": "legal-safety" } },
          h("h2", { class: "app-legal__h2", id: "legal-safety", text: ctx.t("legal.hiw.safety.title") }),
          h("p", { class: "app-legal__body", text: ctx.t("legal.hiw.safety.body") }),
        )
      : null,
    h(
      "footer",
      { class: "app-legal__footer" },
      h(
        "p",
        { class: "app-legal__links" },
        appLink({ label: ctx.t("footer.terms"), href: ctx.href("/legal/terms"), variant: "ghost", size: "sm" }),
        appLink({ label: ctx.t("footer.privacy"), href: ctx.href("/legal/privacy"), variant: "ghost", size: "sm" }),
        appLink({ label: ctx.t("footer.howItWorks"), href: ctx.href("/legal/how-it-works"), variant: "ghost", size: "sm" }),
      ),
      appButton({ label: ctx.t("legal.backHome"), variant: "secondary", size: "sm", icon: "arrow-left-line", onClick: () => ctx.navigate("/") }),
    ),
  );

  return h("div", { class: "app-legal-layout" }, toc, article);
}
