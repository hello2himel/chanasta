/**
 * Share kit: copy link, creator share text, WhatsApp/Facebook links (plain URLs,
 * no SDKs, no tracking) and the iframe embed snippet.
 */
import { h, copyText, toast } from "../lib/dom.ts";
import { buildShareKit } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import { icon } from "./icons.ts";
import { button, linkButton } from "./ui.ts";

export interface ShareKitOptions {
  slug: string;
  creatorName: string;
  /** Rendered inside a card with a heading; compact omits the heading. */
  compact?: boolean;
}

export function renderShareKit(ctx: AppContext, options: ShareKitOptions): HTMLElement {
  const kit = buildShareKit({
    slug: options.slug,
    creatorName: options.creatorName,
    origin: ctx.origin,
    base: ctx.base,
    lang: ctx.lang,
  });

  const copyButton = (label: string, getValue: () => string) =>
    button({
      label,
      variant: "secondary",
      size: "sm",
      icon: "copy",
      onClick: () => {
        void copyText(getValue()).then((ok) => toast(ok ? ctx.t("common.copied") : ctx.t("common.selectToCopy")));
      },
    });

  const linkRow = h(
    "div",
    { class: "share-kit__link" },
    h("span", { class: "share-kit__url", text: kit.pageUrl, attrs: { dir: "ltr" } }),
    copyButton(ctx.t("share.copyLink"), () => kit.pageUrl),
  );

  const shareRow = h(
    "div",
    { class: "share-kit__share" },
    h("span", { class: "share-kit__label", text: ctx.t("share.heading") }),
    h(
      "a",
      {
        class: "btn btn--secondary btn--sm",
        attrs: { href: kit.whatsappUrl, target: "_blank", rel: "noopener noreferrer" },
      },
      h("span", { class: "btn__icon", html: icon("message", 18) }),
      h("span", { class: "btn__label", text: ctx.t("share.whatsapp") }),
    ),
    h(
      "a",
      {
        class: "btn btn--secondary btn--sm",
        attrs: { href: kit.facebookUrl, target: "_blank", rel: "noopener noreferrer" },
      },
      h("span", { class: "btn__icon", html: icon("share", 18) }),
      h("span", { class: "btn__label", text: ctx.t("share.facebook") }),
    ),
    copyButton(ctx.t("share.copyText"), () => kit.shareText),
  );

  const embedCode = h("pre", { class: "share-kit__code" }, h("code", { text: kit.iframe }));
  const embedSection = h(
    "div",
    { class: "share-kit__embed" },
    h("h3", { class: "share-kit__subheading", text: ctx.t("share.embedHeading") }),
    h("p", { class: "share-kit__body", text: ctx.t("share.embedBody") }),
    embedCode,
    h(
      "div",
      { class: "share-kit__actions" },
      copyButton(ctx.t("share.embedButton"), () => kit.iframe),
      linkButton({ href: ctx.href(`/@${options.slug}`), label: ctx.t("share.openPage"), variant: "ghost", size: "sm", icon: "external" }),
    ),
  );

  return h(
    "div",
    { class: "share-kit" },
    options.compact ? null : h("h2", { class: "section-heading", text: ctx.t("share.heading") }),
    linkRow,
    shareRow,
    embedSection,
  );
}
