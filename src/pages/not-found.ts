/** 404 / unknown route and suspended-page fallback — a "bill not found" slip. */
import { h } from "../lib/dom.ts";
import type { AppContext } from "../lib/app.ts";
import { icon } from "../components/icons.ts";
import { pubLink } from "../components/public/primitives.ts";
import { COPY, pick } from "./copy.public.ts";

export function renderNotFound(ctx: AppContext, options: { suspended?: boolean } = {}): HTMLElement {
  const copy = COPY.notFound;
  const t = pick(ctx.lang);
  const title = options.suspended ? t(copy.suspendedTitle) : t(copy.title);
  const body = options.suspended ? t(copy.suspendedBody) : t(copy.body);

  return h(
    "section",
    { class: "pub-page pub-not-found", attrs: { "aria-labelledby": "pub-not-found-title" } },
    h(
      "article",
      { class: "pub-slip pub-slip--not-found" },
      h(
        "header",
        { class: "pub-slip__head" },
        h(
          "span",
          { class: "pub-slip__brand" },
          h("span", { class: "pub-slip__brand-icon", html: icon("cup", 18), attrs: { "aria-hidden": "true" } }),
          h("span", { text: ctx.lang === "bn" ? "চানাস্তা" : "Chanasta" }),
        ),
        h("p", { class: "pub-slip__kicker", text: t(copy.kicker) }),
      ),
      h(
        "div",
        { class: "pub-slip__intro" },
        h("span", { class: "pub-slip__icon", html: icon("receipt", 30), attrs: { "aria-hidden": "true" } }),
        h("h1", { class: "pub-slip__title", id: "pub-not-found-title", text: title }),
        h("p", { class: "pub-slip__lead", text: body }),
      ),
      h(
        "div",
        { class: "pub-not-found__actions" },
        pubLink({ href: ctx.href("/"), label: t(copy.home), icon: "home" }),
        pubLink({ href: ctx.href("/@demo-teacher"), label: t(copy.demo), variant: "secondary", iconTrailing: "arrowRight" }),
      ),
      h("div", { class: "pub-slip__tear", attrs: { "aria-hidden": "true" } }, h("span", { class: "pub-slip__tear-line" })),
      h(
        "footer",
        { class: "pub-slip__stub" },
        h("p", { class: "pub-slip__not-receipt", text: ctx.t("honesty.footer") }),
        h(
          "p",
          { class: "pub-slip__stub-note" },
          h(
            "a",
            { class: "pub-text-link", attrs: { href: ctx.href("/onboarding"), "data-link": true } },
            t(copy.creator),
          ),
        ),
      ),
    ),
  );
}
