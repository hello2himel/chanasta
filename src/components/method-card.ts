/**
 * Payment-method cards and the QR panel.
 *
 * The QR shown is always the creator's own payload: when the supporter picks an
 * amount we derive an amount-specific payload with the vendored engine
 * (`withAmount`), and ইচ্ছেমতো shows the static payload. Merchant name,
 * account, institution and NPSB tokens are preserved verbatim by the engine.
 */
import { h, toast } from "../lib/dom.ts";
import { formatTaka } from "../lib/format.ts";
import { renderAmountQr } from "../lib/qr-payload.ts";
import { generateQrOnlySvg } from "../lib/poster.ts";
import { qrFileName } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import { cx } from "../lib/app.ts";
import type { PaymentMethod } from "../lib/types.ts";
import { icon } from "./icons.ts";
import {
  button,
  copyField,
  disclosure,
  qrStatusBadge,
} from "./ui.ts";
import { lastUpdatedLine } from "./layout.ts";

function providerLabel(ctx: AppContext, method: PaymentMethod): string {
  return ctx.t(`provider.${method.kind}`);
}

function decodeHelper(ctx: AppContext): HTMLElement {
  return disclosure({ ctx, bnKey: "honesty.decodeHelper", enKey: "honesty.decodeHelper", variant: "helper" });
}

function saveQrButton(ctx: AppContext, method: PaymentMethod, payload: string, creatorName: string): HTMLButtonElement {
  const aria = ctx.t("creator.qr.srLabelNoMerchant", {
    name: creatorName,
    provider: providerLabel(ctx, method),
    status: ctx.t("creator.qr.status.verified"),
  });
  return button({
    label: ctx.t("creator.qr.save"),
    variant: "secondary",
    size: "sm",
    icon: "download",
    onClick: () => {
      const svg = generateQrOnlySvg(payload, aria);
      if (!svg) {
        toast(ctx.t("creator.qr.encodeError"));
        return;
      }
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = h("a", { attrs: { href: url, download: qrFileName(method.creator_slug ?? "qr", null) } });
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(ctx.t("creator.qr.saved"));
    },
  });
}

/** The white QR plate with the creator's own QR (inline SVG, black on white). */
export function renderQrPlate(
  ctx: AppContext,
  input: { method: PaymentMethod; creatorName: string; amount: number | null },
): HTMLElement {
  const { method, creatorName, amount } = input;
  const statusLabel = qrStatusBadge(ctx, method.qr_status, method.kind);
  const merchantName = method.qr_decoded?.merchant_name ?? null;
  const statusText = method.qr_status === "verified" ? ctx.t("creator.qr.status.verified") : ctx.t("creator.qr.status.unverified");
  const ariaLabel = merchantName
    ? ctx.t("creator.qr.srLabel", {
        name: creatorName,
        provider: providerLabel(ctx, method),
        status: statusText,
        merchant: merchantName,
      })
    : ctx.t("creator.qr.srLabelNoMerchant", {
        name: creatorName,
        provider: providerLabel(ctx, method),
        status: statusText,
      });

  const rendered = renderAmountQr(method.qr_payload, amount, { ariaLabel });
  const plate = h("div", { class: "qr-plate" });
  if (rendered.ok && rendered.svg) {
    plate.innerHTML = rendered.svg;
  } else {
    plate.append(
      h("div", { class: "qr-error", attrs: { role: "img", "aria-label": ctx.t("creator.qr.encodeError") } },
        h("span", { class: "qr-error__icon", html: icon("warning", 32) }),
        h("p", { text: ctx.t("creator.qr.encodeError") }),
      ),
    );
  }

  const amountLine =
    amount === null
      ? ctx.t("creator.qr.anyAmount")
      : ctx.t("creator.qr.amountEmbedded", { amount: formatTaka(amount, { symbol: false }) });

  return h(
    "div",
    { class: "qr-panel" },
    plate,
    h("div", { class: "qr-panel__meta" }, statusLabel),
    merchantName ? h("p", { class: "qr-panel__merchant", text: merchantName, attrs: { dir: "ltr" } }) : null,
    h("p", { class: "qr-panel__amount", text: amountLine }),
    h("p", { class: "qr-panel__scan", text: ctx.t("creator.qr.scan") }),
    decodeHelper(ctx),
    rendered.ok && rendered.payload && method.qr_status !== "none"
      ? h(
          "div",
          { class: "qr-panel__actions" },
          saveQrButton(ctx, method, rendered.payload, creatorName),
          h("p", { class: "qr-panel__fallback", text: ctx.t("creator.qr.savedHelper") }),
        )
      : null,
  );
}

function bankFields(ctx: AppContext, method: PaymentMethod): HTMLElement {
  const rows: Array<[string, string | null | Node]> = [
    [ctx.t("onboarding.payment.holder"), method.account_holder],
    [ctx.t("onboarding.payment.bank"), method.bank_name],
    [ctx.t("onboarding.payment.branch"), method.branch],
    [ctx.t("onboarding.payment.routing"), method.routing_number],
  ];
  const dl = h("dl", { class: "bank-fields" });
  for (const [label, value] of rows) {
    if (!value) continue;
    dl.append(h("dt", { text: label }), h("dd", {}, typeof value === "string" ? value : value));
  }
  return dl;
}

