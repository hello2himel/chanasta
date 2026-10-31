/** 404 / unknown route and suspended-page fallback. */
import { h } from "../lib/dom.ts";
import type { AppContext } from "../lib/app.ts";
import { linkButton } from "../components/ui.ts";
import { steamMark } from "../components/icons.ts";

export function renderNotFound(ctx: AppContext, options: { suspended?: boolean } = {}): HTMLElement {
  return h(
    "section",
    { class: "not-found", attrs: { "aria-labelledby": "not-found-title" } },
    h("span", { class: "not-found__mark", html: steamMark(48), attrs: { "aria-hidden": "true" } }),
    h("h1", { class: "not-found__title", id: "not-found-title", text: options.suspended ? ctx.t("creator.suspended") : ctx.t("notFound.title") }),
    h("p", { class: "not-found__body", text: options.suspended ? ctx.t("demo.creatorNote") : ctx.t("notFound.body") }),
    h(
      "div",
      { class: "not-found__actions" },
      linkButton({ href: ctx.href("/"), label: ctx.t("notFound.home"), variant: "primary", icon: "home" }),
      linkButton({ href: ctx.href("/@demo-teacher"), label: ctx.t("notFound.demo"), variant: "secondary", icon: "arrowRight" }),
    ),
    h(
      "p",
      { class: "not-found__creator" },
      h("a", { class: "link", attrs: { href: ctx.href("/onboarding"), "data-link": true }, text: ctx.t("notFound.creator") }),
    ),
  );
}
