/**
 * Claim cards (public + dashboard) and the inline "I sent it" form.
 *
 * A claim is a message, not a receipt: every card carries the স্ব-ঘোষিত /
 * Self-reported badge or the ক্রিয়েটর নিশ্চিত করেছেন / Creator confirmed badge.
 * TxID is rendered only in the owner's dashboard details region.
 */
import { h, announce } from "../lib/dom.ts";
import { amountSpeech, formatDateTime, formatTaka, relativeDate, relativeTimeTag } from "../lib/format.ts";
import { parseTaka, validateClaim } from "../lib/validate.ts";
import { isDataError } from "../lib/errors.ts";
import { messageForError } from "../lib/messages.ts";
import { saveClaimContext } from "../lib/prefs.ts";
import type { AppContext } from "../lib/app.ts";
import { cx } from "../lib/app.ts";
import type { ClaimResult, PaymentMethod, ReviewAction, SupportClaim } from "../lib/types.ts";
import { icon } from "./icons.ts";
import {
  button,
  checkboxField,
  claimStatusBadge,
  copyField,
  disclosure,
  selectField,
  textField,
} from "./ui.ts";

export function claimMethodLabel(ctx: AppContext, claim: SupportClaim): string {
  if (!claim.method_kind) return "";
  return ctx.t(`claim.method.${claim.method_kind}`);
}

function claimName(ctx: AppContext, claim: SupportClaim): string {
  return claim.supporter_name?.trim() || ctx.t("claim.anonymous");
}

// ---- public card ----------------------------------------------------------

export function renderClaimCard(ctx: AppContext, claim: SupportClaim): HTMLElement {
  const titleId = `claim-${claim.id}`;
  const badge = claimStatusBadge(ctx, claim.status);
  const meta = [claimMethodLabel(ctx, claim), relativeDate(ctx.lang, claim.created_at)].filter(Boolean).join(" · ");
  const ariaSummary =
    ctx.lang === "bn"
      ? `${ctx.t("claim.badge.selfReported")}: ${amountSpeech(claim.amount_bdt, "bn")}, ${claimName(ctx, claim)}, ${relativeDate("bn", claim.created_at)}, ${claimMethodLabel(ctx, claim)}`
      : `${ctx.t("claim.badge.selfReported")}: ৳${claim.amount_bdt}, ${claimName(ctx, claim)}, ${relativeDate("en", claim.created_at)}, ${claimMethodLabel(ctx, claim)}`;

  return h(
    "article",
    { class: "claim-card", attrs: { "aria-labelledby": titleId } },
    h(
      "header",
      { class: "claim-card__head" },
      h("p", { class: "claim-card__amount", attrs: { dir: "ltr" } }, formatTaka(claim.amount_bdt)),
      badge,
      h("span", { class: "sr-only", text: ariaSummary, id: titleId }),
    ),
    h("p", { class: "claim-card__name", text: claimName(ctx, claim) }),
    claim.message
      ? h("blockquote", { class: "claim-card__message" }, h("p", { text: claim.message }))
      : null,
    h(
      "p",
      { class: "claim-card__meta" },
      claimMethodLabel(ctx, claim) ? h("span", { text: claimMethodLabel(ctx, claim) }) : null,
      claimMethodLabel(ctx, claim) ? " · " : null,
      h("time", {
        attrs: { datetime: relativeTimeTag(claim.created_at) },
        text: relativeDate(ctx.lang, claim.created_at),
      }),
    ),
  );
}

// ---- dashboard card -------------------------------------------------------

export interface ReviewHandlers {
  onReview: (claim: SupportClaim, action: ReviewAction) => void;
}

