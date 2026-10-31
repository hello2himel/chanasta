/**
 * Method picker — the creator's other ways to receive money, as ledger rows
 * with honest decode badges. Selecting a row swaps the receipt above; the row
 * always shows a masked number, and the full number is only in the receipt
 * behind a reveal control.
 */
import { h } from "../../lib/dom.ts";
import { maskNumber } from "../../lib/format.ts";
import { decodeStatusLabelKey } from "../../lib/qr-payload.ts";
import type { AppContext } from "../../lib/app.ts";
import type { PaymentMethod, PaymentQrStatus } from "../../lib/types.ts";
import { icon } from "../icons.ts";
import { pubStamp } from "./primitives.ts";

export interface MethodPickerOptions {
  ctx: AppContext;
  methods: readonly PaymentMethod[];
  selectedId: string | null;
  onSelect: (method: PaymentMethod) => void;
  title: string;
  help: string;
  selectedLabel: string;
}

function decodeStamp(ctx: AppContext, status: PaymentQrStatus, kind: PaymentMethod["kind"]): HTMLSpanElement {
  const label = ctx.t(decodeStatusLabelKey(status, kind));
  if (status === "verified") return pubStamp(label, "verified", "checkCircle");
  if (status === "unverified") return pubStamp(label, "unverified", "info");
  if (status === "image_only") return pubStamp(label, "neutral", "image");
  return pubStamp(label, "neutral", kind === "bank" ? "bank" : "hash");
}

export function renderMethodPicker(options: MethodPickerOptions): HTMLElement {
  const { ctx, methods, onSelect } = options;
  const rows: HTMLButtonElement[] = [];

  const update = (selectedId: string | null) => {
    for (const row of rows) {
      const active = row.dataset.methodId === selectedId;
      row.classList.toggle("pub-methods__row--active", active);
      row.setAttribute("aria-pressed", String(active));
      const marker = row.querySelector<HTMLElement>(".pub-methods__marker");
      if (marker) marker.hidden = !active;
    }
  };

  const list = h("div", { class: "pub-methods__list", attrs: { role: "group", "aria-label": options.title } });
  for (const method of methods) {
    const row = h(
      "button",
      {
        class: "pub-methods__row",
        attrs: {
          type: "button",
          "aria-pressed": String(method.id === options.selectedId),
          "data-method-id": method.id,
        },
        on: {
          click: () => {
            update(method.id);
            onSelect(method);
          },
        },
      },
      h("span", {
        class: "pub-methods__icon",
        html: icon(method.kind === "bank" ? "bank" : "wallet", 20),
        attrs: { "aria-hidden": "true" },
      }),
      h(
        "span",
        { class: "pub-methods__body" },
        h("span", { class: "pub-methods__name", text: `${ctx.t(`provider.${method.kind}`)} · ${method.label}` }),
        h("span", { class: "pub-methods__account", text: method.account_number ? maskNumber(method.account_number) : "", attrs: { dir: "ltr" } }),
      ),
      h("span", { class: "pub-methods__badges" }, decodeStamp(ctx, method.qr_status, method.kind)),
      h(
        "span",
        { class: "pub-methods__marker", attrs: { hidden: method.id !== options.selectedId } },
        h("span", { class: "sr-only", text: options.selectedLabel }),
        h("span", { class: "pub-methods__tick", html: icon("check", 16), attrs: { "aria-hidden": "true" } }),
      ),
    );
    rows.push(row);
    list.append(row);
  }
  update(options.selectedId);

  return h(
    "section",
    { class: "pub-methods", attrs: { "aria-labelledby": "pub-methods-title" } },
    h(
      "header",
      { class: "pub-methods__head" },
      h("h2", { class: "pub-methods__title", id: "pub-methods-title", text: options.title }),
      h("p", { class: "pub-methods__help", text: options.help }),
    ),
    list,
  );
}
