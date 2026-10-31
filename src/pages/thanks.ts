/**
 * `/@:slug/thanks` — the claim confirmation.
 *
 * Thanks the supporter for the *message*, shows the claim exactly as submitted
 * with the self-reported badge, and says plainly that Chanasta does not verify
 * the money. No confetti, no "payment successful", no receipt.
 */
import { h, copyText, toast } from "../lib/dom.ts";
import { formatTaka, relativeDate } from "../lib/format.ts";
import { readClaimContext } from "../lib/prefs.ts";
import { creatorPageUrl } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import { claimStatusBadge, linkButton } from "../components/ui.ts";
import { icon } from "../components/icons.ts";
import { renderNotFound } from "./not-found.ts";

export async function renderThanks(ctx: AppContext): Promise<HTMLElement> {
  if (ctx.route.name !== "thanks") return renderNotFound(ctx);
  const slug = ctx.route.slug;
  const creator = await ctx.data.getCreator(slug).catch(() => null);
  if (!creator) {
    ctx.setMeta(ctx.t("meta.title.notFound"), { noindex: true });
    return renderNotFound(ctx);
  }

  ctx.setFooterCreator(creator);
  const context = readClaimContext(slug);
  const pageUrl = creatorPageUrl(slug, ctx.origin, ctx.base);
  ctx.setMeta(ctx.t("meta.title.thanks"), { noindex: true });

  const share = async () => {
    const ok = await copyText(pageUrl);
    toast(ok ? ctx.t("common.linkCopied") : ctx.t("common.selectToCopy"));
  };

  const summary = context
    ? h(
        "section",
        { class: "thanks-card", attrs: { "aria-labelledby": "thanks-claim-title" } },
        h(
          "header",
          { class: "thanks-card__head" },
          h("p", { class: "thanks-card__amount", attrs: { dir: "ltr" } }, formatTaka(context.amount)),
          claimStatusBadge(ctx, "unverified"),
          h("h2", { class: "thanks-card__title", id: "thanks-claim-title", text: ctx.t("claim.thanks.yourMessage") }),
        ),
        h(
          "p",
          { class: "thanks-card__to", text: `${creator.display_name}${ctx.lang === "bn" ? "কে" : ""}` },
        ),
        context.supporterName ? h("p", { class: "thanks-card__name", text: context.supporterName }) : null,
        context.message ? h("blockquote", { class: "thanks-card__message" }, h("p", { text: context.message })) : null,
        h(
          "p",
          { class: "thanks-card__meta" },
          context.methodKind ? ctx.t(`claim.method.${context.methodKind}`) : null,
          context.methodKind ? " · " : null,
          h("time", { attrs: { datetime: context.createdAt }, text: relativeDate(ctx.lang, context.createdAt) }),
        ),
      )
    : h(
        "section",
        { class: "thanks-card thanks-card--neutral", attrs: { role: "status" } },
        h("h2", { class: "thanks-card__title", text: ctx.t("claim.success.missing") }),
        h("p", { class: "thanks-card__body", text: ctx.t("claim.success.missingBody") }),
      );

  return h(
    "div",
    { class: "thanks-page" },
    h("span", { class: "thanks-page__mark", html: "☕", attrs: { "aria-hidden": "true" } }),
    h("h1", { class: "thanks-page__title", text: context ? ctx.t("claim.success.title") : ctx.t("claim.success.missing") }),
    h("p", { class: "thanks-page__body", text: ctx.t("claim.success.body") }),
    summary,
    h(
      "div",
      { class: "thanks-page__actions" },
      h(
        "button",
        { class: "btn btn--primary btn--block", attrs: { type: "button" }, on: { click: () => void share() } },
        h("span", { class: "btn__icon", html: icon("share", 18) }),
        h("span", { class: "btn__label", text: ctx.t("claim.thanks.share") }),
      ),
      linkButton({
        href: ctx.href(`/@${slug}`),
        label: ctx.t("claim.thanks.back"),
        variant: "secondary",
        block: true,
        icon: "arrowLeft",
      }),
    ),
    h("p", { class: "thanks-page__not-receipt", text: ctx.t("claim.success.notReceipt") }),
  );
}
