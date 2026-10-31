/**
 * Landing — the argument, in order:
 *
 *   hero (receipt specimen) → the money path → demo pages → who it's for →
 *   honest limits → FAQ → closing CTA.
 *
 * There are no invented stats, no testimonials and no fake logos; the only
 * social proof is the clearly-stamped demo strip. The chrome (cup wordmark,
 * nav, language toggle, footer) lives in `components/layout.ts`.
 */
import { h, copyText, toast } from "../lib/dom.ts";
import { buildShareKit } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import { DEMO_CREATORS, demoMethodsFor } from "../lib/demo.ts";
import { icon } from "../components/icons.ts";
import { pubLink } from "../components/public/primitives.ts";
import { renderDemoStrip, renderLimits, renderWhoLedger } from "../components/public/ledger.ts";
import { renderMoneyPath } from "../components/public/money-path.ts";
import { lastUpdatedIso, renderReceiptSpecimen } from "../components/public/receipt.ts";
import { COPY, pick, pickList, receiptCopyFor } from "./copy.public.ts";

export async function renderHome(ctx: AppContext): Promise<HTMLElement> {
  // The landing specimen is always the synthetic demo teacher: a visitor who has
  // never heard of Chanasta should never see a real creator's page used as the
  // product sample. Storage/Supabase gets first say when the demo creator
  // exists there; otherwise the in-repo synthetic fixtures apply.
  const teacher = (await ctx.data.getCreator("demo-teacher").catch(() => null)) ?? DEMO_CREATORS[0];
  const fetchedMethods = await ctx.data.listPaymentMethods("demo-teacher").catch(() => []);
  const teacherMethods = fetchedMethods.length > 0 ? fetchedMethods : demoMethodsFor("demo-teacher");
  const kit = teacher
    ? buildShareKit({
        slug: teacher.slug,
        creatorName: teacher.display_name,
        origin: ctx.origin,
        base: ctx.base,
        lang: ctx.lang,
      })
    : null;

  const copy = COPY.landing;
  const t = pick(ctx.lang);
  const demoBadge = ctx.t("demo.badge");

  // ---- hero --------------------------------------------------------------
  const hero = h(
    "section",
    { class: "pub-hero", attrs: { "aria-labelledby": "pub-hero-title" } },
    h(
      "div",
      { class: "pub-hero__copy" },
      h(
        "p",
        { class: "pub-eyebrow" },
        h("span", { class: "pub-eyebrow__dot", attrs: { "aria-hidden": "true" } }),
        h("span", { text: t(copy.eyebrow) }),
      ),
      h(
        "h1",
        { class: "pub-hero__title", id: "pub-hero-title" },
        h("span", { text: `${t(copy.heroTitleA)} ` }),
        h("span", { class: "pub-hero__accent", text: t(copy.heroTitleAccent) }),
        t(copy.heroTitleB) ? h("span", { text: ` ${t(copy.heroTitleB)}` }) : null,
      ),
      h("p", { class: "pub-hero__sub", text: t(copy.heroSub) }),
      h("p", { class: "pub-hero__lead", text: t(copy.heroLead) }),
      h(
        "div",
        { class: "pub-hero__actions" },
        pubLink({ href: ctx.href("/onboarding"), label: t(copy.ctaPrimary), icon: "plus" }),
        pubLink({
          href: ctx.href("/@demo-teacher"),
          label: t(copy.ctaSecondary),
          variant: "secondary",
          iconTrailing: "arrowRight",
        }),
      ),
      h(
        "ul",
        { class: "pub-hero__trust" },
        ...pickList(ctx.lang, copy.trust).map((item) =>
          h(
            "li",
            { class: "pub-hero__trust-item" },
            h("span", { class: "pub-hero__trust-mark", html: icon("check", 16), attrs: { "aria-hidden": "true" } }),
            h("span", { text: item }),
          ),
        ),
      ),
      h("p", { class: "pub-hero__honesty", text: ctx.t("honesty.moneyPath") }),
    ),
    teacher
      ? h(
          "div",
          { class: "pub-hero__specimen" },
          renderReceiptSpecimen({
            ctx,
            creator: teacher,
            method: teacherMethods[0] ?? null,
            amount: 50,
            demo: teacher.is_demo === true,
            updatedIso: lastUpdatedIso(teacher, teacherMethods),
            copy: receiptCopyFor(ctx.lang),
            sampleClaim: {
              name: ctx.lang === "bn" ? "মিতু" : "Mitu",
              amount: 100,
              message:
                ctx.lang === "bn"
                  ? "অংকের ভয় কেটে গেছে। ধন্যবাদ!"
                  : "My fear of maths is gone. Thank you!",
              stamp: ctx.t("claim.badge.selfReported"),
            },
          }),
        )
      : null,
  );

  // ---- money path (full bleed) ------------------------------------------
  const moneyPath = renderMoneyPath({
    title: t(copy.moneyTitle),
    lead: t(copy.moneyLead),
    supporter: t(copy.pathSupporter),
    money: t(copy.pathMoney),
    creator: t(copy.pathCreator),
    bracket: t(copy.pathBracket),
    steps: [
      { title: t(copy.step1Title), body: t(copy.step1Body) },
      { title: t(copy.step2Title), body: t(copy.step2Body) },
      { title: t(copy.step3Title), body: t(copy.step3Body) },
    ],
  });

  // ---- demo strip -------------------------------------------------------
  const demoStrip = renderDemoStrip(ctx, DEMO_CREATORS, {
    title: t(copy.demoTitle),
    intro: t(copy.demoIntro),
    open: t(copy.demoOpen),
    demoBadge,
  });

  // ---- who it's for -----------------------------------------------------
  const who = renderWhoLedger(
    copy.whoRows.map((row) => ({ icon: row.icon, title: t(row.title), body: t(row.body) })),
    { title: t(copy.whoTitle), lead: t(copy.whoLead), id: "pub-who-title" },
  );

  const embedBlock = kit
    ? h(
        "details",
        { class: "pub-embed-code" },
        h(
          "summary",
          { class: "pub-embed-code__summary" },
          h("span", { class: "pub-embed-code__icon", html: icon("code", 18), attrs: { "aria-hidden": "true" } }),
          h(
            "span",
            { class: "pub-embed-code__heading" },
            h("strong", { text: t(copy.embedTitle) }),
            h("span", { text: t(copy.embedBody) }),
          ),
          h("span", { class: "pub-embed-code__chevron", html: icon("chevronDown", 18), attrs: { "aria-hidden": "true" } }),
        ),
        h(
          "div",
          { class: "pub-embed-code__body" },
          h("pre", { class: "pub-embed-code__pre" }, h("code", { text: kit.iframe })),
          h(
            "div",
            { class: "pub-embed-code__actions" },
            h(
              "button",
              {
                class: "btn btn--secondary btn--sm pub-btn pub-btn--secondary pub-btn--sm",
                attrs: { type: "button" },
                on: {
                  click: () => {
                    void copyText(kit.iframe).then((ok) => toast(ok ? ctx.t("common.copied") : ctx.t("common.selectToCopy")));
                  },
                },
              },
              h("span", { class: "pub-btn__icon", html: icon("copy", 18), attrs: { "aria-hidden": "true" } }),
              h("span", { class: "pub-btn__label", text: t(copy.embedCopy) }),
            ),
            pubLink({
              href: ctx.href("/embed/@demo-teacher"),
              label: t(copy.embedPreview),
              variant: "ghost",
              size: "sm",
              icon: "external",
              external: true,
            }),
          ),
        ),
      )
    : null;

  // ---- honest limits ----------------------------------------------------
  const limits = renderLimits({
    title: t(copy.limitsTitle),
    doTitle: t(copy.limitsDoTitle),
    doItems: pickList(ctx.lang, copy.limitsDo),
    dontTitle: t(copy.limitsDontTitle),
    dontItems: pickList(ctx.lang, copy.limitsDont),
    terms: ctx.t("honesty.providerTerms"),
  });

  // ---- FAQ --------------------------------------------------------------
  const faq = h(
    "section",
    { class: "pub-faq", attrs: { "aria-labelledby": "pub-faq-title" } },
    h(
      "header",
      { class: "pub-section-head" },
      h("h2", { class: "pub-section-head__title", id: "pub-faq-title", text: t(copy.faqTitle) }),
    ),
    h(
      "div",
      { class: "pub-faq__list" },
      ...copy.faqItems.map((item) =>
        h(
          "details",
          { class: "pub-faq__item" },
          h(
            "summary",
            { class: "pub-faq__question" },
            h("span", { class: "pub-faq__q", text: t(item.q) }),
            h("span", { class: "pub-faq__icon pub-faq__icon--plus", html: icon("plus", 18), attrs: { "aria-hidden": "true" } }),
            h("span", { class: "pub-faq__icon pub-faq__icon--minus", html: icon("x", 18), attrs: { "aria-hidden": "true" } }),
          ),
          h("p", { class: "pub-faq__answer", text: t(item.a) }),
        ),
      ),
    ),
  );

  // ---- closing CTA ------------------------------------------------------
  const closing = h(
    "section",
    { class: "pub-closing", attrs: { "aria-labelledby": "pub-closing-title" } },
    h(
      "div",
      { class: "pub-closing__inner" },
      h(
        "div",
        { class: "pub-closing__copy" },
        h("h2", { class: "pub-closing__title", id: "pub-closing-title", text: t(copy.closingTitle) }),
        h("p", { class: "pub-closing__lead", text: t(copy.closingLead) }),
      ),
      pubLink({ href: ctx.href("/onboarding"), label: t(copy.closingCta), iconTrailing: "arrowRight" }),
    ),
    h("p", { class: "pub-closing__note", text: ctx.t("honesty.moneyPath") }),
  );

  return h(
    "div",
    { class: "pub-page pub-landing" },
    hero,
    moneyPath,
    h("div", { class: "pub-landing__body" }, demoStrip, who, embedBlock, limits, faq),
    closing,
  );
}
