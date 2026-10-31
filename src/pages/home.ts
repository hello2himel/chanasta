/** Landing page: what Chanasta is, what it never does, and three working demos. */
import { h, copyText, toast } from "../lib/dom.ts";
import { buildShareKit } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import { DEMO_CREATORS, demoMethodsFor } from "../lib/demo.ts";
import { icon, steamMark } from "../components/icons.ts";
import { avatar, badge, button, disclosure, linkButton, sectionHeading } from "../components/ui.ts";
import { renderPreviewCard } from "../components/preview-card.ts";

export async function renderHome(ctx: AppContext): Promise<HTMLElement> {
  const creators = await ctx.data.listPublishedCreators().catch(() => DEMO_CREATORS);
  const teacher = creators.find((creator) => creator.slug === "demo-teacher") ?? DEMO_CREATORS[0];
  const teacherMethods = teacher ? await ctx.data.listPaymentMethods(teacher.slug).catch(() => []) : [];
  const kit = teacher
    ? buildShareKit({
        slug: teacher.slug,
        creatorName: teacher.display_name,
        origin: ctx.origin,
        base: ctx.base,
        lang: ctx.lang,
      })
    : null;

  const hero = h(
    "section",
    { class: "hero", attrs: { "aria-labelledby": "hero-title" } },
    h(
      "div",
      { class: "hero__copy" },
      h("p", { class: "hero__eyebrow" }, h("span", { class: "hero__steam", html: steamMark(18), attrs: { "aria-hidden": "true" } }), ctx.t("app.tagline")),
      h("h1", { class: "hero__title", id: "hero-title", text: ctx.t("app.tagline2") }),
      h("p", { class: "hero__lead", text: ctx.t("landing.hero.lead") }),
      h("p", { class: "hero__body", text: ctx.t("landing.hero.body") }),
      h(
        "div",
        { class: "hero__actions" },
        linkButton({
          href: ctx.href("/onboarding"),
          label: ctx.t("nav.create"),
          variant: "primary",
          icon: "plus",
        }),
        linkButton({
          href: ctx.href("/@demo-teacher"),
          label: ctx.t("landing.demoCta"),
          variant: "secondary",
          iconTrailing: "arrowRight",
        }),
      ),
      h("p", { class: "hero__honesty", text: ctx.t("honesty.moneyPath") }),
    ),
    teacher
      ? h(
          "div",
          { class: "hero__card" },
          renderPreviewCard(ctx, {
            creator: teacher,
            methods: teacherMethods,
            variant: "landing",
            pageHref: ctx.href(`/@${teacher.slug}`),
            amount: 20,
            demo: true,
          }),
        )
      : null,
  );

  const howItWorks = h(
    "section",
    { class: "section", attrs: { "aria-labelledby": "how-it-works-title" } },
    sectionHeading(ctx.t("landing.howItWorks"), "h2", "how-it-works-title"),
    h(
      "div",
      { class: "steps" },
      ...[
        { title: ctx.t("landing.step1") },
        { title: ctx.t("landing.step2") },
        { title: ctx.t("landing.step3") },
      ].map((step, index) =>
        h(
          "div",
          { class: "steps__item" },
          h("span", { class: "steps__number", text: String(index + 1), attrs: { "aria-hidden": "true" } }),
          h("p", { class: "steps__title", text: step.title }),
          index < 2 ? h("span", { class: "steps__arrow", html: icon("arrowRight", 20), attrs: { "aria-hidden": "true" } }) : null,
        ),
      ),
    ),
    h("p", { class: "steps__note", text: ctx.t("landing.notBetween") }),
    disclosure({ ctx, bnKey: "honesty.landingFooter", enKey: "honesty.landingFooter", variant: "plain" }),
  );

  const forCreators = h(
    "section",
    { class: "section", attrs: { "aria-labelledby": "for-creators-title" } },
    sectionHeading(ctx.t("landing.forCreators"), "h2", "for-creators-title"),
    h(
      "ul",
      { class: "feature-list" },
      ...[
        "landing.bullet.ownAccount",
        "landing.bullet.noCut",
        "landing.bullet.banglaFirst",
        "landing.bullet.embeddable",
      ].map((key) =>
        h(
          "li",
          { class: "feature-list__item" },
          h("span", { class: "feature-list__icon", html: icon("checkCircle", 20) }),
          h("span", { text: ctx.t(key) }),
        ),
      ),
    ),
    linkButton({ href: ctx.href("/onboarding"), label: ctx.t("nav.create"), variant: "secondary", icon: "plus" }),
  );

  const wayRow = (label: string, detail: string, badgeNode: Node) =>
    h(
      "div",
      { class: "ways__row" },
      h("div", { class: "ways__label" }, badgeNode, h("span", { class: "ways__name", text: label })),
      h("p", { class: "ways__detail", text: detail }),
    );

  const ways = h(
    "section",
    { class: "section", attrs: { "aria-labelledby": "ways-title" } },
    sectionHeading(ctx.t("landing.ways"), "h2", "ways-title"),
    h(
      "div",
      { class: "ways" },
      wayRow(
        ctx.t("landing.ways.verified"),
        ctx.t("landing.ways.verified.detail"),
        badge({ label: ctx.t("creator.qr.status.verified"), variant: "confirmed", icon: "checkCircle" }),
      ),
      wayRow(
        ctx.t("landing.ways.unverified"),
        ctx.t("landing.ways.unverified.detail"),
        badge({ label: ctx.t("creator.qr.status.unverified"), variant: "selfreported", icon: "info" }),
      ),
      wayRow(
        ctx.t("landing.ways.manual"),
        ctx.t("landing.ways.manual.detail"),
        badge({ label: ctx.t("creator.qr.status.manual"), variant: "neutral", icon: "hash" }),
      ),
    ),
    h("p", { class: "ways__terms", text: ctx.t("honesty.providerTerms") }),
  );

  const demoPages = h(
    "section",
    { class: "section", attrs: { id: "demo-pages", "aria-labelledby": "demo-pages-title" } },
    sectionHeading(ctx.t("landing.demoPages"), "h2", "demo-pages-title"),
    h("p", { class: "section__lead", text: ctx.t("landing.demoPages.intro") }),
    h(
      "div",
      { class: "demo-grid" },
      ...(creators.length > 0 ? creators : DEMO_CREATORS).map((creator) =>
        h(
          "a",
          {
            class: "demo-card",
            attrs: { href: ctx.href(`/@${creator.slug}`), "data-link": true },
          },
          h(
            "div",
            { class: "demo-card__identity" },
            avatar(creator.avatar_emoji, "md"),
            h(
              "div",
              { class: "demo-card__names" },
              h("span", { class: "demo-card__name", text: creator.display_name }),
              h("span", { class: "demo-card__slug", text: `@${creator.slug}`, attrs: { dir: "ltr" } }),
            ),
            badge({ label: ctx.t("demo.badge"), variant: "demo" }),
          ),
          creator.tagline ? h("p", { class: "demo-card__tagline", text: creator.tagline }) : null,
          h("span", { class: "demo-card__cta" }, ctx.t("landing.demoPageCta"), h("span", { html: icon("arrowRight", 16) })),
        ),
      ),
    ),
  );

  const embedSection = h(
    "section",
    { class: "section", attrs: { "aria-labelledby": "embed-title" } },
    sectionHeading(ctx.t("landing.embed"), "h2", "embed-title"),
    h("p", { class: "section__lead", text: ctx.t("landing.embed.body") }),
    kit
      ? h(
          "div",
          { class: "embed-demo" },
          h(
            "div",
            { class: "embed-demo__frame" },
            h("iframe", {
              attrs: {
                src: kit.embedUrl,
                title: ctx.t("share.iframeTitle", { name: teacher?.display_name ?? "" }),
                loading: "lazy",
                width: "380",
                height: "480",
                class: "embed-demo__iframe",
              },
            }),
          ),
          h(
            "div",
            { class: "embed-demo__code" },
            h("pre", { class: "share-kit__code" }, h("code", { text: kit.iframe })),
            button({
              label: ctx.t("share.embedButton"),
              variant: "secondary",
              size: "sm",
              icon: "copy",
              onClick: () => {
                void copyText(kit.iframe).then((ok) => toast(ok ? ctx.t("common.copied") : ctx.t("common.selectToCopy")));
              },
            }),
            h("p", { class: "embed-demo__preview-label", text: ctx.t("share.embedPreview") }),
          ),
        )
      : null,
  );

  const faqs: Array<[string, string]> = [
    ["landing.faq.q1", "landing.faq.a1"],
    ["landing.faq.q2", "landing.faq.a2"],
    ["landing.faq.q3", "landing.faq.a3"],
    ["landing.faq.q4", "landing.faq.a4"],
    ["landing.faq.q5", "landing.faq.a5"],
  ];
  const faq = h(
    "section",
    { class: "section", attrs: { "aria-labelledby": "faq-title" } },
    sectionHeading(ctx.t("landing.faq"), "h2", "faq-title"),
    h(
      "div",
      { class: "faq" },
      ...faqs.map(([question, answer]) =>
        h(
          "details",
          { class: "faq__item" },
          h("summary", { class: "faq__question" }, h("span", { text: ctx.t(question) }), h("span", { class: "faq__chevron", html: icon("chevronDown", 18) })),
          h("p", { class: "faq__answer", text: ctx.t(answer) }),
        ),
      ),
    ),
  );

  return h(
    "div",
    { class: "page page--landing" },
    hero,
    howItWorks,
    forCreators,
    ways,
    demoPages,
    embedSection,
    faq,
  );
}
