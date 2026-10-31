/**
 * The mini supporter card used by the landing demo, the embed and the
 * onboarding/dashboard live previews. Same tokens, same honesty micro-lines —
 * a preview of the product, never a checkout.
 */
import { h } from "../lib/dom.ts";
import { formatTaka } from "../lib/format.ts";
import { renderAmountQr } from "../lib/qr-payload.ts";
import type { AppContext } from "../lib/app.ts";
import { cx } from "../lib/app.ts";
import type { Creator, PaymentMethod } from "../lib/types.ts";
import { icon, steamMark } from "./icons.ts";
import { avatar, badge, disclosure, linkButton, qrStatusBadge } from "./ui.ts";

export type PreviewVariant = "landing" | "embed" | "preview";

export interface PreviewCardOptions {
  creator: Creator;
  methods: PaymentMethod[];
  variant?: PreviewVariant;
  /** Link to the full page; when null the card is a non-linking preview. */
  pageHref?: string | null;
  /** Selected amount for the amount-derived QR (null = static / ইচ্ছেমতো). */
  amount?: number | null;
  demo?: boolean;
}

export function renderPreviewCard(ctx: AppContext, options: PreviewCardOptions): HTMLElement {
  const variant = options.variant ?? "preview";
  const creator = options.creator;
  const method = options.methods[0] ?? null;
  const amount = options.amount ?? 20;
  const isEmbed = variant === "embed";
  const classNames = cx("preview-card", `preview-card--${variant}`, isEmbed && "embed-card");

  const nameTag = isEmbed ? "h1" : "h2";
  const identity = h(
    "div",
    { class: "preview-card__identity" },
    avatar(creator.avatar_emoji, isEmbed ? "sm" : "md", undefined),
    h(
      "div",
      { class: "preview-card__names" },
      h(nameTag, { class: "preview-card__name", text: creator.display_name }),
      creator.tagline ? h("p", { class: "preview-card__tagline", text: creator.tagline }) : null,
    ),
    options.demo ? badge({ label: ctx.t("demo.badge"), variant: "demo" }) : null,
  );

  const chips = h(
    "div",
    { class: "embed-chips", attrs: { "aria-hidden": "true" } },
    ...[20, 50, 100].map((preset) =>
      h("span", { class: cx("embed-chip", preset === amount && "embed-chip--selected") }, formatTaka(preset)),
    ),
    h("span", { class: cx("embed-chip", "embed-chip--any", amount === null && "embed-chip--selected") }, ctx.t("creator.amount.any")),
  );

  const qrBlock = method?.qr_payload
    ? (() => {
        const ariaLabel = ctx.t("creator.qr.srLabel", {
          name: creator.display_name,
          provider: ctx.t(`provider.${method.kind}`),
          status: ctx.t(method.qr_status === "verified" ? "creator.qr.status.verified" : "creator.qr.status.unverified"),
          merchant: method.qr_decoded?.merchant_name ?? "",
        });
        const rendered = renderAmountQr(method.qr_payload, amount, { ariaLabel });
        return h(
          "div",
          { class: "preview-card__qr" },
          h("div", {
            class: "qr-plate qr-plate--small",
            html: rendered.svg ?? "",
          }),
          h(
            "div",
            { class: "preview-card__qr-meta" },
            method.qr_decoded?.merchant_name
              ? h("p", { class: "preview-card__merchant", text: method.qr_decoded.merchant_name, attrs: { dir: "ltr" } })
              : null,
            qrStatusBadge(ctx, method.qr_status, method.kind),
          ),
        );
      })()
    : method
      ? h(
          "div",
          { class: "preview-card__qr preview-card__manual" },
          h(
            "div",
            { class: "qr-plate qr-plate--small qr-plate--empty" },
            h("span", { html: icon("hash", 36) }),
          ),
          h(
            "div",
            { class: "preview-card__qr-meta" },
            h("p", { class: "preview-card__merchant", text: `@${ctx.t(`provider.${method.kind}`)}` }),
            method.account_number
              ? h("p", { class: "preview-card__account", text: method.account_number, attrs: { dir: "ltr" } })
              : null,
            qrStatusBadge(ctx, method.qr_status, method.kind),
          ),
        )
      : h(
          "div",
          { class: "preview-card__qr" },
          h(
            "div",
            { class: "qr-plate qr-plate--small qr-plate--empty" },
            h("span", { html: icon("qr", 40) }),
          ),
          h("p", { class: "preview-card__merchant", text: ctx.t("creator.noMethods") }),
        );

  const cta = options.pageHref
    ? linkButton({
        href: options.pageHref,
        label: variant === "embed" ? ctx.t("embed.cta") : ctx.t("creator.cta"),
        variant: "primary",
        block: true,
        iconTrailing: variant === "embed" ? "external" : "arrowDown",
      })
    : h("span", { class: "preview-card__cta-ghost", text: ctx.t("creator.cta") });

  const honesty =
    variant === "embed"
      ? h("p", { class: "preview-card__honesty", text: ctx.t("embed.honesty") })
      : h("p", { class: "preview-card__honesty", text: ctx.t("honesty.moneyPath") });

  const footer = isEmbed
    ? h(
        "div",
        { class: "embed-card__footer" },
        options.pageHref
          ? h(
              "a",
              { class: "embed-card__link", attrs: { href: options.pageHref, target: "_blank", rel: "noopener noreferrer" } },
              ctx.t("embed.open"),
              h("span", { class: "sr-only", text: ` ${ctx.t("a11y.newTab")}` }),
            )
          : null,
        h(
          "a",
          {
            class: "embed-card__link",
            attrs: { href: method ? `mailto:hello2himel@proton.me?subject=Report` : "#", target: "_blank", rel: "noopener noreferrer" },
          },
          ctx.t("embed.report"),
        ),
        h(
          "a",
          {
            class: "embed-card__credit",
            attrs: { href: "https://github.com/hello2himel/deshiQR", target: "_blank", rel: "noopener noreferrer", referrerpolicy: "no-referrer" },
          },
          "Powered by deshiQR",
        ),
      )
    : null;

  return h(
    "div",
    { class: classNames },
    isEmbed
      ? h(
          "div",
          { class: "embed-card__brand" },
          h(
            "a",
            { class: "embed-card__brand-link", attrs: { href: ctx.href("/"), target: "_blank", rel: "noopener noreferrer" } },
            h("span", { class: "brand__mark", html: steamMark(18), attrs: { "aria-hidden": "true" } }),
            h("span", { text: ctx.lang === "bn" ? "চানাস্তা" : "Chanasta" }),
          ),
          options.demo ? badge({ label: ctx.t("demo.badge"), variant: "demo" }) : null,
        )
      : null,
    identity,
    variant === "preview"
      ? disclosure({ ctx, bnKey: "honesty.methodStrip", enKey: "honesty.methodStrip", variant: "plain" })
      : null,
    h("div", { class: "preview-card__body" }, qrBlock, h("div", { class: "preview-card__side" }, chips, cta, honesty)),
    footer,
  );
}
