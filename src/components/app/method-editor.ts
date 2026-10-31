/**
 * Payment-method editor shared by onboarding and the dashboard payments page.
 *
 * Three evidence paths — paste a Bangla QR payload, upload a QR screenshot
 * (jsqr, lazy), or type a manual number / bank account — with the honest decode
 * labels. The engine decides the decode status; this component never upgrades a
 * badge optimistically and never fabricates a "verified" state.
 */
import { h, toast } from "../../lib/dom.ts";
import { classifyPayload } from "../../lib/qr-payload.ts";
import { validatePaymentMethod } from "../../lib/validate.ts";
import { messageForError } from "../../lib/messages.ts";
import type { AppContext } from "../../lib/app.ts";
import { cx } from "../../lib/app.ts";
import type {
  PaymentKind,
  PaymentMethod,
  PaymentMethodInput,
  PaymentQrStatus,
  QrDecodedSnapshot,
} from "../../lib/types.ts";
import { appBanner, appButton, appField, appIcon, appStamp } from "./ui.ts";
import type { ResolvedAppCopy } from "../../pages/copy.app.ts";
import { fill } from "../../pages/copy.app.ts";

const KIND_ORDER: PaymentKind[] = ["bkash", "nagad", "rocket", "bank", "other"];

export interface MethodEditorOptions {
  copy: ResolvedAppCopy;
  existing?: PaymentMethod | null;
  onSave: (input: PaymentMethodInput) => Promise<void> | void;
  onCancel?: () => void;
  canCancel?: boolean;
}

export interface MethodEditorHandle {
  element: HTMLElement;
  focus: () => void;
  reset: () => void;
}

type DecodeState = "idle" | "reading" | "ok" | "error";

