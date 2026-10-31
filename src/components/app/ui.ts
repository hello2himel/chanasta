/**
 * Creator-app primitives (coffee ledger language).
 *
 * These are deliberately local to the app workstream: `app-` classes, coffee
 * tokens only, no emoji, RemixIcon only. Shared primitives in
 * `src/components/ui.ts` stay untouched.
 */
import { h, copyText, toast } from "../../lib/dom.ts";
import { remixClass, type IconName } from "../icons.ts";
import { avatarIconClass } from "../../lib/avatars.ts";
import { maskNumber } from "../../lib/format.ts";
import { cx } from "../../lib/app.ts";

// ---- icons / avatar -------------------------------------------------------

/**
 * Icon markup. Accepts either a semantic name from `icons.ts` (e.g. "share")
 * or a raw RemixIcon class (e.g. "ri-share-line"); both end up as one outlined
 * RemixIcon glyph so call sites can stay explicit about the glyph they want.
 */
function iconClass(name: string): string {
  if (name.startsWith("ri-")) return name;
  // Raw RemixIcon names ("share-line", "arrow-up-line") contain hyphens; the
  // semantic names in icons.ts are camelCase words. Normalise both.
  if (name.includes("-")) return `ri-${name}`;
  return remixClass(name as IconName);
}

/** Trusted RemixIcon markup for `innerHTML`/`html` props. */
export function appIconHtml(name: string, size = 18): string {
  return `<i class="${iconClass(name)} ri" style="font-size:${size}px" aria-hidden="true"></i>`;
}

export function appIcon(name: string, size = 18): HTMLElement {
  return h("span", { class: "app-i", html: appIconHtml(name, size), attrs: { "aria-hidden": "true" } });
}

export function appAvatar(
  value: string | null | undefined,
  size: "sm" | "md" | "lg" | "xl" = "md",
  label?: string,
): HTMLElement {
  const element = h("span", {
    class: cx("app-avatar", `app-avatar--${size}`),
    html: `<i class="${avatarIconClass(value)} ri" aria-hidden="true"></i>`,
  });
  if (label) {
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", label);
  } else {
    element.setAttribute("aria-hidden", "true");
  }
  return element;
}

// ---- buttons / links ------------------------------------------------------

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface AppButtonOptions {
  label: string;
  variant?: AppButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: IconName;
  iconTrailing?: IconName;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
}

export function appButton(options: AppButtonOptions): HTMLButtonElement {
  const button = h(
    "button",
    {
      class: cx(
        "app-btn",
        `app-btn--${options.variant ?? "primary"}`,
        options.size === "sm" && "app-btn--sm",
        options.block && "app-btn--block",
      ),
      attrs: {
        type: options.type ?? "button",
        disabled: options.disabled || options.loading ? true : null,
        "aria-busy": options.loading ? "true" : null,
        "aria-label": options.ariaLabel ?? null,
      },
    },
    options.loading ? appIcon("spinner", 18) : options.icon ? appIcon(options.icon, 18) : null,
    h("span", { class: "app-btn__label", text: options.label }),
    options.iconTrailing ? appIcon(options.iconTrailing, 18) : null,
  );
  if (options.loading) button.querySelector(".app-i")?.classList.add("app-spin");
  if (options.onClick) button.addEventListener("click", options.onClick);
  return button;
}

export function appIconButton(options: {
  label: string;
  icon: IconName;
  onClick: () => void;
  disabled?: boolean;
}): HTMLButtonElement {
  return h(
    "button",
    {
      class: "app-icon-btn",
      attrs: { type: "button", "aria-label": options.label, title: options.label, disabled: options.disabled ? true : null },
      on: { click: options.onClick },
    },
    appIcon(options.icon, 18),
  );
}

