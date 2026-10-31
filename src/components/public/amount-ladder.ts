/**
 * The supporter amount ladder: ৳20 / ৳50 / ৳100 / ইচ্ছেমতো.
 *
 * This is the board's four-tile ladder rebuilt on the coffee tokens. Choosing a
 * preset re-derives the QR with that amount; choosing ইচ্ছেমতো shows the static
 * QR until the supporter types a number, which then goes into the derived QR.
 * The claim form's amount follows the ladder (unless the supporter edited it
 * themselves — same rule as before).
 */
import { h, announce } from "../../lib/dom.ts";
import { formatTaka, UNITS } from "../../lib/format.ts";
import { parseTaka } from "../../lib/validate.ts";
import type { AppContext } from "../../lib/app.ts";

export interface AmountLadderOptions {
  ctx: AppContext;
  selected: number | null;
  onSelect: (amount: number | null) => void;
  /** Copy supplied by the page (so components stay language-agnostic). */
  anyLabel: string;
  anySublabel: string;
  customLabel: string;
  customPlaceholder: string;
  customError: string;
}

export interface AmountLadderHandle {
  element: HTMLElement;
  setSelected: (amount: number | null) => void;
  /** Exposed for tests/debug; the page does not need it. */
  customInput: HTMLInputElement;
}

interface Tile {
  amount: number | null;
  label: string;
  display: string;
  iconClass: string;
}

