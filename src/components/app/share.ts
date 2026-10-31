/**
 * Share kit (creator app): link, share text, WhatsApp/Facebook, embed snippet
 * and the A4 poster download. Uses the existing `lib/share.ts` helpers and
 * `lib/poster.ts` generator — no new URL logic.
 */
import { h, copyText, downloadSvg, toast } from "../../lib/dom.ts";
import { buildShareKit, creatorPageUrl } from "../../lib/share.ts";
import { generatePosterSvg } from "../../lib/poster.ts";
import type { AppContext } from "../../lib/app.ts";
import type { Creator, PaymentMethod } from "../../lib/types.ts";
import { appButton, appCopyRow, appIcon } from "./ui.ts";
import type { ResolvedAppCopy } from "../../pages/copy.app.ts";

function codeBlock(text: string): HTMLElement {
  return h("pre", { class: "app-share__code" }, h("code", { text }));
}

export function renderAppShareKit(
  ctx: AppContext,
  options: { creator: Creator; methods: PaymentMethod[]; copy: ResolvedAppCopy },
): HTMLElement {
  const copy = options.copy;
  const kit = buildShareKit({
    slug: options.creator.slug,
    creatorName: options.creator.display_name,
    origin: ctx.origin,
    base: ctx.base,
    lang: ctx.lang,
  });
  const pageUrl = creatorPageUrl(options.creator.slug, ctx.origin, ctx.base);

  const copyTextButton = (label: string, value: string): HTMLButtonElement =>
    appButton({
      label,
      variant: "secondary",
      size: "sm",
      icon: "file-copy-line",
      onClick: () => {
        void copyText(value).then((ok) => toast(ok ? copy.copied : copy.copyFailed));
      },
    });

  const linkRow = appCopyRow({
    value: pageUrl,
    mono: true,
    mask: false,
    copyLabel: copy.copy,
    copiedLabel: copy.copied,
    onCopied: () => toast(copy.copiedLink),
  });

  const shareTextRow = appCopyRow({
    value: kit.shareText,
    mask: false,
    copyLabel: copy.copy,
    copiedLabel: copy.copied,
  });

  const posterMethod =
    options.methods.find((method) => method.enabled && method.qr_payload) ??
    options.methods.find((method) => method.enabled) ??
    null;
  const poster = posterMethod
    ? generatePosterSvg({
        creator: options.creator,
        method: posterMethod,
        url: pageUrl,
        lang: ctx.lang,
        demo: options.creator.is_demo === true,
      })
    : null;

  return h(
    "div",
    { class: "app-share" },
    h(
      "div",
      { class: "app-share__block" },
      h("h3", { class: "app-share__title", text: copy.shareTitle }),
      linkRow,
      h(
        "div",
        { class: "app-share__actions" },
        h(
          "a",
          {
            class: "app-btn app-btn--secondary app-btn--sm",
            attrs: { href: kit.whatsappUrl, target: "_blank", rel: "noopener noreferrer" },
          },
          h("i", { class: "ri-whatsapp-line ri", attrs: { "aria-hidden": "true" } }),
          h("span", { class: "app-btn__label", text: copy.shareWhatsApp }),
        ),
        h(
          "a",
          {
            class: "app-btn app-btn--secondary app-btn--sm",
            attrs: { href: kit.facebookUrl, target: "_blank", rel: "noopener noreferrer" },
          },
          h("i", { class: "ri-facebook-circle-line ri", attrs: { "aria-hidden": "true" } }),
          h("span", { class: "app-btn__label", text: copy.shareFacebook }),
        ),
        copyTextButton(copy.copy, pageUrl),
      ),
    ),
    h(
      "div",
      { class: "app-share__block" },
      h("h3", { class: "app-share__title", text: copy.shareTextLabel }),
      shareTextRow,
      h("div", { class: "app-share__actions" }, copyTextButton(copy.copy, kit.shareText)),
    ),
    h(
      "div",
      { class: "app-share__block" },
      h("h3", { class: "app-share__title", text: copy.posterTitle }),
      h("p", { class: "app-share__body", text: copy.posterBody }),
      h(
        "div",
        { class: "app-share__actions" },
        appButton({
          label: copy.posterDownload,
          variant: "secondary",
          size: "sm",
          icon: "download-line",
          disabled: !poster?.ok,
          onClick: () => {
            if (!poster?.ok || !poster.svg) return;
            downloadSvg(poster.fileName, poster.svg);
            toast(copy.copied);
          },
        }),
        h(
          "a",
          { class: "app-btn app-btn--ghost app-btn--sm", attrs: { href: kit.pageUrl, target: "_blank", rel: "noopener noreferrer" } },
          appIcon("external-link-line", 16),
          h("span", { class: "app-btn__label", text: copy.viewPage }),
        ),
      ),
    ),
    h(
      "div",
      { class: "app-share__block" },
      h("h3", { class: "app-share__title", text: copy.embedTitle }),
      codeBlock(kit.iframe),
      h("div", { class: "app-share__actions" }, copyTextButton(copy.embedCopy, kit.iframe)),
    ),
  );
}
