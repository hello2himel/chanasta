/**
 * Public-surface primitives — the shared vocabulary for landing, supporter,
 * thanks, embed and 404.
 *
 * These deliberately do not reuse the creator-app components: the public pages
 * need a quieter, receipt-and-ledger look (docs/redesign.md §3) and the app
 * workstream owns its own styling. Every class is prefixed `pub-`; every colour
 * value lives in `src/styles/public.css` and comes from the coffee tokens.
 */
// The public stylesheet is imported here so every public page (which all use
// these primitives) gets it in the main CSS bundle. The Lead's `styles.css`
// also intends to import it, but its workstream @imports currently sit after
// rules, so PostCSS drops them; a component-level import is deterministic.
import "../../styles/public.css";
import { h, copyText, toast, announce } from "../../lib/dom.ts";
import { maskNumber } from "../../lib/format.ts";
import type { AppContext } from "../../lib/app.ts";
import type { IconName } from "../icons.ts";
import { icon } from "../icons.ts";
import { avatarIconClass } from "../../lib/avatars.ts";

// ---- buttons / links ------------------------------------------------------

export type PubButtonVariant = "primary" | "secondary" | "ghost";

export interface PubButtonOptions {
  label: string;
  variant?: PubButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: IconName;
  iconTrailing?: IconName;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (event: MouseEvent) => void;
}

function pubButtonChildren(options: { icon?: IconName; iconTrailing?: IconName; label: string }): Array<Node | null> {
  return [
    options.icon ? h("span", { class: "pub-btn__icon", html: icon(options.icon, 18), attrs: { "aria-hidden": "true" } }) : null,
    h("span", { class: "pub-btn__label", text: options.label }),
    options.iconTrailing
      ? h("span", { class: "pub-btn__icon", html: icon(options.iconTrailing, 18), attrs: { "aria-hidden": "true" } })
      : null,
  ];
}

export function pubButton(options: PubButtonOptions): HTMLButtonElement {
  return h(
    "button",
    {
      class: [
        // Chrome (Lead-owned) styles `.btn`; `pub-` carries the page-level
        // refinements. Emitting both keeps the shared button primitive and the
        // public pages visually identical.
        "btn",
        `btn--${options.variant ?? "primary"}`,
        options.size === "sm" ? "btn--sm" : "",
        options.block ? "btn--block" : "",
        "pub-btn",
        `pub-btn--${options.variant ?? "primary"}`,
        options.size === "sm" ? "pub-btn--sm" : "",
        options.block ? "pub-btn--block" : "",
      ],
      attrs: {
        type: options.type ?? "button",
        disabled: options.disabled ? true : null,
        "aria-label": options.ariaLabel ?? null,
      },
      on: options.onClick ? { click: options.onClick as (event: Event) => void } : undefined,
    },
    ...pubButtonChildren(options),
  );
}

export interface PubLinkOptions {
  href: string;
  label: string;
  variant?: PubButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: IconName;
  iconTrailing?: IconName;
  external?: boolean;
  ariaLabel?: string;
  title?: string;
  onClick?: (event: MouseEvent) => void;
}

export function pubLink(options: PubLinkOptions): HTMLAnchorElement {
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
      class: [
        // Chrome (Lead-owned) styles `.btn`; `pub-` carries the page-level
        // refinements. Emitting both keeps the shared button primitive and the
        // public pages visually identical.
        "btn",
        `btn--${options.variant ?? "primary"}`,
        options.size === "sm" ? "btn--sm" : "",
        options.block ? "btn--block" : "",
        "pub-btn",
        `pub-btn--${options.variant ?? "primary"}`,
        options.size === "sm" ? "pub-btn--sm" : "",
        options.block ? "pub-btn--block" : "",
      ],
      attrs,
      on: options.onClick ? { click: options.onClick as (event: Event) => void } : undefined,
    },
    ...pubButtonChildren(options),
  );
}

/** Plain text link that still gets the 44px hit area. */
export function pubTextLink(href: string, label: string, options: { external?: boolean; icon?: IconName } = {}): HTMLAnchorElement {
  const attrs: Record<string, string | boolean | null> = { href };
  if (options.external) {
    attrs.target = "_blank";
    attrs.rel = "noopener noreferrer";
  } else {
    attrs["data-link"] = true;
  }
  return h(
    "a",
    { class: "pub-text-link", attrs },
    options.icon ? h("span", { class: "pub-text-link__icon", html: icon(options.icon, 16), attrs: { "aria-hidden": "true" } }) : null,
    h("span", { text: label }),
  );
}

// ---- stamps ---------------------------------------------------------------

