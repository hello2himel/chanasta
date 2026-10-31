/**
 * The chai receipt — the supporter's core artifact.
 *
 * A perforated paper strip: counter line, tabular amount, the QR plate, then a
 * torn stub holding the reference and the honesty note. The QR is always the
 * creator's own payload, derived for the chosen amount with the vendored engine
 * (`renderAmountQr` → `withAmount` + `toSvg`); "ইচ্ছেমতো" keeps the static
 * payload. Nothing on the receipt is a payment confirmation.
 */
import { h } from "../../lib/dom.ts";
import { formatDate, formatTaka, UNITS } from "../../lib/format.ts";
import { decodeStatusHelperKey, decodeStatusLabelKey, renderAmountQr } from "../../lib/qr-payload.ts";
import type { AppContext } from "../../lib/app.ts";
import type { Creator, PaymentMethod, PaymentQrStatus } from "../../lib/types.ts";
import { icon } from "../icons.ts";
import { pubCopyField, pubStamp, pubSlug } from "./primitives.ts";
import type { ReceiptCopy } from "../../pages/copy.public.ts";

export interface ReceiptOptions {
  ctx: AppContext;
  creator: Creator;
  method: PaymentMethod | null;
  amount: number | null;
  copy: ReceiptCopy;
  demo?: boolean;
  variant?: "page" | "specimen" | "embed";
  /** Pre-computed newest update time across all of the creator's methods. */
  updatedIso?: string;
  /** Optional sample claim shown in the specimen's stub (landing only). */
  sampleClaim?: { name: string; amount: number; message: string; stamp: string };
}

