/**
 * UI primitives. All colours/sizes come from design tokens via CSS classes —
 * no raw hex values in TS, no inline styles except one-off layout decisions.
 */
import { h, copyText, toast, announce } from "../lib/dom.ts";
import { amountSpeech, formatTaka, maskNumber, UNITS } from "../lib/format.ts";
import type { ClaimStatus, Lang, PaymentMethod, PaymentQrStatus } from "../lib/types.ts";
import type { AppContext } from "../lib/app.ts";
import { cx } from "../lib/app.ts";
import { icon, steamMark, type IconName } from "./icons.ts";
import { avatarIconClass } from "../lib/avatars.ts";

// ---- buttons / links ------------------------------------------------------

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: IconName;
  iconTrailing?: IconName;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  onClick?: (event: MouseEvent) => void;
}

export function button(options: ButtonOptions): HTMLButtonElement {
  const variant = options.variant ?? "primary";
  const iconMarkup = options.icon
    ? h("span", { class: "btn__icon", html: icon(options.icon, 18) })
    : null;
  const trailing = options.iconTrailing
    ? h("span", { class: "btn__icon", html: icon(options.iconTrailing, 18) })
    : null;
  const spinner = options.loading ? h("span", { class: "btn__icon btn__spinner", html: icon("spinner", 18) }) : null;
  const label = h("span", { class: "btn__label", text: options.loading ? options.label : options.label });
  const element = h(
    "button",
    {
      class: cx("btn", `btn--${variant}`, options.size === "sm" && "btn--sm", options.block && "btn--block"),
      attrs: {
        type: options.type ?? "button",
        disabled: options.disabled || options.loading ? true : null,
        "aria-busy": options.loading ? "true" : null,
        "aria-label": options.ariaLabel ?? null,
      },
      on: options.onClick ? { click: options.onClick as (event: Event) => void } : undefined,
    },
    spinner ?? iconMarkup,
    label,
    trailing,
  );
  return element;
}

export interface LinkButtonOptions {
  href: string;
  label: string;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: IconName;
  iconTrailing?: IconName;
  external?: boolean;
  ariaLabel?: string;
  title?: string;
  onClick?: (event: MouseEvent) => void;
}

export function linkButton(options: LinkButtonOptions): HTMLAnchorElement {
  const variant = options.variant ?? "primary";
  const attrs: Record<string, string | boolean | null> = {
    href: options.href,
    title: options.title ?? null,
    "aria-label": options.ariaLabel ?? null,
  };
  if (options.external) {
    attrs.target = "_blank";
    attrs.rel = "noopener noreferrer";
  } else {
    attrs["data-link"] = true;
  }
  return h(
    "a",
    {
      class: cx("btn", `btn--${variant}`, options.size === "sm" && "btn--sm", options.block && "btn--block"),
      attrs,
      on: options.onClick ? { click: options.onClick as (event: Event) => void } : undefined,
    },
    options.icon ? h("span", { class: "btn__icon", html: icon(options.icon, 18) }) : null,
    h("span", { class: "btn__label", text: options.label }),
    options.iconTrailing ? h("span", { class: "btn__icon", html: icon(options.iconTrailing, 18) }) : null,
    options.external ? h("span", { class: "sr-only", text: " (opens in a new tab)" }) : null,
  );
}

export function externalLink(href: string, label: string, options: { srNewTab?: string } = {}): HTMLAnchorElement {
  return h(
    "a",
    {
      class: "link link--external",
      attrs: { href, target: "_blank", rel: "noopener noreferrer" },
    },
    label,
    h("span", { class: "link__icon", html: icon("external", 12) }),
    options.srNewTab ? h("span", { class: "sr-only", text: ` ${options.srNewTab}` }) : null,
  );
}

// ---- badges ---------------------------------------------------------------

export type BadgeVariant = "neutral" | "selfreported" | "confirmed" | "danger" | "demo";

export function badge(options: {
  label: string;
  variant?: BadgeVariant;
  icon?: IconName;
  srLabel?: string;
}): HTMLSpanElement {
  return h(
    "span",
    { class: cx("badge", `badge--${options.variant ?? "neutral"}`) },
    options.icon ? h("span", { class: "badge__icon", html: icon(options.icon, 12) }) : null,
    h("span", { class: "badge__label", text: options.label }),
  );
}