export function renderDashboardClaimCard(
  ctx: AppContext,
  claim: SupportClaim,
  handlers: ReviewHandlers,
): HTMLElement {
  const titleId = `dclaim-${claim.id}`;
  const detailsId = `dclaim-details-${claim.id}`;
  const isNew = claim.status === "unverified";
  const badge = claimStatusBadge(ctx, claim.status);
  const actions = h("div", { class: "claim-card__actions" });

  if (claim.status === "unverified") {
    actions.append(
      button({
        label: ctx.t("dashboard.confirm"),
        variant: "primary",
        size: "sm",
        ariaLabel: ctx.t("dashboard.confirm.sr", { amount: formatTaka(claim.amount_bdt) }),
        onClick: () => handlers.onReview(claim, "confirm"),
      }),
    );
  }
  if (claim.status === "unverified" || claim.status === "confirmed") {
    actions.append(
      button({
        label: ctx.t("dashboard.hide"),
        variant: "secondary",
        size: "sm",
        ariaLabel: `${ctx.t("dashboard.hide")} — ${formatTaka(claim.amount_bdt)}`,
        onClick: () => handlers.onReview(claim, "hide"),
      }),
    );
  }
  if (claim.status === "hidden") {
    actions.append(
      button({
        label: ctx.t("dashboard.restore"),
        variant: "secondary",
        size: "sm",
        ariaLabel: `${ctx.t("dashboard.restore")} — ${formatTaka(claim.amount_bdt)}`,
        onClick: () => handlers.onReview(claim, "restore"),
      }),
    );
  }

  const detailsPanel = h("div", { class: "claim-card__details", id: detailsId, attrs: { hidden: true } });
  const detailsList = h(
    "dl",
    { class: "claim-details" },
    h("dt", { text: ctx.t("dashboard.table.date") }),
    h("dd", {}, h("time", { attrs: { datetime: relativeTimeTag(claim.created_at) }, text: formatDateTime(ctx.lang, claim.created_at) })),
  );
  if (claim.method_kind) {
    detailsList.append(
      h("dt", { text: ctx.t("dashboard.table.method") }),
      h("dd", { text: claimMethodLabel(ctx, claim) }),
    );
  }
  detailsPanel.append(detailsList);
  if (claim.txid) {
    detailsPanel.append(
      h("div", { class: "claim-card__txid" },
        h("span", { class: "claim-card__txid-label", text: ctx.t("dashboard.txid") }),
        copyField(ctx, { value: claim.txid, mask: false, mono: true }),
        h("p", { class: "field__helper", text: `${ctx.t("dashboard.txidPrivate")} ${ctx.t("claim.form.txidHelper")}` }),
      ),
    );
  }
  if (claim.status === "unverified" || claim.status === "confirmed") {
    detailsPanel.append(h("p", { class: "claim-card__warning", text: ctx.t("dashboard.removeWarning") }));
  }
  if (claim.status === "rejected") {
    detailsPanel.append(h("p", { class: "claim-card__warning", text: ctx.t("dashboard.removeWarning") }));
  }

  const detailsButton =
    claim.status !== "rejected"
      ? h(
          "button",
          {
            class: "btn btn--ghost btn--sm",
            attrs: { type: "button", "aria-expanded": "false", "aria-controls": detailsId },
          },
          h("span", { class: "btn__icon", html: icon("chevronDown", 16) }),
          h("span", { class: "btn__label", text: ctx.t("dashboard.details") }),
        )
      : null;
  detailsButton?.addEventListener("click", () => {
    const expanded = detailsButton.getAttribute("aria-expanded") === "true";
    detailsButton.setAttribute("aria-expanded", String(!expanded));
    detailsPanel.hidden = expanded;
  });

  return h(
    "article",
    { class: cx("claim-card", "claim-card--dashboard", `claim-card--${claim.status}`), attrs: { "aria-labelledby": titleId } },
    h(
      "header",
      { class: "claim-card__head" },
      h("p", { class: "claim-card__amount", attrs: { dir: "ltr" } }, formatTaka(claim.amount_bdt)),
      badge,
      isNew ? h("span", { class: "claim-card__new" }, h("span", { class: "new-dot", attrs: { "aria-hidden": "true" } }), ctx.t("claim.badge.new")) : null,
      h("span", { class: "sr-only", id: titleId, text: `${ctx.t("dashboard.table.caption")} — ${formatTaka(claim.amount_bdt)}` }),
    ),
    h("p", { class: "claim-card__name", text: claimName(ctx, claim) }),
    claim.message ? h("blockquote", { class: "claim-card__message" }, h("p", { text: claim.message })) : null,
    h(
      "p",
      { class: "claim-card__meta" },
      claimMethodLabel(ctx, claim) ? h("span", { text: claimMethodLabel(ctx, claim) }) : null,
      claimMethodLabel(ctx, claim) ? " · " : null,
      h("time", { attrs: { datetime: relativeTimeTag(claim.created_at) }, text: relativeDate(ctx.lang, claim.created_at) }),
    ),
    h("div", { class: "claim-card__action-row" }, actions, detailsButton),
    detailsButton ? detailsPanel : null,
    claim.status === "unverified" ? h("p", { class: "claim-card__helper", text: ctx.t("dashboard.confirmHelper") }) : null,
  );
}

// ---- inline claim form ----------------------------------------------------

export interface ClaimFormOptions {
  creatorSlug: string;
  creatorName: string;
  methods: PaymentMethod[];
  selectedAmount: number | null;
  onSubmitted: (result: ClaimResult, values: { amount: number; methodKind: string | null; name: string | null; message: string | null; methodId: string | null }) => void;
}