/** Newest update across the creator and its methods (same rule as before). */
export function lastUpdatedIso(creator: Creator, methods: readonly PaymentMethod[]): string {
  const dates = [creator.updated_at, ...methods.map((method) => method.updated_at)].filter(Boolean) as string[];
  const newest = dates
    .map((value) => ({ value, time: Date.parse(value) }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((a, b) => b.time - a.time)[0];
  return newest?.value ?? creator.updated_at;
}

function methodUnitLabel(ctx: AppContext, amount: number): string | null {
  const unit = UNITS.find((entry) => entry.amount === amount);
  if (!unit) return null;
  return ctx.lang === "bn" ? unit.bn : unit.en;
}

function decodeStamp(ctx: AppContext, status: PaymentQrStatus, kind: PaymentMethod["kind"]): HTMLSpanElement {
  const key = decodeStatusLabelKey(status, kind);
  const label = ctx.t(key);
  if (status === "verified") return pubStamp(label, "verified", "checkCircle");
  if (status === "unverified") return pubStamp(label, "unverified", "info");
  if (status === "image_only") return pubStamp(label, "neutral", "image");
  return pubStamp(label, "neutral", kind === "bank" ? "bank" : "hash");
}

function bankRows(ctx: AppContext, method: PaymentMethod): HTMLElement {
  const dl = h("dl", { class: "pub-receipt__bank" });
  const rows: Array<[string, string | null]> = [
    [ctx.t("onboarding.payment.holder"), method.account_holder],
    [ctx.t("onboarding.payment.bank"), method.bank_name],
    [ctx.t("onboarding.payment.branch"), method.branch],
    [ctx.t("onboarding.payment.routing"), method.routing_number],
  ];
  for (const [label, value] of rows) {
    if (!value) continue;
    dl.append(h("dt", { text: label }), h("dd", { text: value }));
  }
  return dl;
}

export function renderReceiptQr(options: ReceiptOptions): HTMLElement {
  const { ctx, creator, method, amount, copy } = options;
  if (!method) {
    return h("p", { class: "pub-receipt__placeholder", text: ctx.t("creator.noMethods") });
  }
  if (!method.qr_payload || method.qr_status === "none") {
    return h(
      "div",
      { class: "pub-receipt__manual" },
      h("p", { class: "pub-receipt__manual-note", text: copy.receiptNoQr }),
      decodeStamp(ctx, method.qr_status, method.kind),
      method.account_number
        ? pubCopyField({ ctx, value: method.account_number, label: copy.copyNumber, mono: true })
        : null,
      method.kind === "bank" ? bankRows(ctx, method) : null,
    );
  }

  const merchantName = method.qr_decoded?.merchant_name ?? null;
  const statusText =
    method.qr_status === "verified" ? ctx.t("creator.qr.status.verified") : ctx.t("creator.qr.status.unverified");
  const ariaLabel = merchantName
    ? ctx.t("creator.qr.srLabel", {
        name: creator.display_name,
        provider: ctx.t(`provider.${method.kind}`),
        status: statusText,
        merchant: merchantName,
      })
    : ctx.t("creator.qr.srLabelNoMerchant", {
        name: creator.display_name,
        provider: ctx.t(`provider.${method.kind}`),
        status: statusText,
      });
  const rendered = renderAmountQr(method.qr_payload, amount, { ariaLabel });

  // The SVG carries role="img" + aria-label itself; the wrapper stays neutral
  // so screen readers announce the QR exactly once.
  const plate = h("div", { class: "pub-qr" });
  if (rendered.ok && rendered.svg) {
    plate.innerHTML = rendered.svg;
  } else {
    plate.append(
      h(
        "div",
        { class: "pub-qr__error" },
        h("span", { class: "pub-qr__error-icon", html: icon("warning", 28), attrs: { "aria-hidden": "true" } }),
        h("p", { text: ctx.t("creator.qr.encodeError") }),
      ),
    );
  }

  const amountLine =
    amount === null
      ? copy.receiptAnyQr
      : ctx.t("creator.qr.amountEmbedded", { amount: formatTaka(amount, { symbol: false }) });

  return h(
    "div",
    { class: "pub-receipt__qr-block" },
    h("div", { class: "pub-receipt__qr-label" }, h("span", { text: copy.receiptScan })),
    plate,
    h("p", { class: "pub-receipt__qr-amount", text: amountLine }),
    h("div", { class: "pub-receipt__decode" }, decodeStamp(ctx, method.qr_status, method.kind)),
    merchantName
      ? h(
          "dl",
          { class: "pub-receipt__compare" },
          h("dt", { text: copy.receiptQrName }),
          h("dd", { text: merchantName, attrs: { dir: "ltr" } }),
          h("dt", { text: copy.receiptGivenName }),
          h("dd", { text: creator.display_name }),
        )
      : null,
    merchantName ? h("p", { class: "pub-receipt__compare-note", text: copy.receiptCompare }) : null,
    method.account_number
      ? pubCopyField({ ctx, value: method.account_number, label: copy.copyNumber, mono: true, compact: true })
      : null,
    method.kind === "bank" ? bankRows(ctx, method) : null,
    h("p", { class: "pub-receipt__helper", text: ctx.t(decodeStatusHelperKey(method.qr_status)) }),
  );
}

/**
 * One receipt. Re-rendered by the supporter page whenever the amount or the
 * selected method changes; the landing uses the `specimen` variant with a
 * synthetic demo creator.
 */
export function renderReceipt(options: ReceiptOptions): HTMLElement {
  const { ctx, creator, method, amount, copy } = options;
  const variant = options.variant ?? "page";
  const unitLabel = amount !== null ? methodUnitLabel(ctx, amount) : null;

  const updatedIso = options.updatedIso ?? lastUpdatedIso(creator, method ? [method] : []);
  const amountValue = amount === null ? copy.anyAmount : formatTaka(amount);
  const amountSub = amount === null ? copy.anyAmountSub : unitLabel ?? copy.anyAmount;

  const head = h(
    "header",
    { class: "pub-receipt__head" },
    h(
      "div",
      { class: "pub-receipt__brand" },
      h("span", { class: "pub-receipt__brand-mark", html: icon("cup", 20), attrs: { "aria-hidden": "true" } }),
      h("span", { class: "pub-receipt__brand-word", text: ctx.lang === "bn" ? "চানাস্তা" : "Chanasta" }),
    ),
    h("p", { class: "pub-receipt__kicker", text: copy.receiptKicker }),
    h(
      "div",
      { class: "pub-receipt__flags" },
      options.demo ? pubStamp(ctx.t("demo.badge"), "demo", "store") : null,
      variant === "specimen" ? pubStamp(copy.receiptSample, "neutral") : null,
    ),
  );

  const party = h(
    "dl",
    { class: "pub-receipt__party" },
    h("dt", { text: copy.receiptCreator }),
    h("dd", {}, h("strong", { text: creator.display_name }), options.demo ? h("span", { class: "pub-receipt__demo-name", text: ` · ${ctx.t("demo.badge")}` }) : null),
    h("dt", { text: copy.receiptPage }),
    h("dd", {}, pubSlug(creator.slug)),
    h("dt", { text: copy.receiptMethod }),
    h("dd", { text: method ? `${ctx.t(`provider.${method.kind}`)}${method.label ? ` · ${method.label}` : ""}` : ctx.t("creator.noMethods") }),
  );

  const amountBlock = h(
    "div",
    { class: "pub-receipt__amount" },
    h("span", { class: "pub-receipt__amount-label", text: copy.receiptAmount }),
    h("span", { class: "pub-receipt__amount-value", text: amountValue, attrs: { dir: amount === null ? null : "ltr" } }),
    h("span", { class: "pub-receipt__amount-sub", text: amountSub }),
  );

  const stub = h(
    "footer",
    { class: "pub-receipt__stub" },
    h(
      "dl",
      { class: "pub-receipt__stub-rows" },
      h("dt", { text: copy.receiptReference }),
      h("dd", { class: "pub-mono", text: method?.qr_decoded?.reference ?? `@${creator.slug}`, attrs: { dir: "ltr" } }),
      h("dt", { text: copy.lastUpdated }),
      h(
        "dd",
        {},
        h("time", {
          attrs: { datetime: updatedIso },
          text: formatDate(ctx.lang, updatedIso),
        }),
      ),
    ),
    options.sampleClaim
      ? h(
          "div",
          { class: "pub-receipt__sample-claim" },
          h("p", { class: "pub-receipt__sample-line" },
            h("strong", { text: options.sampleClaim.name }),
            h("span", { class: "pub-receipt__sample-amount", text: formatTaka(options.sampleClaim.amount), attrs: { dir: "ltr" } }),
          ),
          h("p", { class: "pub-receipt__sample-message", text: options.sampleClaim.message }),
          pubStamp(options.sampleClaim.stamp, "self", "info"),
        )
      : null,
    h("p", { class: "pub-receipt__tear-note", text: copy.receiptTearNote }),
    h("p", { class: "pub-receipt__honesty", text: ctx.t("honesty.decodeHelper") }),
  );

  return h(
    "article",
    { class: ["pub-receipt", `pub-receipt--${variant}`], attrs: { "aria-label": copy.receiptKicker } },
    h("div", { class: "pub-receipt__paper" }, head, party, amountBlock, renderReceiptQr(options)),
    h("div", { class: "pub-receipt__tear", attrs: { "aria-hidden": "true" } }, h("span", { class: "pub-receipt__tear-line" })),
    h("div", { class: "pub-receipt__paper pub-receipt__paper--stub" }, stub),
  );
}

/**
 * The landing specimen: a receipt with the demo creator's own QR and a sample
 * self-reported note in the stub. It is a specimen, not a checkout.
 */
export function renderReceiptSpecimen(options: ReceiptOptions): HTMLElement {
  return h(
    "div",
    { class: "pub-specimen" },
    h(
      "p",
      { class: "pub-specimen__caption" },
      h("span", { class: "pub-specimen__caption-icon", html: icon("receipt", 16), attrs: { "aria-hidden": "true" } }),
      h("span", { text: options.copy.receiptKicker }),
    ),
    renderReceipt({ ...options, variant: "specimen" }),
  );
}
