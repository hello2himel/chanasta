/**
 * `/@:slug/thanks` — the claim confirmation, as a thank-you slip.
 *
 * It shows the claim exactly as submitted, stamped self-reported, and says
 * plainly that Chanasta cannot verify the money. No confetti, no "payment
 * successful", no receipt claim.
 */
import { h, copyText, toast } from "../lib/dom.ts";
import { formatTaka, relativeDate, relativeTimeTag } from "../lib/format.ts";
import { readClaimContext } from "../lib/prefs.ts";
import { creatorPageUrl } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import { icon } from "../components/icons.ts";
import { pubButton, pubLink, pubStamp } from "../components/public/primitives.ts";
import { renderNotFound } from "./not-found.ts";
import { COPY, pick } from "./copy.public.ts";

export async function renderThanks(ctx: AppContext): Promise<HTMLElement> {
  if (ctx.route.name !== "thanks") return renderNotFound(ctx);
  const slug = ctx.route.slug;
  const creator = await ctx.data.getCreator(slug).catch(() => null);
  if (!creator) {
    ctx.setMeta(ctx.t("meta.title.notFound"), { noindex: true });
    return renderNotFound(ctx);
  }

  ctx.setFooterCreator(creator);
  ctx.setMeta(ctx.t("meta.title.thanks"), { noindex: true });

  const copy = COPY.thanks;
  const t = pick(ctx.lang);
  const context = readClaimContext(slug);
  const pageUrl = creatorPageUrl(slug, ctx.origin, ctx.base);

  const share = () => {
    void copyText(pageUrl).then((ok) => toast(ok ? ctx.t("common.linkCopied") : ctx.t("common.selectToCopy")));
  };

  const summary = context
    ? h(
        "div",
        { class: "pub-slip__body" },
        h(
          "div",
          { class: "pub-thanks__amount-row" },
          h("span", { class: "pub-thanks__amount", text: formatTaka(context.amount), attrs: { dir: "ltr" } }),
          pubStamp(ctx.t("claim.badge.selfReported"), "self", "info"),
        ),
        h("h2", { class: "pub-thanks__your-message", text: t(copy.yourMessage) }),
        context.message
          ? h("blockquote", { class: "pub-thanks__message" }, h("p", { text: context.message }))
          : h("p", { class: "pub-thanks__no-message", text: ctx.t("claim.anonymous") }),
        context.supporterName ? h("p", { class: "pub-thanks__name", text: context.supporterName }) : null,
        h(
          "dl",
          { class: "pub-thanks__meta" },
          h("dt", { text: t(copy.creatorLabel) }),
          h("dd", { text: creator.display_name }),
          context.methodKind
            ? h("dt", { text: t(copy.methodLabel) })
            : null,
          context.methodKind ? h("dd", { text: ctx.t(`claim.method.${context.methodKind}`) }) : null,
          h("dt", { text: t(copy.timeLabel) }),
          h(
            "dd",
            {},
            h("time", {
              attrs: { datetime: relativeTimeTag(context.createdAt) },
              text: relativeDate(ctx.lang, context.createdAt),
            }),
          ),
        ),
      )
    : h(
        "div",
        { class: "pub-slip__body", attrs: { role: "status" } },
        h("h2", { class: "pub-thanks__missing-title", text: t(copy.missingTitle) }),
        h("p", { class: "pub-thanks__missing-body", text: t(copy.missingBody) }),
      );

  const slip = h(
    "article",
    { class: "pub-slip", attrs: { "aria-labelledby": "pub-thanks-title" } },
    h(
      "header",
      { class: "pub-slip__head" },
      h(
        "span",
        { class: "pub-slip__brand" },
        h("span", { class: "pub-slip__brand-icon", html: icon("cup", 18), attrs: { "aria-hidden": "true" } }),
        h("span", { text: ctx.lang === "bn" ? "চানাস্তা" : "Chanasta" }),
      ),
      h("p", { class: "pub-slip__kicker", text: t(copy.slipKicker) }),
      creator.is_demo ? pubStamp(ctx.t("demo.badge"), "demo", "store") : null,
    ),
    h(
      "div",
      { class: "pub-slip__intro" },
      h("span", { class: "pub-slip__icon", html: icon("heart", 30), attrs: { "aria-hidden": "true" } }),
      h("h1", { class: "pub-slip__title", id: "pub-thanks-title", text: t(copy.title) }),
      h("p", { class: "pub-slip__lead", text: t(copy.body) }),
    ),
    summary,
    h("div", { class: "pub-slip__tear", attrs: { "aria-hidden": "true" } }, h("span", { class: "pub-slip__tear-line" })),
    h(
      "footer",
      { class: "pub-slip__stub" },
      h("p", { class: "pub-slip__not-receipt", text: t(copy.notReceipt) }),
      h("p", { class: "pub-slip__stub-note", text: t(copy.slipStub) }),
    ),
  );

  return h(
    "div",
    { class: "pub-page pub-thanks" },
    slip,
    h(
      "div",
      { class: "pub-thanks__actions" },
      pubButton({ label: t(copy.share), icon: "share", block: true, onClick: share }),
      pubLink({ href: ctx.href(`/@${slug}`), label: t(copy.back), variant: "secondary", block: true, icon: "arrowLeft" }),
    ),
  );
}