export function claimStatusBadge(ctx: AppContext, status: ClaimStatus): HTMLSpanElement | null {
  switch (status) {
    case "unverified":
      return badge({ label: ctx.t("claim.badge.selfReported"), variant: "selfreported", icon: "info" });
    case "confirmed":
      return badge({ label: ctx.t("claim.badge.creatorConfirmed"), variant: "confirmed", icon: "checkCircle" });
    case "hidden":
      return badge({ label: ctx.t("claim.badge.hidden"), variant: "neutral", icon: "eyeOff" });
    case "rejected":
      return badge({ label: ctx.t("claim.badge.rejected"), variant: "danger", icon: "warning" });
    default:
      return null;
  }
}

export function qrStatusBadge(ctx: AppContext, status: PaymentQrStatus, kind: PaymentMethod["kind"]): HTMLSpanElement {
  if (status === "verified") {
    return badge({ label: ctx.t("creator.qr.status.verified"), variant: "confirmed", icon: "checkCircle" });
  }
  if (status === "unverified") {
    return badge({ label: ctx.t("creator.qr.status.unverified"), variant: "selfreported", icon: "info" });
  }
  if (status === "image_only") {
    return badge({ label: ctx.t("creator.qr.status.imageOnly"), variant: "neutral", icon: "image" });
  }
  if (kind === "bank") {
    return badge({ label: ctx.t("creator.qr.status.bank"), variant: "neutral", icon: "bank" });
  }
  return badge({ label: ctx.t("creator.qr.status.manual"), variant: "neutral", icon: "hash" });
}

// ---- avatar ---------------------------------------------------------------

export function avatar(value: string, size: "sm" | "md" | "lg" | "xl" = "md", label?: string): HTMLSpanElement {
  const name = `avatar avatar--${size}`;
  const span = h("span", {
    class: name,
    html: `<i class="${avatarIconClass(value)} ri" aria-hidden="true"></i>`,
  });
  if (label) {
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", label);
  } else {
    span.setAttribute("aria-hidden", "true");
  }
  return span;
}

// ---- surfaces -------------------------------------------------------------

export function pageHeading(ctx: AppContext, title: string, description?: string): HTMLElement {
  return h(
    "header",
    { class: "page-heading" },
    h("h1", { class: "page-heading__title", text: title, attrs: { tabindex: "-1" } }),
    description ? h("p", { class: "page-heading__desc", text: description }) : null,
  );
}

export function sectionHeading(text: string, level: "h2" | "h3" = "h2", id?: string): HTMLHeadingElement {
  return h(level, { class: cx("section-heading", `section-heading--${level}`), id, text });
}

export function emptyState(options: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: Node;
  role?: "status";
}): HTMLElement {
  return h(
    "div",
    { class: "empty", attrs: options.role ? { role: options.role } : undefined },
    h("span", {
      class: "empty__icon",
      html: options.icon ? icon(options.icon, 40) : steamMark(40),
    }),
    h("h3", { class: "empty__title", text: options.title }),
    options.body ? h("p", { class: "empty__body", text: options.body }) : null,
    options.action ? h("div", { class: "empty__action" }, options.action) : null,
  );
}

export function skeleton(lines = 3): HTMLElement {
  const children: HTMLElement[] = [];
  for (let index = 0; index < lines; index++) {
    children.push(h("span", { class: "skeleton__line", style: index === lines - 1 ? "width:60%" : undefined }));
  }
  return h("div", { class: "skeleton", attrs: { "aria-hidden": "true" } }, ...children);
}

export function statusPill(ctx: AppContext, status: "draft" | "published" | "suspended"): HTMLSpanElement {
  const map = {
    draft: { key: "dashboard.status.draft", variant: "neutral" as BadgeVariant },
    published: { key: "dashboard.status.published", variant: "confirmed" as BadgeVariant },
    suspended: { key: "dashboard.status.suspended", variant: "danger" as BadgeVariant },
  } as const;
  const entry = map[status];
  return badge({ label: ctx.t(entry.key), variant: entry.variant });
}

// ---- forms ----------------------------------------------------------------