export function appLink(options: {
  label: string;
  href: string;
  variant?: AppButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: IconName;
  iconTrailing?: IconName;
  external?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
}): HTMLAnchorElement {
  const attrs: Record<string, string | boolean | null> = { href: options.href };
  if (options.ariaLabel) attrs["aria-label"] = options.ariaLabel;
  if (options.external) {
    attrs.target = "_blank";
    attrs.rel = "noopener noreferrer";
  } else {
    attrs["data-link"] = true;
  }
  const link = h(
    "a",
    {
      class: cx(
        "app-btn",
        `app-btn--${options.variant ?? "secondary"}`,
        options.size === "sm" && "app-btn--sm",
        options.block && "app-btn--block",
      ),
      attrs,
    },
    options.icon ? appIcon(options.icon, 18) : null,
    h("span", { class: "app-btn__label", text: options.label }),
    options.iconTrailing ? appIcon(options.iconTrailing, 18) : null,
  );
  if (options.onClick) link.addEventListener("click", options.onClick);
  return link;
}

// ---- stamps ---------------------------------------------------------------

export type AppStampTone = "neutral" | "self" | "confirmed" | "danger" | "demo" | "outline";

export function appStamp(options: { label: string; tone?: AppStampTone; icon?: IconName }): HTMLElement {
  return h(
    "span",
    { class: cx("app-stamp", `app-stamp--${options.tone ?? "neutral"}`) },
    options.icon ? appIcon(options.icon, 13) : null,
    h("span", { text: options.label }),
  );
}

// ---- fields ---------------------------------------------------------------

export interface AppFieldOptions {
  id: string;
  label: string;
  helper?: string;
  optionalText?: string;
  placeholder?: string;
  value?: string;
  type?: string;
  inputmode?: string;
  autocomplete?: string;
  maxlength?: number;
  multiline?: boolean;
  rows?: number;
  mono?: boolean;
  spellcheck?: boolean;
  required?: boolean;
  disabled?: boolean;
  onInput?: (value: string) => void;
  onBlur?: (value: string) => void;
}

export interface AppField<T extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement> {
  wrap: HTMLElement;
  input: T;
  setError: (message: string | null) => void;
}

export function appField(options: AppFieldOptions): AppField<HTMLInputElement | HTMLTextAreaElement> {
  const errorId = `${options.id}-error`;
  const helperId = `${options.id}-helper`;
  const describedBy = [options.helper ? helperId : null, errorId].filter(Boolean).join(" ");
  const control = options.multiline
    ? h("textarea", {
        class: cx("app-input", "app-input--area", options.mono && "app-input--mono"),
        id: options.id,
        attrs: {
          rows: options.rows ?? 4,
          placeholder: options.placeholder ?? null,
          maxlength: options.maxlength ?? null,
          "aria-describedby": describedBy,
          spellcheck: options.spellcheck === false ? "false" : null,
          disabled: options.disabled ? true : null,
        },
      })
    : h("input", {
        class: cx("app-input", options.mono && "app-input--mono"),
        id: options.id,
        attrs: {
          type: options.type ?? "text",
          placeholder: options.placeholder ?? null,
          maxlength: options.maxlength ?? null,
          inputmode: options.inputmode ?? null,
          autocomplete: options.autocomplete ?? "off",
          spellcheck: options.spellcheck === false ? "false" : null,
          required: options.required ? true : null,
          disabled: options.disabled ? true : null,
          "aria-describedby": describedBy,
        },
      });
  if (options.value !== undefined) control.value = options.value;
  control.addEventListener("input", () => options.onInput?.(control.value));
  control.addEventListener("blur", () => options.onBlur?.(control.value));

  const error = h("p", { class: "app-field__error", id: errorId, attrs: { role: "alert", hidden: true } });
  const wrap = h(
    "div",
    { class: "app-field" },
    h(
      "label",
      { class: "app-field__label", attrs: { for: options.id } },
      h("span", { text: options.label }),
      options.optionalText ? h("span", { class: "app-field__optional" }, options.optionalText) : null,
    ),
    control,
    options.helper ? h("p", { class: "app-field__helper", id: helperId, text: options.helper }) : null,
    error,
  );

  const setError = (message: string | null) => {
    if (message) {
      error.textContent = message;
      error.hidden = false;
      control.setAttribute("aria-invalid", "true");
      wrap.classList.add("app-field--error");
    } else {
      error.hidden = true;
      error.textContent = "";
      control.removeAttribute("aria-invalid");
      wrap.classList.remove("app-field--error");
    }
  };

  return { wrap, input: control, setError };
}