export function renderAmountLadder(options: AmountLadderOptions): AmountLadderHandle {
  const { ctx } = options;
  let selected = options.selected;
  const tiles: HTMLButtonElement[] = [];
  let customDirty = options.selected != null && !UNITS.some((unit) => unit.amount === options.selected);

  const inputs = h(
    "div",
    { class: "pub-ladder__grid", attrs: { role: "radiogroup", "aria-label": ctx.t("a11y.amountGroup") } },
  );

  const focusTile = (index: number) => {
    const tile = tiles[((index % tiles.length) + tiles.length) % tiles.length];
    if (!tile) return;
    for (const other of tiles) other.tabIndex = -1;
    tile.tabIndex = 0;
    tile.focus();
    tile.click();
  };

  const buildTile = (tile: Tile): HTMLButtonElement => {
    const button = h(
      "button",
      {
        class: "pub-ladder__tile",
        attrs: {
          type: "button",
          role: "radio",
          "aria-checked": String(tile.amount === selected),
          "aria-label": tile.amount === null ? options.anyLabel : `${formatTaka(tile.amount)}, ${tile.label}`,
          tabindex: tile.amount === selected ? "0" : "-1",
          "data-amount": tile.amount === null ? "any" : String(tile.amount),
        },
        on: {
          click: () => {
            if (tile.amount === null) {
              select(tile.amount, { revealCustom: true });
              // Coming back to "any amount" with a remembered custom value keeps
              // the derived QR in sync with what the field shows.
              if (customInput.value.trim().length > 0) applyCustom();
            } else {
              customDirty = false;
              select(tile.amount, { revealCustom: false });
            }
          },
        },
      },
      h("span", { class: "pub-ladder__icon", html: `<i class="${tile.iconClass} ri" aria-hidden="true"></i>` }),
      h("span", { class: "pub-ladder__name", text: tile.label }),
      h("span", { class: "pub-ladder__amount", text: tile.display, attrs: { dir: "ltr" } }),
    );
    button.addEventListener("keydown", (event) => {
      const keyboard = event as KeyboardEvent;
      const index = tiles.indexOf(button);
      if (keyboard.key === "ArrowRight" || keyboard.key === "ArrowDown") {
        event.preventDefault();
        focusTile(index + 1);
      } else if (keyboard.key === "ArrowLeft" || keyboard.key === "ArrowUp") {
        event.preventDefault();
        focusTile(index - 1);
      } else if (keyboard.key === "Home") {
        event.preventDefault();
        focusTile(0);
      } else if (keyboard.key === "End") {
        event.preventDefault();
        focusTile(tiles.length - 1);
      } else if (keyboard.key === " " || keyboard.key === "Enter") {
        event.preventDefault();
        button.click();
      }
    });
    tiles.push(button);
    return button;
  };

  for (const unit of UNITS) {
    const iconClass = unit.amount === 20 ? "ri-cup-line" : unit.amount === 50 ? "ri-restaurant-line" : "ri-bowl-line";
    inputs.append(
      buildTile({
        amount: unit.amount,
        label: ctx.lang === "bn" ? unit.bn : unit.en,
        display: formatTaka(unit.amount),
        iconClass,
      }),
    );
  }
  inputs.append(
    buildTile({
      amount: null,
      label: options.anyLabel,
      display: options.anySublabel,
      iconClass: "ri-edit-line",
    }),
  );

  // Custom amount: same field the old page had, but inline in the ladder.
  const customInput = h("input", {
    class: "pub-ladder__control",
    id: "pub-custom-amount",
    attrs: {
      type: "text",
      inputmode: "numeric",
      autocomplete: "off",
      placeholder: options.customPlaceholder,
      "aria-label": options.customLabel,
    },
  });
  const customError = h("p", { class: "pub-ladder__error", attrs: { hidden: true, role: "alert" } });
  const customWrap = h(
    "div",
    { class: "pub-ladder__custom", attrs: { hidden: true } },
    h("label", { class: "pub-ladder__custom-label", attrs: { for: "pub-custom-amount" }, text: options.customLabel }),
    h(
      "div",
      { class: "pub-ladder__input" },
      h("span", { class: "pub-ladder__prefix", text: "৳", attrs: { "aria-hidden": "true" } }),
      customInput,
    ),
    h("p", { class: "pub-ladder__hint", text: ctx.t("creator.amount.customHelper") }),
    customError,
  );

  const updateVisual = () => {
    const customSelected = selected === null || customDirty;
    for (const tile of tiles) {
      const value = tile.dataset.amount;
      const tileAmount = value === "any" ? null : Number(value);
      const isSelected = value === "any" ? customSelected : tileAmount === selected;
      tile.setAttribute("aria-checked", String(isSelected));
      tile.classList.toggle("pub-ladder__tile--selected", isSelected);
      tile.tabIndex = isSelected ? 0 : -1;
    }
  };

  const select = (amount: number | null, settings: { revealCustom: boolean }) => {
    selected = amount;
    customWrap.hidden = !(amount === null || customDirty);
    if (amount === null) {
      customWrap.hidden = false;
      if (settings.revealCustom) {
        customInput.focus();
        customInput.select();
      }
    }
    updateVisual();
    options.onSelect(amount);
    if (amount !== null) announce(ctx.t("creator.qr.amountAnnounce", { amount: formatTaka(amount, { symbol: false }) }));
  };

  const applyCustom = () => {
    const parsed = parseTaka(customInput.value);
    if (parsed === null || parsed < 1 || parsed > 100_000) {
      customError.textContent = options.customError;
      customError.hidden = false;
      customInput.setAttribute("aria-invalid", "true");
      return;
    }
    customError.hidden = true;
    customInput.removeAttribute("aria-invalid");
    customDirty = true;
    selected = Math.round(parsed);
    customWrap.hidden = false;
    updateVisual();
    options.onSelect(selected);
    announce(ctx.t("creator.qr.amountAnnounce", { amount: formatTaka(selected, { symbol: false }) }));
  };

  customInput.addEventListener("change", applyCustom);
  customInput.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Enter") {
      event.preventDefault();
      applyCustom();
    }
  });

  if (options.selected != null) {
    customInput.value = UNITS.some((unit) => unit.amount === options.selected) ? "" : String(options.selected);
  }
  customWrap.hidden = !(options.selected === null || customDirty);
  updateVisual();

  return {
    element: h("div", { class: "pub-ladder" }, inputs, customWrap),
    setSelected: (amount: number | null) => {
      selected = amount;
      updateVisual();
    },
    customInput,
  };
}