export interface FieldOptions {
  id: string;
  label: string;
  helper?: string;
  optional?: boolean;
  required?: boolean;
  placeholder?: string;
  value?: string;
  type?: string;
  inputmode?: string;
  autocomplete?: string;
  maxlength?: number;
  mono?: boolean;
  rows?: number;
  min?: number;
  max?: number;
}

export interface FieldHandle<T extends HTMLElement = HTMLInputElement> {
  wrap: HTMLElement;
  input: T;
  error: HTMLElement;
  setError: (message: string | null) => void;
}

function baseFieldShell(lang: Lang, options: FieldOptions, control: HTMLElement): FieldHandle & { wrap: HTMLElement } {
  const errorId = `${options.id}-error`;
  const helperId = `${options.id}-helper`;
  const error = h("p", { class: "field__error", id: errorId, attrs: { hidden: true, role: "alert" } });
  const wrap = h(
    "div",
    { class: "field" },
    h(
      "label",
      { class: "field__label", attrs: { for: options.id } },
      options.label,
      options.optional ? h("span", { class: "field__optional", text: ` ${tFor(lang, "common.optional")}` }) : null,
    ),
    control,
    options.helper ? h("p", { class: "field__helper", id: helperId, text: options.helper }) : null,
    error,
  );
  const setError = (message: string | null) => {
    if (message) {
      error.textContent = message;
      error.hidden = false;
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("aria-describedby", cx(options.helper ? helperId : null, errorId));
      wrap.classList.add("field--error");
    } else {
      error.textContent = "";
      error.hidden = true;
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
      wrap.classList.remove("field--error");
    }
  };
  return { wrap, input: control as never, error, setError };
}

// Local copy of `t` for primitives that are not given a ctx (labels are static).
import { t as translate } from "../lib/i18n.ts";
function tFor(lang: Lang, key: string): string {
  return translate(lang, key);
}

export function textField(lang: Lang, options: FieldOptions): FieldHandle<HTMLInputElement | HTMLTextAreaElement> {
  const control = options.rows
    ? h("textarea", {
        class: cx("field__control", "field__control--area", options.mono && "field__control--mono"),
        id: options.id,
        attrs: {
          rows: options.rows,
          placeholder: options.placeholder ?? null,
          maxlength: options.maxlength ?? null,
          spellcheck: options.mono ? "false" : null,
          autocapitalize: "none",
          autocorrect: "off",
        },
      })
    : h("input", {
        class: cx("field__control", options.mono && "field__control--mono"),
        id: options.id,
        attrs: {
          type: options.type ?? "text",
          placeholder: options.placeholder ?? null,
          maxlength: options.maxlength ?? null,
          inputmode: options.inputmode ?? null,
          autocomplete: options.autocomplete ?? "off",
          min: options.min ?? null,
          max: options.max ?? null,
          required: options.required ? true : null,
        },
      });
  if (options.value !== undefined) {
    (control as HTMLInputElement).value = options.value;
  }
  const field = baseFieldShell(lang, options, control);
  return { ...field, input: control } as FieldHandle<HTMLInputElement | HTMLTextAreaElement>;
}

export function selectField(
  lang: Lang,
  options: Omit<FieldOptions, "type"> & { choices: { value: string; label: string }[] },
): FieldHandle<HTMLSelectElement> {
  const control = h(
    "select",
    { class: "field__control field__control--select", id: options.id },
    ...options.choices.map((choice) => h("option", { attrs: { value: choice.value }, text: choice.label })),
  );
  if (options.value !== undefined) control.value = options.value;
  const wrapper = h("div", { class: "field__select-wrap" }, control, h("span", { class: "field__chevron", html: icon("chevronDown", 16) }));
  const field = baseFieldShell(lang, options, wrapper as unknown as HTMLElement);
  return { ...field, input: control } as FieldHandle<HTMLSelectElement>;
}

