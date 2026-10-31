/**
 * `/embed/@:slug` — compact, iframe-able support card. No site nav, no claim
 * form, no full bio: a preview that opens the full page. Responds to its iframe
 * width (container queries) and honours `?lang=` / `?theme=`.
 */
import { h } from "../lib/dom.ts";
import { creatorPageUrl } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import { renderPreviewCard } from "../components/preview-card.ts";
import { emptyState, linkButton } from "../components/ui.ts";
import { icon } from "../components/icons.ts";

export async function renderEmbed(ctx: AppContext): Promise<HTMLElement> {
  if (ctx.route.name !== "embed") {
    return h("p", { text: ctx.t("error.generic") });
  }
  const slug = ctx.route.slug;
  const creator = await ctx.data.getCreator(slug).catch(() => null);
  ctx.setMeta(ctx.t("meta.title.embed", { name: creator?.display_name ?? ctx.t("app.name") }), { noindex: true });

  if (!creator) {
    return h(
      "div",
      { class: "embed-page embed-page--empty" },
      emptyState({
        icon: "info",
        title: ctx.t("notFound.title"),
        body: ctx.t("notFound.body"),
        action: linkButton({ href: ctx.href("/"), label: ctx.t("notFound.home"), variant: "secondary", size: "sm" }),
      }),
    );
  }

  const effectiveMethods = await ctx.data.listPaymentMethods(slug).catch(() => []);
  const pageUrl = creatorPageUrl(creator.slug, ctx.origin, ctx.base);

  return h(
    "div",
    { class: "embed-page" },
    effectiveMethods.length > 0
      ? renderPreviewCard(ctx, {
          creator,
          methods: effectiveMethods,
          variant: "embed",
          pageHref: pageUrl,
          amount: 20,
          demo: creator.is_demo === true,
        })
      : h(
          "div",
          { class: "embed-card embed-card--empty" },
          h("p", { text: ctx.t("embed.noMethods") }),
          h(
            "a",
            { class: "embed-card__link", attrs: { href: pageUrl, target: "_blank", rel: "noopener noreferrer" } },
            ctx.t("embed.open"),
          ),
        ),
    h("noscript", {}, h("p", { text: ctx.t("creator.qr.noscript") })),
    h(
      "div",
      { class: "embed-card__credit-row" },
      h(
        "a",
        { class: "embed-card__credit", attrs: { href: pageUrl, target: "_blank", rel: "noopener noreferrer" } },
        icon("external", 12),
        " Powered by deshiQR",
      ),
    ),
  );
}