export function appSelect(options: {
  id: string;
  label: string;
  choices: { value: string; label: string }[];
  value?: string;
  helper?: string;
  onInput?: (value: string) => void;
}): { wrap: HTMLElement; input: HTMLSelectElement } {
  const select = h(
    "select",
    { class: "app-input app-select", id: options.id },
    ...options.choices.map((choice) => h("option", { attrs: { value: choice.value }, text: choice.label })),
  );
  if (options.value !== undefined) select.value = options.value;
  select.addEventListener("change", () => options.onInput?.(select.value));
  const wrap = h(
    "div",
    { class: "app-field" },
    h("label", { class: "app-field__label", attrs: { for: options.id } }, h("span", { text: options.label })),
    h("div", { class: "app-select-wrap" }, select, appIcon("chevronDown", 16)),
    options.helper ? h("p", { class: "app-field__helper", text: options.helper }) : null,
  );
  return { wrap, input: select };
}

export function appCheckbox(options: {
  id: string;
  label: string;
  helper?: string;
  checked?: boolean;
  onInput?: (checked: boolean) => void;
}): { wrap: HTMLElement; input: HTMLInputElement; setError: (message: string | null) => void } {
  const input = h("input", {
    class: "app-check__input",
    id: options.id,
    attrs: { type: "checkbox", checked: options.checked ? true : null },
  });
  input.addEventListener("change", () => options.onInput?.(input.checked));
  const error = h("p", { class: "app-field__error", attrs: { role: "alert", hidden: true } });
  const wrap = h(
    "div",
    { class: "app-field app-check" },
    h("label", { class: "app-check__label", attrs: { for: options.id } }, input, h("span", { text: options.label })),
    options.helper ? h("p", { class: "app-field__helper", text: options.helper }) : null,
    error,
  );
  const setError = (message: string | null) => {
    if (message) {
      error.textContent = message;
      error.hidden = false;
      input.setAttribute("aria-invalid", "true");
      wrap.classList.add("app-field--error");
    } else {
      error.hidden = true;
      input.removeAttribute("aria-invalid");
      wrap.classList.remove("app-field--error");
    }
  };
  return { wrap, input, setError };
}

export function appRadioGroup(options: {
  legend: string;
  name: string;
  choices: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}): HTMLElement {
  const group = h("fieldset", { class: "app-radio" }, h("legend", { class: "app-radio__legend", text: options.legend }));
  for (const choice of options.choices) {
    const id = `${options.name}-${choice.value}`;
    const input = h("input", {
      class: "app-radio__input",
      id,
      attrs: { type: "radio", name: options.name, value: choice.value, checked: choice.value === options.value },
    });
    input.addEventListener("change", () => options.onChange(choice.value));
    group.append(h("label", { class: "app-radio__option", attrs: { for: id } }, input, h("span", { text: choice.label })));
  }
  return group;
}

export function appSwitch(options: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}): HTMLButtonElement {
  const button = h(
    "button",
    {
      class: cx("app-switch", options.checked && "app-switch--on"),
      attrs: {
        type: "button",
        role: "switch",
        "aria-checked": String(options.checked),
        "aria-label": options.label,
        disabled: options.disabled ? true : null,
      },
    },
    h("span", { class: "app-switch__track", attrs: { "aria-hidden": "true" } }, h("span", { class: "app-switch__thumb" })),
  );
  button.addEventListener("click", () => options.onChange(!options.checked));
  return button;
}

// ---- copy row -------------------------------------------------------------