export function checkboxField(
  lang: Lang,
  options: { id: string; label: string; helper?: string; required?: boolean },
): FieldHandle<HTMLInputElement> {
  const error = h("p", { class: "field__error", id: `${options.id}-error`, attrs: { hidden: true, role: "alert" } });
  const input = h("input", {
    class: "checkbox__input",
    id: options.id,
    attrs: { type: "checkbox", required: options.required ? true : null },
  });
  const wrap = h(
    "div",
    { class: "field checkbox" },
    h(
      "label",
      { class: "checkbox__label", attrs: { for: options.id } },
      input,
      h("span", { class: "checkbox__text", text: options.label }),
    ),
    options.helper ? h("p", { class: "field__helper", text: options.helper }) : null,
    error,
  );
  const setError = (message: string | null) => {
    if (message) {
      error.textContent = message;
      error.hidden = false;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", `${options.id}-error`);
      wrap.classList.add("field--error");
    } else {
      error.hidden = true;
      input.removeAttribute("aria-invalid");
      wrap.classList.remove("field--error");
    }
  };
  return { wrap, input, error, setError };
}

// ---- amount chips ---------------------------------------------------------

export interface AmountChipsOptions {
  selected: number | null;
  onSelect: (amount: number | null) => void;
  amounts?: number[];
  /** When set, only the suggested chip is rendered (locked-amount links). */
  lockedAmount?: number | null;
}

export interface AmountChipsHandle {
  element: HTMLElement;
  setSelected: (amount: number | null) => void;
}

export function amountChips(ctx: AppContext, options: AmountChipsOptions): AmountChipsHandle {
  const amounts = options.amounts ?? UNITS.map((unit) => unit.amount);
  const group = h("div", {
    class: "chips",
    attrs: { role: "radiogroup", "aria-label": ctx.t("a11y.amountGroup") },
  });
  let selected = options.selected;

  const chips: HTMLButtonElement[] = [];
  const build = (amount: number | null, label: string, sublabel: string | null) => {
    const chip = h(
      "button",
      {
        class: "chip",
        attrs: {
          type: "button",
          role: "radio",
          "aria-checked": String(amount === selected),
          "aria-label": amount === null ? label : `${amountSpeech(amount, ctx.lang)}, ${label}`,
          tabindex: amount === selected ? "0" : "-1",
          "data-amount": amount === null ? "any" : String(amount),
        },
      },
      h("span", {
        class: "chip__amount",
        text: amount === null ? label : formatTaka(amount),
        attrs: { dir: "ltr" },
      }),
      sublabel ? h("span", { class: "chip__label", text: sublabel }) : null,
      h("span", { class: "chip__check", html: icon("check", 16), attrs: { "aria-hidden": "true" } }),
    );
    chip.addEventListener("click", () => choose(amount));
    chip.addEventListener("keydown", (event) => {
      const keyboard = event as KeyboardEvent;
      const currentIndex = chips.indexOf(chip);
      if (keyboard.key === "ArrowRight" || keyboard.key === "ArrowDown") {
        event.preventDefault();
        focusChip(currentIndex + 1);
      } else if (keyboard.key === "ArrowLeft" || keyboard.key === "ArrowUp") {
        event.preventDefault();
        focusChip(currentIndex - 1);
      } else if (keyboard.key === "Home") {
        event.preventDefault();
        focusChip(0);
      } else if (keyboard.key === "End") {
        event.preventDefault();
        focusChip(chips.length - 1);
      } else if (keyboard.key === " " || keyboard.key === "Enter") {
        event.preventDefault();
        choose(amount);
      }
    });
    chips.push(chip);
    return chip;
  };

  const focusChip = (index: number) => {
    const chip = chips[((index % chips.length) + chips.length) % chips.length];
    if (!chip) return;
    for (const other of chips) other.tabIndex = -1;
    chip.tabIndex = 0;
    chip.focus();
    const value = chip.dataset.amount;
    choose(value === "any" ? null : Number(value));
  };

  const choose = (amount: number | null) => {
    selected = amount;
    options.onSelect(amount);
    update();
  };

  const update = () => {
    for (const chip of chips) {
      const value = chip.dataset.amount;
      const chipAmount = value === "any" ? null : Number(value);
      const isSelected = chipAmount === selected;
      chip.setAttribute("aria-checked", String(isSelected));
      chip.classList.toggle("chip--selected", isSelected);
      chip.tabIndex = isSelected ? 0 : -1;
    }
    group.dataset.selected = selected === null ? "any" : String(selected);
  };

  if (options.lockedAmount != null) {
    group.appendChild(h("div", { class: "chips__locked" }, build(options.lockedAmount, ctx.t("creator.amount.suggested"), null)));
    group.appendChild(h("p", { class: "chips__locked-helper", text: ctx.t("creator.amount.lockedHelper") }));
  } else {
    for (const amount of amounts) {
      const unit = UNITS.find((entry) => entry.amount === amount);
      group.appendChild(build(amount, ctx.lang === "bn" ? (unit?.bn ?? "") : (unit?.en ?? ""), ctx.lang === "bn" ? (unit?.bn ?? "") : (unit?.en ?? "")));
    }
    group.appendChild(build(null, ctx.t("creator.amount.any"), null));
  }
  update();

  return {
    element: group,
    setSelected: (amount: number | null) => {
      selected = amount;
      update();
    },
  };
}

