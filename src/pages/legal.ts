/**
 * Legal pages. Every one carries the visible draft-review banner (Lead decision
 * 12): the entity is not formed and counsel has not signed off. Copy is plain
 * language, no invented legal claims, no fake jurisdiction promise.
 */
import { h } from "../lib/dom.ts";
import { formatDate } from "../lib/format.ts";
import type { AppContext } from "../lib/app.ts";
import type { LegalPage } from "../lib/router.ts";
import { icon } from "../components/icons.ts";
import { linkButton } from "../components/ui.ts";

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
    { class: "money-path" },
    h(
      "div",
      { class: "money-path__row" },
      h("div", { class: "money-path__box" }, h("span", { class: "money-path__label", text: ctx.t("legal.hiw.path.you") })),
      h("span", { class: "money-path__arrow", html: icon("arrowRight", 24) }),
      h("div", { class: "money-path__box" }, h("span", { class: "money-path__label", text: ctx.t("legal.hiw.path.provider") })),
      h("span", { class: "money-path__arrow", html: icon("arrowRight", 24) }),
      h("div", { class: "money-path__box" }, h("span", { class: "money-path__label", text: ctx.t("legal.hiw.path.creator") })),
    ),
    h(
      "div",
      { class: "money-path__outside" },
      h("span", { class: "money-path__dash", attrs: { "aria-hidden": "true" } }),
      h("span", { class: "money-path__label", text: ctx.t("legal.hiw.path.chanasta") }),
    ),
    h("figcaption", { class: "money-path__caption", text: ctx.t("legal.hiw.path.note") }),
  );
}

export function renderLegal(ctx: AppContext, page: LegalPage): HTMLElement {
  const config = SECTIONS[page];
  const lastUpdated = formatDate(ctx.lang, LEGAL_UPDATED);
  const toc = h(
    "nav",
    { class: "legal__toc", attrs: { "aria-label": ctx.t("legal.toc") } },
    h("p", { class: "legal__toc-title", text: ctx.t("legal.toc") }),
    h(
      "ul",
      { class: "legal__toc-list" },
      ...config.sections.map((section) =>
        h("li", {}, h("a", { attrs: { href: `#${section.id}` }, text: ctx.t(section.titleKey) })),
      ),
    ),
  );

  const article = h("article", { class: "legal" },
    h(
      "header",
      { class: "legal__header" },
      h("h1", { class: "legal__title", text: ctx.t(config.titleKey) }),
      h("p", { class: "legal__updated", text: ctx.t("legal.lastUpdated", { date: lastUpdated }) }),
      h(
        "div",
        { class: "draft-banner", attrs: { role: "note" } },
        h("span", { class: "draft-banner__icon", html: icon("info", 16) }),
        h("span", { class: "draft-banner__text", text: ctx.t("legal.draft") }),
      ),
    ),
    page === "how-it-works" ? moneyPath(ctx) : null,
    ...config.sections.map((section) =>
      h(
        "section",
        { class: "legal__section", attrs: { "aria-labelledby": `legal-${section.id}` } },
        h("h2", { class: "legal__h2", id: `legal-${section.id}`, text: ctx.t(section.titleKey) }),
        h("p", { class: "legal__body", text: ctx.t(section.bodyKey) }),
      ),
    ),
    page === "how-it-works"
      ? h(
          "section",
          { class: "legal__section legal__section--safety", attrs: { "aria-labelledby": "legal-safety" } },
          h("h2", { class: "legal__h2", id: "legal-safety", text: ctx.t("legal.hiw.safety.title") }),
          h("p", { class: "legal__body", text: ctx.t("legal.hiw.safety.body") }),
        )
      : null,
    h(
      "footer",
      { class: "legal__footer" },
      h("p", { class: "legal__links" },
        h("a", { class: "link", attrs: { href: ctx.href("/legal/terms"), "data-link": true }, text: ctx.t("footer.terms") }),
        " · ",
        h("a", { class: "link", attrs: { href: ctx.href("/legal/privacy"), "data-link": true }, text: ctx.t("footer.privacy") }),
        " · ",
        h("a", { class: "link", attrs: { href: ctx.href("/legal/how-it-works"), "data-link": true }, text: ctx.t("footer.howItWorks") }),
      ),
      linkButton({ href: ctx.href("/"), label: ctx.t("legal.backHome"), variant: "secondary", size: "sm", icon: "arrowLeft" }),
    ),
  );

  return h("div", { class: "legal-layout" }, toc, article);
}
