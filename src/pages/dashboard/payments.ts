/**
 * `/dashboard/payments` — add / edit / enable / disable / reorder / delete the
 * creator's own payment methods, with honest decode-status labels. Chanasta never
 * sets `verified` client-side: it shows what the engine decoded.
 */
import { h, openDialog, toast } from "../../lib/dom.ts";
import { formatDate } from "../../lib/format.ts";
import { messageForError } from "../../lib/messages.ts";
import { classifyPayload } from "../../lib/qr-payload.ts";
import { validatePaymentMethod } from "../../lib/validate.ts";
import type { AppContext } from "../../lib/app.ts";
import type { PaymentKind, PaymentMethod, PaymentQrStatus, QrDecodedSnapshot } from "../../lib/types.ts";
import { icon } from "../../components/icons.ts";
import { badge, button, emptyState, qrStatusBadge, selectField, textField } from "../../components/ui.ts";
import { dashboardHeading, dashboardPage, loadMethods, loadOwnData, noPageContent } from "./common.ts";

interface EditorState {
  mode: "add" | "edit";
  method: PaymentMethod | null;
}

const KIND_CHOICES: { value: PaymentKind; labelKey: string }[] = [
  { value: "bkash", labelKey: "provider.bkash" },
  { value: "nagad", labelKey: "provider.nagad" },
  { value: "rocket", labelKey: "provider.rocket" },
  { value: "bank", labelKey: "provider.bank" },
  { value: "other", labelKey: "provider.other" },
];

