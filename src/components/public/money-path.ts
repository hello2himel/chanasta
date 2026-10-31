/**
 * The money-path band — the product's whole thesis in one full-bleed section.
 *
 *   supporter's app  →  (money)  →  creator's account
 *   and a bracketed note: "Chanasta — outside this path."
 *
 * This is the only section on the landing page that gets full-bleed weight
 * (docs/redesign.md §3), and the only place where the real three-step sequence
 * is numbered.
 */
import { h } from "../../lib/dom.ts";
import { icon, type IconName } from "../icons.ts";

export interface MoneyPathCopy {
  title: string;
  lead: string;
  supporter: string;
  money: string;
  creator: string;
  bracket: string;
  steps: readonly { title: string; body: string }[];
}

export function renderMoneyPath(copy: MoneyPathCopy): HTMLElement {
  const bracketParts = copy.bracket.split("—").map((part) => part.trim());
  const node = (iconName: IconName, label: string, variant: "app" | "account") =>
    h(
      "div",
      { class: ["pub-path__node", `pub-path__node--${variant}`] },
      h("span", { class: "pub-path__node-icon", html: icon(iconName, 22), attrs: { "aria-hidden": "true" } }),
      h("span", { class: "pub-path__node-label", text: label }),
    );

  return h(
    "section",
    { class: "pub-band pub-band--path", attrs: { "aria-labelledby": "pub-path-title" } },
    h(
      "div",
      { class: "pub-band__inner" },
      h(
        "header",
        { class: "pub-band__head" },
        h("h2", { class: "pub-band__title", id: "pub-path-title", text: copy.title }),
        h("p", { class: "pub-band__lead", text: copy.lead }),
      ),
      h(
        "div",
        { class: "pub-path" },
        node("wallet", copy.supporter, "app"),
        h(
          "div",
          { class: "pub-path__money", attrs: { "aria-hidden": "true" } },
          h("span", { class: "pub-path__line" }),
          h("span", { class: "pub-path__money-label", text: copy.money }),
          h("span", { class: "pub-path__arrow", html: icon("arrowRight", 22) }),
        ),
        node("bank", copy.creator, "account"),
      ),
      h(
        "p",
        { class: "pub-path__bracket" },
        h("strong", { text: bracketParts[0] }),
        h("span", { text: bracketParts[1] ? ` — ${bracketParts[1]}` : "" }),
      ),
      h("div", { class: "pub-band__rule", attrs: { "aria-hidden": "true" } }),
      h(
        "ol",
        { class: "pub-steps" },
        ...copy.steps.map((step, index) =>
          h(
            "li",
            { class: "pub-steps__item" },
            h("span", { class: "pub-steps__n", text: index === 0 ? "১" : index === 1 ? "২" : "৩", attrs: { "aria-hidden": "true" } }),
            h(
              "div",
              { class: "pub-steps__body" },
              h("h3", { class: "pub-steps__title", text: step.title }),
              h("p", { class: "pub-steps__text", text: step.body }),
            ),
          ),
        ),
      ),
    ),
  );
}
