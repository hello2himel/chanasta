/**
 * The chai receipt — the product's one memorable artifact, used as the live
 * onboarding/profile preview. Perforated top/bottom via CSS only (notches are
 * the tear line); no QR is invented for methods that have none.
 */
import { h } from "../../lib/dom.ts";
import { formatTaka, UNITS } from "../../lib/format.ts";
import { renderAmountQr } from "../../lib/qr-payload.ts";
import type { AppContext } from "../../lib/app.ts";
import type { PaymentMethod } from "../../lib/types.ts";
import { appAvatar, appStamp } from "./ui.ts";
import type { ResolvedAppCopy } from "../../pages/copy.app.ts";

export interface ReceiptPreviewOptions {
  creatorName: string;
  tagline: string;
  avatar: string;
  slug: string;
  methods: PaymentMethod[];
  copy: ResolvedAppCopy;
  demo?: boolean;
  compact?: boolean;
  showQr?: boolean;
}

function ladderRow(label: string, amount: string): HTMLElement {
  return h(
    "li",
    { class: "app-receipt__line" },
    h("span", { class: "app-receipt__line-label", text: label }),
    h("span", { class: "app-receipt__dots", attrs: { "aria-hidden": "true" } }),
    h("span", { class: "app-receipt__line-amount", text: amount, attrs: { dir: "ltr" } }),
  );
}

function methodStamp(
  method: PaymentMethod,
  copy: ResolvedAppCopy,
): HTMLElement {
  if (method.qr_status === "verified") return appStamp({ label: copy.stampQrVerified, tone: "confirmed", icon: "checkbox-circle-line" });
  if (method.qr_status === "unverified") return appStamp({ label: copy.stampQrUnverified, tone: "self", icon: "information-line" });
  return appStamp({ label: copy.stampManual, tone: "outline", icon: "hashtag" });
}

export function renderReceiptPreview(ctx: AppContext, options: ReceiptPreviewOptions): HTMLElement {
  const copy = options.copy;
  const displayName = options.creatorName.trim() || ctx.t("app.name");
  const tagline = options.tagline.trim();
  const slug = options.slug.trim() || "your-name";
  const methods = options.methods.filter((method) => method.enabled);
  const qrMethod = methods.find((method) => method.qr_payload && method.qr_status !== "none") ?? null;
  const enabled = methods.length > 0;

  const qrPlate = qrMethod
    ? (() => {
        const rendered = renderAmountQr(qrMethod.qr_payload, 20, {
          ariaLabel: `${displayName} — ${ctx.t(`provider.${qrMethod.kind}`)}`,
        });
        return h(
          "div",
          { class: "app-receipt__qr" },
          h("div", { class: "app-receipt__qr-plate", html: rendered.svg ?? "" }),
          h(
            "p",
            { class: "app-receipt__qr-note" },
            h("span", { class: "app-receipt__qr-name", text: qrMethod.qr_decoded?.merchant_name ?? ctx.t("app.name") }),
            h("span", { text: ctx.t("creator.qr.scan") }),
          ),
        );
      })()
    : null;

  return h(
    "div",
    { class: `app-receipt${options.compact ? " app-receipt--compact" : ""}` },
    h(
      "div",
      { class: "app-receipt__head" },
      h(
        "span",
        { class: "app-receipt__brand" },
        h("i", { class: "ri-cup-line ri", attrs: { "aria-hidden": "true" } }),
        h("span", { text: ctx.t("app.name") }),
      ),
      h(
        "span",
        { class: "app-receipt__meta" },
        options.demo ? h("span", { class: "app-receipt__demo", text: copy.stampDemo }) : null,
        h("span", { class: "app-receipt__no", text: `#${slug.slice(0, 14)}`, attrs: { dir: "ltr" } }),
      ),
    ),
    h(
      "div",
      { class: "app-receipt__identity" },
      appAvatar(options.avatar, "md", displayName),
      h(
        "div",
        { class: "app-receipt__names" },
        h("p", { class: "app-receipt__name", text: displayName }),
        tagline ? h("p", { class: "app-receipt__tagline", text: tagline }) : null,
        h("p", { class: "app-receipt__slug", text: `chanasta/@${slug}`, attrs: { dir: "ltr" } }),
      ),
    ),
    h("hr", { class: "app-receipt__rule", attrs: { "aria-hidden": "true" } }),
    h(
      "ul",
      { class: "app-receipt__ladder" },
      ...UNITS.map((unit) => ladderRow(ctx.lang === "en" ? unit.en : unit.bn, formatTaka(unit.amount))),
      ladderRow(ctx.t("creator.amount.any"), "—"),
    ),
    qrPlate,
    h(
      "div",
      { class: "app-receipt__methods" },
      ...(enabled
        ? methods.slice(0, 4).map((method) =>
            h(
              "div",
              { class: "app-receipt__method" },
              h("span", { class: "app-receipt__method-label", text: method.label }),
              methodStamp(method, copy),
            ),
          )
        : [h("p", { class: "app-receipt__empty", text: copy.addedEmpty })]),
    ),
    h("div", { class: "app-receipt__tear", attrs: { "aria-hidden": "true" } }),
    h(
      "div",
      { class: "app-receipt__stub" },
      h("p", { class: "app-receipt__disclosure", text: ctx.t("honesty.moneyPath") }),
      h("p", { class: "app-receipt__fine", text: ctx.t("honesty.noFeesShort") }),
    ),
  );
}