export async function renderDashboardPayments(ctx: AppContext): Promise<HTMLElement> {
  const own = await loadOwnData(ctx);
  if (!own.creator) {
    return dashboardPage(ctx, { active: "payments", creator: null, signedIn: own.signedIn, content: noPageContent(ctx) });
  }
  const creator = own.creator;
  const methods = await loadMethods(ctx, creator);
  let editor: EditorState | null = null;

  const pageRoot = h("div", {});
  const render = () => {
    pageRoot.replaceChildren();
    const bannerSlot = h("div", { class: "banner-slot" });

    const addButton = button({
      label: ctx.t("dashboard.payments.add"),
      variant: "primary",
      size: "sm",
      icon: "plus",
      disabled: methods.length >= 8 && editor === null,
      onClick: () => {
        editor = { mode: "add", method: null };
        render();
      },
    });

    pageRoot.append(
      dashboardHeading(ctx, ctx.t("dashboard.payments.title"), ctx.t("dashboard.payments.desc"), [addButton]),
      h(
        "div",
        { class: "dash-panel" },
        editor ? editorPanel(editor) : null,
        methods.length === 0 && !editor
          ? emptyState({
              icon: "card",
              title: ctx.t("dashboard.payments.empty"),
              action: button({
                label: ctx.t("dashboard.payments.add"),
                variant: "primary",
                size: "sm",
                icon: "plus",
                onClick: () => {
                  editor = { mode: "add", method: null };
                  render();
                },
              }),
            })
          : h(
              "ul",
              { class: "method-list" },
              ...methods.map((method, index) => methodRow(method, index)),
            ),
        methods.length >= 8
          ? h("p", { class: "field__helper", text: ctx.t("dashboard.payments.limit") })
          : null,
        h(
          "p",
          { class: "dash-hint" },
          h("span", { html: icon("info", 14) }),
          ctx.t("honesty.creatorNote"),
        ),
      ),
    );

    function methodRow(method: PaymentMethod, index: number): HTMLElement {
      const enabledSwitch = h(
        "button",
        {
          class: `switch${method.enabled ? " switch--on" : ""}`,
          attrs: {
            type: "button",
            role: "switch",
            "aria-checked": String(method.enabled),
            "aria-label": `${method.enabled ? ctx.t("dashboard.payments.enabled") : ctx.t("dashboard.payments.disabled")} — ${method.label}`,
          },
        },
        h("span", { class: "switch__track", attrs: { "aria-hidden": "true" } }, h("span", { class: "switch__thumb" })),
        h("span", { class: "switch__label", text: method.enabled ? ctx.t("dashboard.payments.enabled") : ctx.t("dashboard.payments.disabled") }),
      );
      enabledSwitch.addEventListener("click", () => {
        void ctx.data
          .savePaymentMethod({
            ...method,
            id: method.id,
            creator_id: creator.id,
            enabled: !method.enabled,
            qr_payload: method.qr_payload,
            qr_status: method.qr_status,
            qr_decoded: method.qr_decoded,
            account_number: method.account_number,
            bank_name: method.bank_name,
            routing_number: method.routing_number,
            sort_order: method.sort_order,
          })
          .then(() => {
            toast(ctx.t("common.saved"));
            ctx.refresh();
          })
          .catch((error: unknown) => {
            bannerSlot.replaceChildren(h("p", { class: "inline-banner inline-banner--error", attrs: { role: "alert" }, text: messageForError(ctx, error) }));
          });
      });

      const move = (delta: number) => {
        const next = methods.slice();
        const target = next[index + delta];
        if (!target) return;
        next[index + delta] = next[index] as PaymentMethod;
        next[index] = target;
        void ctx.data
          .reorderPaymentMethods(next.map((entry) => entry.id))
          .then(() => ctx.refresh())
          .catch((error: unknown) => toast(messageForError(ctx, error)));
      };

      return h(
        "li",
        { class: `method-row${method.enabled ? "" : " method-row--disabled"}` },
        h(
          "div",
          { class: "method-row__main" },
          h(
            "div",
            { class: "method-row__identity" },
            h("span", { class: "method-row__provider", text: ctx.t(`provider.${method.kind}`) }),
            h("span", { class: "method-row__label", text: method.label }),
          ),
          h("div", { class: "method-row__badges" },
            qrStatusBadge(ctx, method.qr_status, method.kind),
            method.enabled ? null : badge({ label: ctx.t("dashboard.payments.disabled"), variant: "neutral" }),
          ),
          h(
            "p",
            { class: "method-row__account", attrs: { dir: "ltr" } },
            method.account_number ?? "",
          ),
          h("p", { class: "method-row__meta", text: ctx.t("dashboard.payments.updated", { date: formatDate(ctx.lang, method.updated_at) }) }),
        ),
        h(
          "div",
          { class: "method-row__actions" },
          enabledSwitch,
          button({ label: "", ariaLabel: ctx.t("dashboard.payments.moveUp"), variant: "ghost", size: "sm", icon: "arrowUp", disabled: index === 0, onClick: () => move(-1) }),
          button({ label: "", ariaLabel: ctx.t("dashboard.payments.moveDown"), variant: "ghost", size: "sm", icon: "arrowDown", disabled: index === methods.length - 1, onClick: () => move(1) }),
          button({
            label: ctx.t("dashboard.payments.edit"),
            variant: "secondary",
            size: "sm",
            icon: "edit",
            onClick: () => {
              editor = { mode: "edit", method };
              render();
            },
          }),
          button({
            label: ctx.t("dashboard.payments.delete"),
            variant: "ghost",
            size: "sm",
            icon: "trash",
            onClick: () => {
              void openDialog({
                title: ctx.t("dashboard.payments.deleteTitle"),
                description: ctx.t("dashboard.payments.deleteBody"),
                destructive: true,
                actions: [
                  { id: "cancel", label: ctx.t("common.cancel"), variant: "secondary" },
                  { id: "delete", label: ctx.t("dashboard.payments.delete"), variant: "danger" },
                ],
              }).then((action) => {
                if (action !== "delete") return;
                void ctx.data
                  .deletePaymentMethod(method.id)
                  .then(() => {
                    toast(ctx.t("dashboard.payments.deletedToast"));
                    ctx.refresh();
                  })
                  .catch((error: unknown) => toast(messageForError(ctx, error)));
              });
            },
          }),
        ),
      );
    }

    function editorPanel(current: EditorState): HTMLElement {
      const existing = current.method;
      const state: {
        kind: PaymentKind;
        qrPayload: string;
        qrStatus: PaymentQrStatus;
        qrDecoded: QrDecodedSnapshot | null;
        decodeMessage: string;
        decodeTone: "ok" | "warn" | "error" | "idle";
      } = {
        kind: existing?.kind ?? "bkash",
        qrPayload: existing?.qr_payload ?? "",
        qrStatus: existing?.qr_status ?? "none",
        qrDecoded: existing?.qr_decoded ?? null,
        decodeMessage: ctx.t("onboarding.payment.decode.idle"),
        decodeTone: "idle",
      };

      const heading = h("h2", { class: "form-section__title", text: existing ? ctx.t("dashboard.payments.edit") : ctx.t("dashboard.payments.add"), attrs: { tabindex: "-1" } });
      const kindField = selectField(ctx.lang, {
        id: "method-kind",
        label: ctx.t("onboarding.payment.kind"),
        choices: KIND_CHOICES.map((choice) => ({ value: choice.value, label: ctx.t(choice.labelKey) })),
        value: state.kind,
      });
      const labelField = textField(ctx.lang, {
        id: "method-label",
        label: ctx.t("onboarding.payment.label"),
        value: existing?.label ?? "" ,
        placeholder: ctx.t("onboarding.payment.labelPlaceholder"),
        maxlength: 40,
        required: true,
      });
      const accountField = textField(ctx.lang, {
        id: "method-account",
        label: ctx.t("onboarding.payment.account"),
        value: existing?.account_number ?? "",
        inputmode: "numeric",
        mono: true,
      });
      const holderField = textField(ctx.lang, {
        id: "method-holder",
        label: ctx.t("onboarding.payment.holder"),
        value: existing?.account_holder ?? "",
      });
      const bankField = textField(ctx.lang, {
        id: "method-bank",
        label: ctx.t("onboarding.payment.bank"),
        value: existing?.bank_name ?? "",
      });
      const branchField = textField(ctx.lang, {
        id: "method-branch",
        label: ctx.t("onboarding.payment.branch"),
        value: existing?.branch ?? "",
      });
      const routingField = textField(ctx.lang, {
        id: "method-routing",
        label: ctx.t("onboarding.payment.routing"),
        value: existing?.routing_number ?? "",
        inputmode: "numeric",
      });

      const bankSection = h(
        "div",
        { class: "form-grid", attrs: { hidden: state.kind !== "bank" } },
        bankField.wrap,
        branchField.wrap,
        routingField.wrap,
      );
      kindField.input.addEventListener("change", () => {
        state.kind = kindField.input.value as PaymentKind;
        bankSection.hidden = state.kind !== "bank";
      });

      // QR paste / upload
      const qrInput = h("textarea", {
        class: "field__control field__control--area field__control--mono",
        id: "method-qr",
        attrs: { rows: 4, placeholder: ctx.t("onboarding.payment.pastePlaceholder"), spellcheck: "false" },
      });
      qrInput.value = state.qrPayload;
      const decodeStatus = h("p", { class: `decode-status decode-status--${state.decodeTone}`, attrs: { "aria-live": "polite" } }, state.decodeMessage);
      const merchantLine = h("p", { class: "decode-merchant", attrs: { hidden: true } });
      const qrSection = h(
        "div",
        { class: "form-section" },
        h("h3", { class: "form-section__title", text: ctx.t("onboarding.payment.qrTab") }),
        h("label", { class: "field__label", attrs: { for: "method-qr" }, text: ctx.t("onboarding.payment.pasteLabel") }),
        qrInput,
        decodeStatus,
        merchantLine,
        h(
          "div",
          { class: "upload-row" },
          h("label", { class: "btn btn--secondary btn--sm", attrs: { for: "method-qr-file" } },
            h("span", { class: "btn__icon", html: icon("image", 18) }),
            h("span", { class: "btn__label", text: ctx.t("onboarding.payment.uploadLabel") }),
          ),
          h("input", {
            id: "method-qr-file",
            class: "sr-only",
            attrs: { type: "file", accept: "image/png,image/jpeg,image/webp" },
          }),
          h("span", { class: "field__helper", text: ctx.t("onboarding.payment.uploadTypes") }),
        ),
      );

      const applyClassification = (payload: string) => {
        const classification = classifyPayload(payload);
        if (!classification.ok) {
          state.qrPayload = payload;
          state.qrStatus = "none";
          state.qrDecoded = null;
          decodeStatus.className = "decode-status decode-status--error";
          decodeStatus.textContent = ctx.t("onboarding.payment.decode.failed");
          merchantLine.hidden = true;
          return;
        }
        state.qrPayload = payload;
        state.qrStatus = classification.status;
        state.qrDecoded = classification.decoded;
        decodeStatus.className = `decode-status decode-status--${classification.status === "verified" ? "ok" : "warn"}`;
        decodeStatus.textContent = ctx.t(
          classification.status === "verified" ? "onboarding.payment.decode.verified" : "onboarding.payment.decode.unverified",
        );
        merchantLine.hidden = false;
        merchantLine.textContent = `${classification.merchantName ?? ""} — ${ctx.t("onboarding.payment.merchant")}`;
      };

      let decodeTimer = 0;
      qrInput.addEventListener("input", () => {
        state.qrPayload = qrInput.value.trim();
        window.clearTimeout(decodeTimer);
        if (!state.qrPayload) {
          state.qrStatus = "none";
          state.qrDecoded = null;
          decodeStatus.className = "decode-status decode-status--idle";
          decodeStatus.textContent = ctx.t("onboarding.payment.decode.idle");
          merchantLine.hidden = true;
          return;
        }
        decodeStatus.className = "decode-status decode-status--idle";
        decodeStatus.textContent = ctx.t("onboarding.payment.decode.reading");
        decodeTimer = window.setTimeout(() => applyClassification(state.qrPayload), 250);
      });

      const fileInput = qrSection.querySelector<HTMLInputElement>("#method-qr-file");
      fileInput?.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        decodeStatus.className = "decode-status decode-status--idle";
        decodeStatus.textContent = ctx.t("onboarding.payment.decode.reading");
        void import("../../lib/qr-image.ts")
          .then((module) => module.decodeQrImageFile(file))
          .then((result) => {
            if (!result.ok || !result.payload) {
              decodeStatus.className = "decode-status decode-status--error";
              decodeStatus.textContent =
                result.error === "too_large" ? ctx.t("onboarding.payment.decode.tooLarge") : ctx.t("onboarding.payment.decode.failed");
              return;
            }
            qrInput.value = result.payload;
            applyClassification(result.payload);
          })
          .catch(() => {
            decodeStatus.className = "decode-status decode-status--error";
            decodeStatus.textContent = ctx.t("onboarding.payment.decode.failed");
          });
      });

      const save = button({
        label: ctx.t("onboarding.payment.save"),
        variant: "primary",
        onClick: () => {
          const account = accountField.input.value.trim();
          const validation = validatePaymentMethod({
            kind: state.kind,
            label: labelField.input.value,
            account_number: account || null,
            account_holder: holderField.input.value,
            bank_name: bankField.input.value,
            routing_number: routingField.input.value,
            qr_payload: state.qrPayload || null,
          });
          if (!validation.ok) {
            const issue = validation.issues[0];
            const message = ctx.t("claim.form.error.invalid");
            if (issue?.field === "label") labelField.setError(message);
            if (issue?.field === "account") accountField.setError(message);
            if (issue?.field === "routing") routingField.setError(message);
            if (issue?.field === "evidence") {
              decodeStatus.className = "decode-status decode-status--error";
              decodeStatus.textContent = ctx.t("claim.form.error.invalid");
            }
            return;
          }
          if (state.qrPayload && state.qrStatus === "none") {
            decodeStatus.className = "decode-status decode-status--error";
            decodeStatus.textContent = ctx.t("onboarding.payment.decode.failed");
            return;
          }
          const payload = {
            id: existing?.id,
            creator_id: creator.id,
            kind: state.kind,
            label: labelField.input.value.trim(),
            account_number: account || null,
            account_holder: holderField.input.value.trim() || null,
            bank_name: state.kind === "bank" ? bankField.input.value.trim() : null,
            branch: state.kind === "bank" ? branchField.input.value.trim() : null,
            routing_number: state.kind === "bank" ? routingField.input.value.trim() : null,
            qr_payload: state.qrPayload || null,
            qr_status: state.qrStatus,
            qr_decoded: state.qrDecoded,
            sort_order: existing?.sort_order ?? methods.length,
            enabled: existing?.enabled ?? true,
          };
          void ctx.data
            .savePaymentMethod(payload)
            .then(() => {
              toast(ctx.t("onboarding.payment.saved"));
              editor = null;
              ctx.refresh();
            })
            .catch((error: unknown) => {
              decodeStatus.className = "decode-status decode-status--error";
              decodeStatus.textContent = messageForError(ctx, error);
            });
        },
      });
      const cancel = button({
        label: ctx.t("common.cancel"),
        variant: "secondary",
        onClick: () => {
          editor = null;
          render();
        },
      });

      return h(
        "div",
        { class: "method-editor" },
        heading,
        h("p", { class: "field__helper", text: ctx.t("honesty.creatorNote") }),
        kindField.wrap,
        labelField.wrap,
        h("div", { class: "form-grid" }, accountField.wrap, holderField.wrap),
        bankSection,
        qrSection,
        h("div", { class: "method-editor__actions" }, cancel, save),
      );
    }
  };

  render();

  return dashboardPage(ctx, { active: "payments", creator, signedIn: own.signedIn, content: pageRoot });
}