export function renderMethodEditor(ctx: AppContext, options: MethodEditorOptions): MethodEditorHandle {
  const copy = options.copy;
  const existing = options.existing ?? null;
  const editing = Boolean(existing);

  let tab: "qr" | "shot" | "manual" = existing?.qr_payload ? "qr" : "manual";
  let kind: PaymentKind = existing?.kind ?? "bkash";
  let label = existing?.label ?? "";
  let account = existing?.account_number ?? "";
  let holder = existing?.account_holder ?? "";
  let bank = existing?.bank_name ?? "";
  let branch = existing?.branch ?? "";
  let routing = existing?.routing_number ?? "";
  let qrPayload = existing?.qr_payload ?? "";
  let qrStatus: PaymentQrStatus = existing?.qr_status ?? "none";
  let qrDecoded: QrDecodedSnapshot | null = existing?.qr_decoded ?? null;
  let decodeState: DecodeState = qrPayload && qrStatus !== "none" ? "ok" : "idle";
  let decodeMessage = "";
  let saving = false;

  const root = h("section", { class: "app-method-editor", attrs: { "aria-labelledby": "method-editor-title" } });
  const bannerSlot = h("div", { class: "app-method-editor__banner" });
  const title = h("h3", {
    class: "app-section-head__title",
    id: "method-editor-title",
    text: editing ? copy.edit : copy.addMethod,
    attrs: { tabindex: "-1" },
  });

  // ---- tabs --------------------------------------------------------------
  const tabDefs: { id: "qr" | "shot" | "manual"; label: string; icon: string }[] = [
    { id: "qr", label: copy.qrTab, icon: "qr-code-line" },
    { id: "shot", label: copy.shotTab, icon: "image-line" },
    { id: "manual", label: copy.manualTab, icon: "ri-hashtag" },
  ];
  const tabButtons = tabDefs.map((def) =>
    h(
      "button",
      {
        class: "app-seg__button",
        attrs: { type: "button", "aria-pressed": String(def.id === tab) },
      },
      appIcon(def.icon, 16),
      h("span", { text: def.label }),
    ),
  );
  const tabs = h("div", { class: "app-seg", attrs: { role: "group", "aria-label": copy.addMethod } }, ...tabButtons);
  tabButtons.forEach((button, index) => {
    const def = tabDefs[index];
    if (!def) return;
    button.addEventListener("click", () => {
      tab = def.id;
      decodeState = qrPayload && qrStatus !== "none" ? "ok" : "idle";
      sync();
    });
  });

  // ---- kind chips --------------------------------------------------------
  const kindButtons = KIND_ORDER.map((value) =>
    h(
      "button",
      {
        class: "app-chip",
        attrs: { type: "button", "aria-pressed": String(value === kind), "data-kind": value },
        text: ctx.t(`provider.${value}`),
      },
    ),
  );
  const kindRow = h(
    "div",
    { class: "app-chip-row", attrs: { role: "group", "aria-label": copy.methodKind } },
    ...kindButtons,
  );
  kindButtons.forEach((button) => {
    button.addEventListener("click", () => {
      kind = (button.dataset.kind ?? "bkash") as PaymentKind;
      syncKind();
    });
  });

  // ---- fields ------------------------------------------------------------
  const labelField = appField({
    id: "method-label",
    label: copy.methodLabel,
    placeholder: copy.methodLabelPh,
    maxlength: 40,
    value: label,
    onInput: (value) => {
      label = value;
    },
  });
  const accountField = appField({
    id: "method-account",
    label: copy.walletNum,
    inputmode: "numeric",
    value: account,
    onInput: (value) => {
      account = value;
    },
  });
  const holderField = appField({
    id: "method-holder",
    label: copy.accName,
    value: holder,
    onInput: (value) => {
      holder = value;
    },
  });
  const bankNameField = appField({
    id: "method-bank",
    label: copy.bankName,
    value: bank,
    onInput: (value) => {
      bank = value;
    },
  });
  const branchField = appField({
    id: "method-branch",
    label: copy.branch,
    value: branch,
    onInput: (value) => {
      branch = value;
    },
  });
  const routingField = appField({
    id: "method-routing",
    label: copy.routing,
    inputmode: "numeric",
    value: routing,
    onInput: (value) => {
      routing = value;
    },
  });
  const bankFields = h("div", { class: "app-form-grid", attrs: { hidden: true } }, bankNameField.wrap, branchField.wrap, routingField.wrap);
  const accountNameWrap = holderField.wrap;

  // ---- QR paste ----------------------------------------------------------
  const pasteArea = h("div", { class: "app-method-editor__area" });
  const payloadField = appField({
    id: "method-payload",
    label: copy.qrPasteL,
    placeholder: copy.qrPastePh,
    multiline: true,
    rows: 4,
    mono: true,
    spellcheck: false,
    value: qrPayload,
    onInput: (value) => {
      qrPayload = value.trim();
      if (decodeState !== "reading") {
        decodeState = qrPayload && qrStatus !== "none" ? "ok" : "idle";
        syncDecode();
      }
    },
  });
  const readButton = appButton({
    label: copy.decode,
    variant: "secondary",
    size: "sm",
    icon: "qr-code-line",
    onClick: () => {
      const payload = payloadField.input.value.trim();
      if (!payload) {
        payloadField.setError(copy.decodeEmpty);
        return;
      }
      payloadField.setError(null);
      applyClassification(payload);
      sync();
    },
  });
  pasteArea.append(payloadField.wrap, h("div", { class: "app-method-editor__inline" }, readButton));

  // ---- screenshot --------------------------------------------------------
  const shotArea = h("div", { class: "app-method-editor__area", attrs: { hidden: true } });
  const fileInput = h("input", {
    class: "app-sr",
    id: "method-shot",
    attrs: { type: "file", accept: "image/png,image/jpeg,image/webp" },
  });
  const fileLabel = h(
    "label",
    { class: "app-drop", attrs: { for: "method-shot" } },
    h("span", { class: "app-drop__icon", html: '<i class="ri-image-line ri" aria-hidden="true"></i>' }),
    h("span", { class: "app-drop__title", text: copy.shotBtn }),
    h("span", { class: "app-drop__hint", text: copy.shotTypes }),
  );
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    decodeState = "reading";
    decodeMessage = copy.decoding;
    syncDecode();
    void import("../../lib/qr-image.ts")
      .then((module) => module.decodeQrImageFile(file))
      .then((result) => {
        if (!result.ok || !result.payload) {
          decodeState = "error";
          decodeMessage = result.error === "too_large" ? copy.decodeImageLarge : copy.decodeImageFailed;
          syncDecode();
          sync();
          return;
        }
        payloadField.input.value = result.payload;
        applyClassification(result.payload);
        sync();
      })
      .catch(() => {
        decodeState = "error";
        decodeMessage = copy.decodeImageFailed;
        syncDecode();
      });
  });
  shotArea.append(
    fileLabel,
    fileInput,
    h("p", { class: "app-field__helper", text: copy.shotHelp }),
  );

  // ---- manual ------------------------------------------------------------
  const manualArea = h(
    "div",
    { class: "app-method-editor__area" },
    kindRow,
    h("div", { class: "app-form-grid" }, accountField.wrap, accountNameWrap),
    bankFields,
    h("p", { class: "app-field__helper", text: copy.manualHint }),
  );

  // ---- decode result -----------------------------------------------------
  const decodeCard = h("div", { class: "app-method-editor__decode" });

  // ---- save row ----------------------------------------------------------
  const saveButton = appButton({
    label: copy.addQr,
    variant: "primary",
    icon: "check-line",
    onClick: () => void save(saveButton),
  });
  const cancelButton = options.canCancel !== false && options.onCancel
    ? appButton({ label: copy.cancel, variant: "ghost", onClick: options.onCancel })
    : null;
  const actions = h("div", { class: "app-method-editor__actions" }, cancelButton, saveButton);

  root.append(title, h("p", { class: "app-field__helper", text: ctx.t("honesty.creatorNote") }), tabs, bannerSlot, pasteArea, shotArea, manualArea, decodeCard, labelField.wrap, actions);

  // ---- behaviour ---------------------------------------------------------
  function syncKind(): void {
    for (const button of kindButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.kind === kind));
    }
    bankFields.hidden = kind !== "bank";
    accountField.wrap.hidden = false;
    accountField.wrap.querySelector("label")?.replaceChildren(document.createTextNode(kind === "bank" ? copy.accNum : copy.walletNum));
    accountNameWrap.hidden = false;
  }

  function syncDecode(): void {
    decodeCard.replaceChildren();
    if (decodeState === "idle") {
      decodeCard.hidden = true;
      return;
    }
    decodeCard.hidden = false;
    if (decodeState === "reading") {
      decodeCard.append(appBanner({ tone: "info", body: decodeMessage || copy.decoding, role: "status" }));
      return;
    }
    if (decodeState === "error") {
      decodeCard.append(appBanner({ tone: "error", body: decodeMessage || copy.decodeFailed }));
      return;
    }
    const verified = qrStatus === "verified";
    const stamp =
      qrStatus === "verified"
        ? appStamp({ label: copy.stampQrVerified, tone: "confirmed", icon: "checkbox-circle-line" })
        : qrStatus === "unverified"
          ? appStamp({ label: copy.stampQrUnverified, tone: "self", icon: "information-line" })
          : appStamp({ label: copy.stampManual, tone: "outline" });
    const details = h("dl", { class: "app-kv" });
    if (qrDecoded) {
      details.append(
        h("dt", { text: copy.nameInQrL }),
        h("dd", { text: qrDecoded.merchant_name }),
        h("dt", { text: copy.cityL }),
        h("dd", { text: qrDecoded.merchant_city ?? "—" }),
        h("dt", { text: copy.checksumL }),
        h("dd", { class: "app-mono", text: copy.checksumOk }),
      );
    }
    decodeCard.append(
      h(
        "div",
        { class: "app-method-editor__result", attrs: { role: "status" } },
        h("div", { class: "app-method-editor__result-head" }, stamp, h("span", { class: "app-field__helper", text: verified ? copy.qrReadVerified : copy.qrReadUnverified })),
        details,
        h("p", { class: "app-field__helper", text: verified ? copy.qrVerifiedNote : copy.qrUnverifiedNote }),
        h("p", { class: "app-field__helper", text: copy.manualHint }),
      ),
    );
  }

  function applyClassification(payload: string): void {
    qrPayload = payload;
    const classification = classifyPayload(payload);
    if (!classification.ok) {
      qrStatus = "none";
      qrDecoded = null;
      decodeState = "error";
      decodeMessage = copy.decodeFailed;
      return;
    }
    qrStatus = classification.status;
    qrDecoded = classification.decoded;
    decodeState = "ok";
    decodeMessage = "";
    if (classification.status === "verified") kind = "bkash";
    if (!label.trim() && classification.merchantName) {
      label = `${ctx.t(`provider.${kind}`)} QR`;
      labelField.input.value = label;
    }
    syncKind();
  }

  function sync(): void {
    tabButtons.forEach((button, index) => {
      const def = tabDefs[index];
      if (def) button.setAttribute("aria-pressed", String(def.id === tab));
    });
    pasteArea.hidden = tab !== "qr";
    shotArea.hidden = tab !== "shot";
    manualArea.hidden = tab !== "manual";
    const saveText = saveButton.querySelector(".app-btn__label");
    if (saveText) saveText.textContent = tab === "manual" ? copy.add : editing ? copy.save : copy.addQr;
    syncDecode();
  }

  async function save(button: HTMLButtonElement): Promise<void> {
    if (saving) return;
    bannerSlot.replaceChildren();
    const errors: HTMLElement[] = [];
    for (const field of [labelField, accountField, bankNameField, routingField]) field.setError(null);

    if (tab === "manual" || tab === "qr" || tab === "shot") {
      if (!label.trim()) {
        const derived = `${ctx.t(`provider.${kind}`)}${kind === "bank" ? "" : " " + copy.walletNum}`;
        label = derived;
        labelField.input.value = label;
      }
    }
    if (tab !== "manual") {
      if (!qrPayload || qrStatus === "none") {
        decodeState = "error";
        decodeMessage = copy.decodeFailed;
        syncDecode();
        return;
      }
    }

    const validation = validatePaymentMethod({
      kind,
      label,
      account_number: account.trim() || null,
      account_holder: holder.trim() || null,
      bank_name: kind === "bank" ? bank.trim() : null,
      branch: kind === "bank" ? branch.trim() : null,
      routing_number: kind === "bank" ? routing.trim() : null,
      qr_payload: tab === "manual" ? null : qrPayload || null,
    });
    if (!validation.ok) {
      const issue = validation.issues[0];
      if (issue?.field === "label") labelField.setError(copy.required);
      if (issue?.field === "account") accountField.setError(kind === "bank" ? copy.addErrBank : copy.addErrNumber);
      if (issue?.field === "routing") routingField.setError(copy.addErrBank);
      if (issue?.field === "bank") bankNameField.setError(copy.addErrBank);
      if (issue?.field === "evidence") accountField.setError(copy.addErrNumber);
      const first = [labelField, accountField, bankNameField, routingField].find((field) => field.wrap.classList.contains("app-field--error"));
      first?.input.focus();
      void errors;
      return;
    }

    const input: PaymentMethodInput = {
      id: existing?.id,
      creator_id: existing?.creator_id ?? "",
      kind,
      label: label.trim(),
      account_number: account.trim() || null,
      account_holder: holder.trim() || null,
      bank_name: kind === "bank" ? bank.trim() : null,
      branch: kind === "bank" ? branch.trim() : null,
      routing_number: kind === "bank" ? routing.trim() : null,
      qr_payload: tab === "manual" ? null : qrPayload || null,
      qr_status: tab === "manual" ? "none" : qrStatus,
      qr_decoded: tab === "manual" ? null : qrDecoded,
      enabled: existing?.enabled ?? true,
    };

    saving = true;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    const text = button.querySelector(".app-btn__label");
    if (text) text.textContent = copy.saving;
    try {
      await options.onSave(input);
      toast(editing ? copy.methodSaved : copy.addQr);
    } catch (error) {
      bannerSlot.replaceChildren(appBanner({ tone: "error", body: messageForError(ctx, error) }));
    } finally {
      saving = false;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      if (text) text.textContent = tab === "manual" ? copy.add : editing ? copy.save : copy.addQr;
    }
  }

  function reset(): void {
    tab = "manual";
    kind = "bkash";
    label = "";
    account = "";
    holder = "";
    bank = "";
    branch = "";
    routing = "";
    qrPayload = "";
    qrStatus = "none";
    qrDecoded = null;
    decodeState = "idle";
    decodeMessage = "";
    labelField.input.value = "";
    accountField.input.value = "";
    holderField.input.value = "";
    bankNameField.input.value = "";
    branchField.input.value = "";
    routingField.input.value = "";
    payloadField.input.value = "";
    fileInput.value = "";
    for (const field of [labelField, accountField, bankNameField, routingField]) field.setError(null);
    kindButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.kind === "bkash")));
    bannerSlot.replaceChildren();
    syncKind();
    sync();
    saveButton.focus();
  }

  syncKind();
  sync();

  return {
    element: root,
    focus: () => {
      title.setAttribute("tabindex", "-1");
      title.focus();
    },
    reset,
  };
}