export function renderClaimForm(ctx: AppContext, options: ClaimFormOptions): HTMLElement {
  const section = h("section", { class: "claim-form-section", attrs: { "aria-labelledby": "claim-form-title" } });
  const heading = h("h2", {
    class: "section-heading",
    id: "claim-form-title",
    text: ctx.t("claim.form.title"),
    attrs: { tabindex: "-1" },
  });
  const intro = disclosure({ ctx, bnKey: "honesty.claimIntro", enKey: "honesty.claimIntro", variant: "strip" });
  const errorSummary = h("div", {
    class: "form-error-summary",
    attrs: { role: "alert", tabindex: "-1", hidden: true },
  });
  errorSummary.append(h("p", { class: "form-error-summary__title", text: ctx.t("a11y.errorSummary") }));
  const errorList = h("ul", { class: "form-error-summary__list" });
  errorSummary.append(errorList);
  const rateBanner = h("div", {
    class: "inline-banner inline-banner--warn",
    attrs: { role: "alert", hidden: true },
  });
  rateBanner.append(h("span", { html: icon("info", 18) }), h("p", { text: ctx.t("claim.form.rateLimited") }));

  const form = h("form", { class: "claim-form", attrs: { novalidate: true } });

  // Amount
  const amountWrap = h("div", { class: "field" });
  const amountLabel = h("label", { class: "field__label", attrs: { for: "claim-amount" }, text: ctx.t("claim.form.amount") });
  const amountControl = h("div", { class: "amount-input" },
    h("span", { class: "amount-input__prefix", text: "৳", attrs: { "aria-hidden": "true" } }),
    h("input", {
      class: "field__control amount-input__control",
      id: "claim-amount",
      attrs: {
        type: "text",
        inputmode: "numeric",
        autocomplete: "off",
        placeholder: ctx.t("claim.form.amountPlaceholder"),
        "aria-describedby": "claim-amount-helper claim-amount-error",
      },
    }),
  );
  const amountInput = amountControl.querySelector("input") as HTMLInputElement;
  if (options.selectedAmount) amountInput.value = String(options.selectedAmount);
  const amountHelper = h("p", { class: "field__helper", id: "claim-amount-helper", text: ctx.t("claim.form.amountHelper") });
  const amountError = h("p", { class: "field__error", id: "claim-amount-error", attrs: { role: "alert", hidden: true } });
  amountWrap.append(amountLabel, amountControl, amountHelper, amountError);

  // Method
  const methodChoices = options.methods.map((method) => ({
    value: method.id,
    label: `${ctx.t(`provider.${method.kind}`)} — ${method.label}`,
  }));
  methodChoices.push({ value: "other", label: ctx.t("claim.method.other") });
  const methodField = selectField(ctx.lang, {
    id: "claim-method",
    label: ctx.t("claim.form.method"),
    choices: methodChoices,
    value: methodChoices[0]?.value,
  });

  // Name
  const nameField = textField(ctx.lang, {
    id: "claim-name",
    label: ctx.t("claim.form.name"),
    helper: ctx.t("claim.form.nameHelper"),
    placeholder: ctx.t("claim.form.namePlaceholder"),
    maxlength: 40,
    autocomplete: "name",
  });

  // Message with counter
  const messageField = textField(ctx.lang, {
    id: "claim-message",
    label: ctx.t("claim.form.message"),
    placeholder: ctx.t("claim.form.messagePlaceholder"),
    rows: 4,
    maxlength: 280,
  });
  const counter = h("p", { class: "field__counter", attrs: { "aria-live": "polite" }, text: "0/280" });
  messageField.wrap.appendChild(counter);
  const messageInput = messageField.input as HTMLTextAreaElement;
  messageInput.addEventListener("input", () => {
    counter.textContent = `${messageInput.value.length}/280`;
  });

  // TxID (private)
  const txidField = textField(ctx.lang, {
    id: "claim-txid",
    label: ctx.t("claim.form.txid"),
    helper: ctx.t("claim.form.txidHelper"),
    maxlength: 64,
    mono: true,
  });

  // Age acknowledgment
  const ageField = checkboxField(ctx.lang, {
    id: "claim-age",
    label: ctx.t("claim.form.age"),
    required: true,
  });

  // Honeypot (hidden from people, catches naive bots)
  const honeypot = h("div", { class: "honeypot", attrs: { "aria-hidden": "true" } },
    h("label", { attrs: { for: "claim-website" }, text: ctx.t("claim.form.honeypot") }),
    h("input", { id: "claim-website", attrs: { type: "text", tabindex: "-1", autocomplete: "off" } }),
  );

  const privacy = h("p", { class: "claim-form__privacy", text: ctx.t("claim.form.privacy") });
  const submit = button({
    label: ctx.t("claim.form.submit"),
    variant: "primary",
    block: true,
    type: "submit",
  });
  const status = h("p", { class: "sr-only", attrs: { role: "status", "aria-live": "polite" } });

  form.append(errorSummary, rateBanner, amountWrap, methodField.wrap, nameField.wrap, messageField.wrap, txidField.wrap, ageField.wrap, honeypot, privacy, submit, status);
  section.append(heading, intro, form);

  const clearErrors = () => {
    for (const setter of [
      () => {
        amountError.hidden = true;
        amountInput.removeAttribute("aria-invalid");
        amountWrap.classList.remove("field--error");
      },
      () => nameField.setError(null),
      () => messageField.setError(null),
      () => txidField.setError(null),
      () => ageField.setError(null),
    ]) {
      setter();
    }
    errorSummary.hidden = true;
    errorList.replaceChildren();
    rateBanner.hidden = true;
  };

  const addSummaryItem = (label: string, anchor: string) => {
    errorList.append(h("li", {}, h("a", { attrs: { href: `#${anchor}` }, text: label })));
    errorSummary.hidden = false;
    errorSummary.focus();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors();

    const amount = parseTaka(amountInput.value);
    const name = nameField.input.value.trim();
    const message = messageInput.value.trim();
    const txid = txidField.input.value.trim();
    const age = ageField.input.checked;
    const methodId = methodField.input.value;
    const isOther = methodId === "other";
    const method = options.methods.find((entry) => entry.id === methodId) ?? null;

    const validation = validateClaim({
      amount_bdt: amount ?? Number.NaN,
      supporter_name: name || null,
      message: message || null,
      txid: txid || null,
      method_kind: (isOther ? "other" : (method?.kind ?? "other")) as never,
      age_ack: age,
    });

    if (!validation.ok) {
      let firstFocus: HTMLElement | null = null;
      for (const issue of validation.issues) {
        if (issue.field === "amount") {
          const key =
            issue.code === "TOO_LARGE" ? "claim.form.amountError.large" : issue.code === "TOO_SMALL" ? "claim.form.amountError.small" : issue.code === "REQUIRED" ? "claim.form.amountError.required" : "claim.form.amountError.invalid";
          amountError.textContent = ctx.t(key);
          amountError.hidden = false;
          amountInput.setAttribute("aria-invalid", "true");
          amountWrap.classList.add("field--error");
          addSummaryItem(ctx.t("claim.form.amount"), "claim-amount");
          firstFocus ??= amountInput;
        } else if (issue.field === "name") {
          nameField.setError(ctx.t("claim.form.error.tooLong"));
          addSummaryItem(ctx.t("claim.form.name"), "claim-name");
          firstFocus ??= nameField.input;
        } else if (issue.field === "message") {
          messageField.setError(ctx.t("claim.form.error.tooLong"));
          addSummaryItem(ctx.t("claim.form.message"), "claim-message");
          firstFocus ??= messageField.input;
        } else if (issue.field === "txid") {
          txidField.setError(ctx.t("claim.form.error.tooLong"));
          addSummaryItem(ctx.t("claim.form.txid"), "claim-txid");
          firstFocus ??= txidField.input;
        } else if (issue.field === "age") {
          ageField.setError(ctx.t("claim.form.ageError"));
          addSummaryItem(ctx.t("claim.form.age"), "claim-age");
          firstFocus ??= ageField.input;
        }
      }
      firstFocus?.focus();
      return;
    }

    const methodKind = isOther ? "other" : method?.kind ?? null;
    const submitLabel = submit.querySelector(".btn__label");
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    if (submitLabel) submitLabel.textContent = ctx.t("claim.form.sending");
    status.textContent = ctx.t("claim.form.sending");

    void ctx.data
      .submitClaim({
        creator_slug: options.creatorSlug,
        amount_bdt: amount as number,
        supporter_name: name || null,
        message: message || null,
        txid: txid || null,
        method_kind: methodKind as never,
        payment_method_id: isOther ? null : method?.id ?? null,
        age_ack: true,
      })
      .then((result) => {
        saveClaimContext({
          id: result.id,
          creatorSlug: options.creatorSlug,
          creatorName: options.creatorName,
          amount: amount as number,
          methodKind: methodKind as never,
          supporterName: name || null,
          message: message || null,
          status: "unverified",
          createdAt: result.created_at,
        });
        options.onSubmitted(result, {
          amount: amount as number,
          methodKind: methodKind as string | null,
          name: name || null,
          message: message || null,
          methodId: isOther ? null : method?.id ?? null,
        });
      })
      .catch((error: unknown) => {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
        if (submitLabel) submitLabel.textContent = ctx.t("claim.form.submit");
        status.textContent = "";
        if (isDataError(error) && error.code === "RATE_LIMITED") {
          rateBanner.hidden = false;
          rateBanner.focus?.();
          announce(ctx.t("claim.form.rateLimited"));
          return;
        }
        rateBanner.hidden = false;
        const text = rateBanner.querySelector("p");
        if (text) text.textContent = messageForError(ctx, error);
        announce(messageForError(ctx, error));
      });
  });

  return section;
}