/**
 * Status stamps — the product's only non-oval chips (docs/redesign.md §5.3).
 * "Self-reported" is a dashed stamp, "Creator confirmed" a solid one, "DEMO"
 * an inked stamp. They carry the honesty contract, so the variants are fixed.
 */
export type PubStampVariant = "demo" | "self" | "confirmed" | "verified" | "unverified" | "neutral" | "danger";

export function pubStamp(label: string, variant: PubStampVariant = "neutral", iconName?: IconName): HTMLSpanElement {
  return h(
    "span",
    { class: ["pub-stamp", `pub-stamp--${variant}`] },
    iconName ? h("span", { class: "pub-stamp__icon", html: icon(iconName, 12), attrs: { "aria-hidden": "true" } }) : null,
    h("span", { text: label }),
  );
}

// ---- identity -------------------------------------------------------------

export function pubAvatar(value: string, size: "sm" | "md" | "lg" | "xl" = "md", label?: string): HTMLSpanElement {
  const element = h("span", {
    class: ["pub-avatar", `pub-avatar--${size}`],
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

/** `@slug` in the receipt's monospace, LTR even inside Bangla text. */
export function pubSlug(slug: string, className?: string): HTMLSpanElement {
  return h("span", {
    class: ["pub-mono", className ?? ""],
    text: `@${slug}`,
    attrs: { dir: "ltr" },
  });
}

export function pubMono(text: string): HTMLSpanElement {
  return h("span", { class: "pub-mono", text, attrs: { dir: "ltr" } });
}

// ---- section headers ------------------------------------------------------

export function pubSectionHead(options: {
  title: string;
  lead?: string;
  id?: string;
  level?: "h2" | "h3";
  label?: string;
}): HTMLElement {
  const level = options.level ?? "h2";
  return h(
    "header",
    { class: "pub-section-head" },
    options.label ? h("p", { class: "pub-kicker", text: options.label }) : null,
    h(level, { class: "pub-section-head__title", id: options.id, text: options.title }),
    options.lead ? h("p", { class: "pub-section-head__lead", text: options.lead }) : null,
  );
}

// ---- copy / reveal account ------------------------------------------------

export interface PubCopyFieldOptions {
  ctx: AppContext;
  value: string;
  label?: string;
  /** Mask the number until the supporter reveals it (default: true). */
  mask?: boolean;
  mono?: boolean;
  compact?: boolean;
}

/**
 * One account detail with copy + reveal, built for a receipt row. Copy/reveal
 * work exactly like the old supporter page, but the chrome matches the paper.
 */
export function pubCopyField(options: PubCopyFieldOptions): HTMLElement {
  const { ctx } = options;
  const mask = options.mask !== false;
  const masked = mask ? maskNumber(options.value) : options.value;
  const valueElement = h("span", {
    class: ["pub-copy__value", options.mono ? "pub-copy__value--mono" : ""],
    text: masked,
    attrs: { dir: "ltr" },
  });
  let revealed = false;

  const copyButton = h("button", {
    class: "pub-copy__btn",
    attrs: { type: "button", "aria-label": `${ctx.t("common.copy")} — ${options.value}`, title: ctx.t("common.copy") },
    html: icon("copy", 18),
  });
  const revealButton = mask
    ? h("button", {
        class: "pub-copy__btn",
        attrs: {
          type: "button",
          "aria-pressed": "false",
          "aria-label": ctx.t("common.showNumber"),
          title: ctx.t("common.showNumber"),
        },
        html: icon("eye", 18),
      })
    : null;

  copyButton.addEventListener("click", () => {
    void copyText(options.value).then((ok) => {
      toast(ok ? ctx.t("common.copied") : ctx.t("common.selectToCopy"));
      if (ok) {
        copyButton.innerHTML = icon("check", 18);
        window.setTimeout(() => {
          copyButton.innerHTML = icon("copy", 18);
        }, 1600);
      }
      announce(ok ? ctx.t("common.copied") : ctx.t("common.selectToCopy"));
    });
  });

  revealButton?.addEventListener("click", () => {
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
    { class: ["pub-copy", options.compact ? "pub-copy--compact" : ""] },
    options.label ? h("span", { class: "pub-copy__label", text: options.label }) : null,
    h("div", { class: "pub-copy__row" }, valueElement, copyButton, revealButton),
  );
}

// ---- misc ----------------------------------------------------------------

export function pubIcon(name: IconName, size = 20): HTMLSpanElement {
  return h("span", { class: "pub-icon", html: icon(name, size), attrs: { "aria-hidden": "true" } });
}

/** A dashed ledger line used between sections; purely structural. */
export function pubRule(): HTMLElement {
  return h("div", { class: "pub-rule", attrs: { "aria-hidden": "true" } });
}