export function appCopyRow(options: {
  value: string;
  label?: string;
  mono?: boolean;
  mask?: boolean;
  copyLabel: string;
  copiedLabel: string;
  showLabel?: string;
  hideLabel?: string;
  onCopied?: () => void;
}): HTMLElement {
  const masked = options.mask === false ? options.value : maskNumber(options.value);
  const valueElement = h("span", {
    class: cx("app-copy__value", options.mono && "app-copy__value--mono"),
    text: masked,
    attrs: { dir: "ltr" },
  });
  let revealed = false;
  const copyButton = h("button", {
    class: "app-icon-btn app-copy__action",
    attrs: { type: "button", "aria-label": `${options.copyLabel} — ${options.value}`, title: options.copyLabel },
    html: appIconHtml("file-copy-line", 18),
  });
  copyButton.addEventListener("click", () => {
    void copyText(options.value).then((ok) => {
      toast(ok ? options.copiedLabel : options.copyLabel);
      if (ok) options.onCopied?.();
      copyButton.innerHTML = appIconHtml(ok ? "ri-check-line" : "ri-file-copy-line", 18);
      window.setTimeout(() => {
        copyButton.innerHTML = appIconHtml("ri-file-copy-line", 18);
      }, 1500);
    });
  });

  const actions = h("div", { class: "app-copy__actions" }, copyButton);
  if (options.showLabel || options.hideLabel) {
    const reveal = h("button", {
      class: "app-icon-btn app-copy__action",
      attrs: {
        type: "button",
        "aria-pressed": "false",
        "aria-label": options.showLabel ?? options.copyLabel,
        title: options.showLabel ?? options.copyLabel,
      },
      html: appIconHtml("eye-line", 18),
    });
    reveal.addEventListener("click", () => {
      revealed = !revealed;
      valueElement.textContent = revealed ? options.value : masked;
      reveal.innerHTML = appIconHtml(revealed ? "ri-eye-off-line" : "ri-eye-line", 18);
      const label = revealed ? options.hideLabel ?? options.copyLabel : options.showLabel ?? options.copyLabel;
      reveal.setAttribute("aria-label", label);
      reveal.setAttribute("title", label);
      reveal.setAttribute("aria-pressed", String(revealed));
    });
    actions.append(reveal);
  }

  return h(
    "div",
    { class: "app-copy" },
    options.label ? h("span", { class: "app-copy__label", text: options.label }) : null,
    h("div", { class: "app-copy__row" }, valueElement, actions),
  );
}

// ---- surfaces -------------------------------------------------------------

export function appPageHead(options: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: Node[];
  id?: string;
}): HTMLElement {
  return h(
    "header",
    { class: "app-page-head" },
    h(
      "div",
      { class: "app-page-head__text" },
      options.eyebrow ? h("p", { class: "app-eyebrow", text: options.eyebrow }) : null,
      h("h1", { class: "app-page-head__title", id: options.id, text: options.title, attrs: { tabindex: "-1" } }),
      options.description ? h("p", { class: "app-page-head__desc", text: options.description }) : null,
    ),
    options.actions && options.actions.length > 0
      ? h("div", { class: "app-page-head__actions" }, ...options.actions)
      : null,
  );
}

export function appSectionHead(options: {
  title: string;
  description?: string;
  actions?: Node[];
  id?: string;
  level?: "h2" | "h3";
}): HTMLElement {
  return h(
    "div",
    { class: "app-section-head" },
    h(
      "div",
      { class: "app-section-head__text" },
      h(options.level ?? "h2", { class: "app-section-head__title", id: options.id, text: options.title }),
      options.description ? h("p", { class: "app-section-head__desc", text: options.description }) : null,
    ),
    options.actions && options.actions.length > 0 ? h("div", { class: "app-section-head__actions" }, ...options.actions) : null,
  );
}

export function appEmpty(options: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: Node;
}): HTMLElement {
  return h(
    "div",
    { class: "app-empty" },
    h("span", { class: "app-empty__icon", html: appIconHtml(options.icon ?? "cup-line", 32) }),
    h("h2", { class: "app-empty__title", text: options.title }),
    options.body ? h("p", { class: "app-empty__body", text: options.body }) : null,
    options.action ? h("div", { class: "app-empty__action" }, options.action) : null,
  );
}

export function appBanner(options: {
  tone?: "info" | "warn" | "error" | "success";
  title?: string;
  body: string;
  action?: Node;
  role?: "note" | "status" | "alert";
}): HTMLElement {
  return h(
    "div",
    {
      class: cx("app-banner", `app-banner--${options.tone ?? "info"}`),
      attrs: { role: options.role ?? (options.tone === "error" ? "alert" : "note") },
    },
    h("span", { class: "app-banner__icon", html: appIconHtml(options.tone === "success" ? "ri-checkbox-circle-line" : options.tone === "error" ? "ri-alert-line" : "ri-information-line", 18) }),
    h(
      "div",
      { class: "app-banner__text" },
      options.title ? h("p", { class: "app-banner__title", text: options.title }) : null,
      h("p", { class: "app-banner__body", text: options.body }),
    ),
    options.action ? h("div", { class: "app-banner__action" }, options.action) : null,
  );
}