/** One full payment-method card (QR or manual/bank). */
export function renderMethodCard(
  ctx: AppContext,
  input: { method: PaymentMethod; creatorName: string; amount: number | null; expanded?: boolean },
): HTMLElement {
  const { method, creatorName, amount } = input;
  const headingId = `method-title-${method.id}`;
  const cardClass = cx(
    "method-card",
    method.kind === "bank" && "method-card--bank",
    method.qr_status === "verified" && "method-card--verified",
  );

  const header = h(
    "header",
    { class: "method-card__header" },
    h("h3", { class: "method-card__title", id: headingId, text: method.label }),
    h("div", { class: "method-card__badges" }, qrStatusBadge(ctx, method.qr_status, method.kind)),
  );

  const body: Node[] = [];
  if (method.qr_payload && method.qr_status !== "none") {
    body.push(renderQrPlate(ctx, { method, creatorName, amount }));
    if (method.account_number) {
      body.push(
        copyField(ctx, { value: method.account_number, label: ctx.t("poster.account") }),
      );
      body.push(h("p", { class: "method-card__check", text: ctx.t("creator.method.checkFirst") }));
    }
  } else if (method.account_number) {
    body.push(
      copyField(ctx, {
        value: method.account_number,
        label: method.kind === "bank" ? ctx.t("poster.account") : ctx.t("common.copyNumber"),
        mono: true,
      }),
    );
    if (method.kind === "bank") body.push(bankFields(ctx, method));
    body.push(h("p", { class: "method-card__check", text: ctx.t("creator.method.checkFirst") }));
    body.push(decodeHelper(ctx));
  } else {
    body.push(
      h("p", { class: "method-card__placeholder", text: ctx.t("creator.noMethods") }),
    );
  }
  if (method.updated_at) body.push(lastUpdatedLine(ctx, method.updated_at));

  return h(
    "section",
    { class: cardClass, attrs: { "aria-labelledby": headingId } },
    header,
    ...body,
  );
}

export interface PaymentMethodsHandle {
  element: HTMLElement;
  update: (amount: number | null) => void;
}

/**
 * The full payment section: disclosure strip B, the three steps, the primary
 * method, and an accordion for any other enabled methods.
 */
export function renderPaymentMethods(
  ctx: AppContext,
  input: { methods: PaymentMethod[]; creatorName: string; amount: number | null; creatorSlug: string },
): PaymentMethodsHandle {
  const element = h("section", { class: "pay-section", attrs: { "aria-labelledby": "how-to-send" } });
  let currentAmount = input.amount;

  const render = () => {
    element.replaceChildren();
    element.append(
      h("h2", { class: "section-heading", id: "how-to-send", text: ctx.t("creator.howToSend"), attrs: { tabindex: "-1" } }),
      disclosure({ ctx, bnKey: "honesty.methodStrip", enKey: "honesty.methodStrip", variant: "strip" }),
    );

    if (input.methods.length === 0) {
      element.append(
        h(
          "div",
          { class: "empty-methods", attrs: { role: "status" } },
          h("span", { class: "empty-methods__icon", html: icon("card", 32) }),
          h("p", { text: ctx.t("creator.noMethods") }),
        ),
      );
      return;
    }

    element.append(
      h(
        "ol",
        { class: "send-steps" },
        h("li", { text: ctx.t("creator.step1") }),
        h("li", { text: ctx.t("creator.step2") }),
        h("li", { text: ctx.t("creator.step3") }),
      ),
    );

    const [primary, ...rest] = input.methods;
    if (primary) {
      element.append(renderMethodCard(ctx, { method: primary, creatorName: input.creatorName, amount: currentAmount }));
    }

    if (rest.length > 0) {
      const groupId = "other-methods";
      const trigger = h(
        "button",
        {
          class: "accordion__trigger",
          attrs: { type: "button", "aria-expanded": "false", "aria-controls": groupId },
        },
        h("span", { text: ctx.t("creator.otherWays") }),
        h("span", { class: "accordion__chevron", html: icon("chevronDown", 18) }),
      );
      const panel = h("div", { class: "accordion__panel", id: groupId, attrs: { hidden: true } });
      trigger.addEventListener("click", () => {
        const expanded = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!expanded));
        panel.hidden = expanded;
      });
      panel.append(
        ...rest.map((method) =>
          renderMethodCard(ctx, { method, creatorName: input.creatorName, amount: currentAmount, expanded: false }),
        ),
      );
      element.append(h("div", { class: "accordion" }, trigger, panel));
    }
  };

  render();

  return {
    element,
    update: (amount: number | null) => {
      currentAmount = amount;
      render();
    },
  };
}
