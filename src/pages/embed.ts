/**
 * `/embed/@:slug` — compact, iframe-friendly support card.
 *
 * No site nav, no claim form, no full bio: a receipt-flavoured preview that
 * links to the full page. It honours `?lang=` / `?theme=` (handled by the
 * router) and sizes itself with container queries.
 */
import { h } from "../lib/dom.ts";
import { formatTaka, UNITS } from "../lib/format.ts";
import { decodeStatusHelperKey, decodeStatusLabelKey, renderAmountQr } from "../lib/qr-payload.ts";
import { DESHIQR_URL } from "../lib/config.ts";
import { creatorPageUrl, reportMailto } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import { icon } from "../components/icons.ts";
import { pubAvatar, pubLink, pubStamp, pubSlug } from "../components/public/primitives.ts";
import { COPY, pick } from "./copy.public.ts";

export async function renderEmbed(ctx: AppContext): Promise<HTMLElement> {
  if (ctx.route.name !== "embed") {
    return h("p", { class: "pub-embed__error", text: ctx.t("error.generic") });
  }
  const slug = ctx.route.slug;
  const creator = await ctx.data.getCreator(slug).catch(() => null);
  ctx.setMeta(ctx.t("meta.title.embed", { name: creator?.display_name ?? ctx.t("app.name") }), { noindex: true });

  if (!creator) {
    return h(
      "div",
      { class: "pub-page pub-embed-page" },
      h(
        "article",
        { class: "pub-embed-card pub-embed-card--empty", attrs: { role: "status" } },
        h("span", { class: "pub-embed-card__icon", html: icon("info", 28), attrs: { "aria-hidden": "true" } }),
        h("p", { class: "pub-embed-card__empty-title", text: ctx.t("notFound.title") }),
        h("p", { class: "pub-embed-card__empty-body", text: ctx.t("notFound.body") }),
        pubLink({ href: ctx.href("/"), label: ctx.t("notFound.home"), variant: "secondary", size: "sm" }),
      ),
    );
  }

  const methods = await ctx.data.listPaymentMethods(slug).catch(() => []);
  const method = methods[0] ?? null;
  const copy = COPY.embed;
  const t = pick(ctx.lang);
  const pageUrl = creatorPageUrl(creator.slug, ctx.origin, ctx.base);
  const demo = creator.is_demo === true;

  let qrBlock: Node;
  if (method?.qr_payload) {
    const merchantName = method.qr_decoded?.merchant_name ?? null;
    const statusText =
      method.qr_status === "verified" ? ctx.t("creator.qr.status.verified") : ctx.t("creator.qr.status.unverified");
    const ariaLabel = merchantName
      ? ctx.t("creator.qr.srLabel", {
          name: creator.display_name,
          provider: ctx.t(`provider.${method.kind}`),
          status: statusText,
          merchant: merchantName,
        })
      : ctx.t("creator.qr.srLabelNoMerchant", {
          name: creator.display_name,
          provider: ctx.t(`provider.${method.kind}`),
          status: statusText,
        });
    const rendered = renderAmountQr(method.qr_payload, 20, { ariaLabel });
    // The engine SVG carries role="img" + aria-label; one announcement only.
    const plate = h("div", { class: "pub-qr pub-qr--embed" });
    if (rendered.ok && rendered.svg) plate.innerHTML = rendered.svg;
    qrBlock = h(
      "div",
      { class: "pub-embed-card__qr" },
      plate,
      h(
        "div",
        { class: "pub-embed-card__qr-meta" },
        pubStamp(ctx.t(decodeStatusLabelKey(method.qr_status, method.kind)), method.qr_status === "verified" ? "verified" : "unverified", method.qr_status === "verified" ? "checkCircle" : "info"),
      ),
      h("p", { class: "pub-embed-card__helper", text: ctx.t(decodeStatusHelperKey(method.qr_status)) }),
    );
  } else if (method?.account_number) {
    qrBlock = h(
      "div",
      { class: "pub-embed-card__manual" },
      h("span", { class: "pub-embed-card__manual-icon", html: icon("hash", 28), attrs: { "aria-hidden": "true" } }),
      h("p", { class: "pub-embed-card__manual-label", text: t(copy.scan) }),
      pubStamp(ctx.t(decodeStatusLabelKey(method.qr_status, method.kind)), "neutral", "hash"),
    );
  } else {
    qrBlock = h("p", { class: "pub-embed-card__manual-label", text: t(copy.noMethods) });
  }

  const reportHref = reportMailto({ slug: creator.slug, creatorName: creator.display_name, pageUrl, lang: ctx.lang });

  const card = h(
    "article",
    { class: "pub-embed-card", attrs: { "aria-labelledby": "pub-embed-title" } },
    h(
      "header",
      { class: "pub-embed-card__head" },
      pubAvatar(creator.avatar_emoji, "sm"),
      h(
        "div",
        { class: "pub-embed-card__names" },
        h("h1", { class: "pub-embed-card__name", id: "pub-embed-title", text: creator.display_name }),
        creator.tagline ? h("p", { class: "pub-embed-card__tagline", text: creator.tagline }) : null,
        h("p", { class: "pub-embed-card__slug" }, pubSlug(creator.slug)),
      ),
      demo ? pubStamp(ctx.t("demo.badge"), "demo", "store") : null,
    ),
    h(
      "div",
      { class: "pub-embed-card__chips", attrs: { "aria-hidden": "true" } },
      ...UNITS.map((unit) =>
        h("span", { class: "pub-embed-card__chip", text: formatTaka(unit.amount), attrs: { dir: "ltr" } }),
      ),
      h("span", { class: "pub-embed-card__chip pub-embed-card__chip--any", text: t(copy.amountLabel) }),
    ),
    qrBlock,
    h("p", { class: "pub-embed-card__honesty", text: t(copy.honesty) }),
    pubLink({ href: pageUrl, label: t(copy.open), block: true, icon: "external", external: true }),
    h(
      "footer",
      { class: "pub-embed-card__foot" },
      h(
        "a",
        { class: "pub-embed-card__report", attrs: { href: reportHref } },
        h("span", { html: icon("mail", 14), attrs: { "aria-hidden": "true" } }),
        h("span", { text: t(copy.report) }),
      ),
      h(
        "a",
        {
          class: "pub-credit",
          attrs: { href: DESHIQR_URL, target: "_blank", rel: "noopener noreferrer", referrerpolicy: "no-referrer" },
        },
        h("span", { text: "Powered by deshiQR" }),
        h("span", { class: "sr-only", text: ` — ${ctx.t("footer.creditSr")} ${ctx.t("a11y.newTab")}` }),
      ),
    ),
  );

  return h(
    "div",
    { class: "pub-page pub-embed-page" },
    card,
    h("noscript", {}, h("p", { class: "pub-embed-card__noscript", text: ctx.t("creator.qr.noscript") })),
  );
}