// ---- copy field + reveal --------------------------------------------------

export function copyField(
  ctx: AppContext,
  options: { value: string; label?: string; mask?: boolean; mono?: boolean; onCopied?: () => void },
): HTMLElement {
  const masked = options.mask === false ? options.value : maskNumber(options.value);
  const valueElement = h("span", {
    class: cx("copy-field__value", options.mono && "copy-field__value--mono"),
    text: masked,
    attrs: { dir: "ltr" },
  });
  let revealed = false;

  const copyButton = h("button", {
    class: "copy-field__button",
    attrs: {
      type: "button",
      "aria-label": `${ctx.t("common.copy")} — ${options.value}`,
      title: ctx.t("common.copy"),
    },
    html: icon("copy", 18),
  });
  const revealButton = h("button", {
    class: "copy-field__button",
    attrs: {
      type: "button",
      "aria-pressed": "false",
      "aria-label": ctx.t("common.showNumber"),
      title: ctx.t("common.showNumber"),
    },
    html: icon("eye", 18),
  });

  copyButton.addEventListener("click", async () => {
    const ok = await copyText(options.value);
    if (ok) {
      toast(ctx.t("common.copied"));
      copyButton.innerHTML = icon("check", 18);
      options.onCopied?.();
      window.setTimeout(() => {
        copyButton.innerHTML = icon("copy", 18);
      }, 1600);
    } else {
      toast(ctx.t("common.selectToCopy"));
      const range = document.createRange();
      range.selectNodeContents(valueElement);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    announce(ok ? ctx.t("common.copied") : ctx.t("common.selectToCopy"));
  });

  revealButton.addEventListener("click", () => {
    revealed = !revealed;
    valueElement.textContent = revealed ? options.value : masked;
    revealButton.innerHTML = icon(revealed ? "eyeOff" : "eye", 18);
    revealButton.setAttribute("aria-pressed", String(revealed));
    const label = revealed ? ctx.t("common.hideNumber") : ctx.t("common.showNumber");
    revealButton.setAttribute("aria-label", label);
    revealButton.setAttribute("title", label);
  });

  return h(
    "div",
    { class: "copy-field" },
    options.label ? h("span", { class: "copy-field__label", text: options.label }) : null,
    h("div", { class: "copy-field__row" }, valueElement, copyButton, revealButton),
  );
}

// ---- disclosure strip -----------------------------------------------------

/**
 * The honesty surface (compliance A–H). Bangla first, English second, both always
 * visible — this component is why the product is allowed to exist.
 */
export function disclosure(options: {
  bnKey: string;
  enKey: string;
  variant?: "strip" | "plain" | "helper";
  ctx: AppContext;
}): HTMLElement {
  const variant = options.variant ?? "strip";
  return h(
    "aside",
    {
      class: cx("disclosure", `disclosure--${variant}`),
      attrs: { role: "note" },
    },
    variant === "strip"
      ? h("span", { class: "disclosure__icon", html: icon("info", 18), attrs: { "aria-hidden": "true" } })
      : null,
    h(
      "div",
      { class: "disclosure__text" },
      h("p", { class: "disclosure__bn", text: options.ctx.tx("bn", options.bnKey) }),
      h("p", { class: "disclosure__en", text: options.ctx.tx("en", options.enKey), attrs: { lang: "en" } }),
    ),
  );
}