export function appDivider(className?: string): HTMLElement {
  return h("hr", { class: cx("app-rule", className), attrs: { "aria-hidden": "true" } });
}

export function appMono(text: string): HTMLElement {
  return h("span", { class: "app-mono", text, attrs: { dir: "ltr" } });
}

export function appAmount(value: number, formatter: (amount: number) => string): HTMLElement {
  return h("span", { class: "app-amount", text: formatter(value), attrs: { dir: "ltr" } });
}

export function appTabs(options: {
  items: { label: string; href: string; active: boolean; count?: number; badgeSr?: string }[];
  ariaLabel: string;
}): HTMLElement {
  return h(
    "nav",
    { class: "app-tabs", attrs: { "aria-label": options.ariaLabel } },
    ...options.items.map((item) =>
      h(
        "a",
        {
          class: cx("app-tab", item.active && "app-tab--active"),
          attrs: {
            href: item.href,
            "data-link": true,
            "aria-current": item.active ? "page" : null,
          },
        },
        h("span", { class: "app-tab__label", text: item.label }),
        item.count !== undefined && item.count > 0
          ? h(
              "span",
              { class: "app-tab__count" },
              String(item.count),
              item.badgeSr ? h("span", { class: "app-sr", text: ` ${item.badgeSr}` }) : null,
            )
          : null,
      ),
    ),
  );
}

export function appProgressRail(options: {
  steps: { label: string; state: "done" | "current" | "todo"; index: number }[];
  currentLabel: string;
}): HTMLElement {
  return h(
    "div",
    { class: "app-rail" },
    h(
      "ol",
      { class: "app-rail__bars", attrs: { "aria-label": options.currentLabel } },
      ...options.steps.map((step) =>
        h("li", {
          class: cx("app-rail__bar", `app-rail__bar--${step.state}`),
          attrs: {
            "aria-current": step.state === "current" ? "step" : null,
            title: step.label,
          },
          html: `<span class="app-sr">${step.index}. ${step.label}</span>`,
        }),
      ),
    ),
    h("span", { class: "app-rail__now", text: options.currentLabel }),
  );
}

// ---- dialog ---------------------------------------------------------------

export interface AppDialogAction {
  id: string;
  label: string;
  variant?: AppButtonVariant;
  disabled?: boolean;
}

export interface AppDialogOptions {
  title: string;
  description?: string;
  content?: Node;
  actions: AppDialogAction[];
  destructive?: boolean;
  onAction?: (id: string) => boolean | void;
}

/** Native `<dialog>` with the platform focus trap and app styling. */
export function appDialog(options: AppDialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const dialog = h("dialog", { class: "app-dialog", attrs: { "aria-labelledby": "app-dialog-title" } });
    const body = h(
      "div",
      { class: "app-dialog__body" },
      h("h2", { class: "app-dialog__title", id: "app-dialog-title", text: options.title }),
      options.description ? h("p", { class: "app-dialog__desc", text: options.description }) : null,
      options.content ? h("div", { class: "app-dialog__content" }, options.content) : null,
    );
    const actions = h("div", { class: "app-dialog__actions" });
    const buttons: HTMLButtonElement[] = [];
    for (const action of options.actions) {
      const button = appButton({
        label: action.label,
        variant: action.variant ?? "secondary",
        disabled: action.disabled,
        onClick: () => {
          if (options.onAction?.(action.id) === false) return;
          finish(action.id);
          dialog.close();
        },
      });
      buttons.push(button);
      actions.append(button);
    }
    dialog.append(body, actions);
    dialog.addEventListener("close", () => {
      dialog.remove();
      finish(null);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog && !options.destructive) dialog.close();
    });
    document.body.append(dialog);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    const preferred = options.destructive
      ? buttons.find((button) => button.classList.contains("app-btn--secondary"))
      : buttons.find((button) => button.classList.contains("app-btn--primary"));
    (preferred ?? buttons[0])?.focus();
  });
}
