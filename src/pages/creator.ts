/**
 * `/@:slug` — the supporter page.
 *
 * Identity → amount ladder → the chai receipt (creator's own QR, derived for the
 * chosen amount with `renderAmountQr`) → other methods with decode badges →
 * the self-reported claim form → the public claims ledger.
 *
 * Every state the old page supported is kept: published, draft preview,
 * suspended/not-found (rendered through the 404 page), no payment methods, no
 * claims, rate-limit/validation errors (the shared claim form owns those),
 * language re-render, amount persistence, and the share/poster actions. The
 * report link and engine credit are part of the shared chrome footer.
 */
import { h, copyText, downloadSvg, toast } from "../lib/dom.ts";
import { formatDate } from "../lib/format.ts";
import { getSelectedAmount, setSelectedAmount } from "../lib/prefs.ts";
import { buildShareKit } from "../lib/share.ts";
import type { AppContext } from "../lib/app.ts";
import type { Creator, PaymentMethod } from "../lib/types.ts";
import { icon } from "../components/icons.ts";
import { pubAvatar, pubButton, pubLink, pubStamp, pubSlug } from "../components/public/primitives.ts";
import { renderAmountLadder } from "../components/public/amount-ladder.ts";
import { lastUpdatedIso, renderReceipt } from "../components/public/receipt.ts";
import { renderMethodPicker } from "../components/public/methods.ts";
import { renderClaimsLedger } from "../components/public/ledger.ts";
import { renderClaimForm } from "../components/claim.ts";
import { renderNotFound } from "./not-found.ts";
import { COPY, pick, receiptCopyFor } from "./copy.public.ts";

const SOCIAL_LABELS: Record<string, string> = {
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  threads: "Threads",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  website: "Website",
};

function socialRow(creator: Creator): HTMLElement | null {
  const entries = Object.entries(creator.socials ?? {}).filter(([, url]) => typeof url === "string" && url.length > 0);
  if (entries.length === 0) return null;
  return h(
    "ul",
    { class: "pub-supporter__socials", attrs: { "aria-label": "Links" } },
    ...entries.slice(0, 4).map(([key, url]) =>
      h(
        "li",
        {},
        h(
          "a",
          {
            class: "pub-supporter__social",
            attrs: { href: url, target: "_blank", rel: "noopener noreferrer" },
          },
          h("span", { text: SOCIAL_LABELS[key] ?? key }),
          h("span", { class: "pub-supporter__social-icon", html: icon("external", 12), attrs: { "aria-hidden": "true" } }),
        ),
      ),
    ),
  );
}

export async function renderCreator(ctx: AppContext): Promise<HTMLElement> {
  if (ctx.route.name !== "creator") return renderNotFound(ctx);
  const slug = ctx.route.slug;
  const creator = await ctx.data.getCreator(slug).catch(() => null);
  if (!creator) {
    ctx.setMeta(ctx.t("meta.title.notFound"), { noindex: true });
    return renderNotFound(ctx);
  }
  if (creator.status === "suspended") {
    ctx.setMeta(ctx.t("meta.title.notFound"), { noindex: true });
    return renderNotFound(ctx, { suspended: true });
  }

  const methods = await ctx.data.listPaymentMethods(slug).catch(() => [] as PaymentMethod[]);
  const published = creator.status === "published";
  const isDraft = creator.status === "draft";
  const claims = published ? await ctx.data.listPublicClaims(slug).catch(() => []) : [];

  ctx.setMeta(ctx.t("meta.title.creator", { name: creator.display_name }), {
    description: ctx.t("meta.desc.creator", { name: creator.display_name }),
    canonicalPath: `/@${creator.slug}`,
  });
  ctx.setFooterCreator(creator);

  const copy = COPY.supporter;
  const t = pick(ctx.lang);
  const demo = creator.is_demo === true;
  const updatedIso = lastUpdatedIso(creator, methods);

  let selectedAmount: number | null = getSelectedAmount() ?? 20;
  if (selectedAmount > 100_000) selectedAmount = 100_000;
  let selectedMethod: PaymentMethod | null = methods[0] ?? null;

  // ---- identity ---------------------------------------------------------
  const identity = h(
    "header",
    { class: "pub-supporter__identity", attrs: { "aria-labelledby": "creator-name" } },
    h(
      "div",
      { class: "pub-supporter__identity-row" },
      pubAvatar(creator.avatar_emoji, "lg"),
      h(
        "div",
        { class: "pub-supporter__names" },
        h(
          "div",
          { class: "pub-supporter__title-row" },
          h("h1", { class: "pub-supporter__name", id: "creator-name", text: creator.display_name }),
          demo ? pubStamp(ctx.t("demo.badge"), "demo", "store") : null,
        ),
        creator.tagline ? h("p", { class: "pub-supporter__tagline", text: creator.tagline }) : null,
        h("p", { class: "pub-supporter__slug-row" }, pubSlug(creator.slug)),
      ),
    ),
    h("p", { class: "pub-supporter__subline", text: ctx.t("creator.subline", { name: creator.display_name }) }),
    creator.bio ? h("p", { class: "pub-supporter__bio", text: creator.bio }) : null,
    socialRow(creator),
    h(
      "p",
      { class: "pub-supporter__updated" },
      `${t(copy.lastUpdated)}: `,
      h("time", { attrs: { datetime: updatedIso }, text: formatDate(ctx.lang, updatedIso) }),
    ),
    isDraft
      ? h(
          "div",
          { class: "pub-note pub-note--warn", attrs: { role: "note" } },
          h("span", { class: "pub-note__icon", html: icon("info", 16), attrs: { "aria-hidden": "true" } }),
          h("span", { text: t(copy.draftBanner) }),
          h("a", { class: "pub-note__link", attrs: { href: ctx.href("/dashboard/profile"), "data-link": true }, text: ctx.t("creator.draftPublish") }),
        )
      : null,
  );

  // ---- receipt (re-rendered on amount / method change) -------------------
  const receiptMount = h("div", { class: "pub-supporter__receipt" });
  const refreshReceipt = () => {
    receiptMount.replaceChildren(
      renderReceipt({
        ctx,
        creator,
        method: selectedMethod,
        amount: selectedAmount,
        copy: receiptCopyFor(ctx.lang),
        demo,
        updatedIso,
      }),
    );
  };
  refreshReceipt();

  const claimFormSection = published && methods.length > 0 ? renderClaimForm(ctx, {
    creatorSlug: creator.slug,
    creatorName: creator.display_name,
    methods,
    selectedAmount,
    onSubmitted: () => ctx.navigate(`/@${creator.slug}/thanks`),
  }) : null;
  claimFormSection?.classList.add("pub-claim-form");
  const claimAmountInput = claimFormSection?.querySelector<HTMLInputElement>("#claim-amount") ?? null;

  const syncClaimAmount = () => {
    if (claimAmountInput && !claimAmountInput.dataset.dirty) {
      claimAmountInput.value = selectedAmount === null ? "" : String(selectedAmount);
    }
  };

  // ---- amount ladder ----------------------------------------------------
  const ladder = renderAmountLadder({
    ctx,
    selected: selectedAmount,
    anyLabel: t(copy.anyAmount),
    anySublabel: t(copy.anyAmountSub),
    customLabel: t(copy.customLabel),
    customPlaceholder: t(copy.customPlaceholder),
    customError: t(copy.customError),
    onSelect: (amount) => {
      selectedAmount = amount;
      setSelectedAmount(amount);
      ladder.setSelected(amount);
      refreshReceipt();
      syncClaimAmount();
    },
  });
  const amountSection = h(
    "section",
    { class: "pub-supporter__amount", attrs: { "aria-labelledby": "pub-amount-title" } },
    h(
      "header",
      { class: "pub-supporter__amount-head" },
      h("h2", { class: "pub-supporter__amount-title", id: "pub-amount-title", text: t(copy.amountTitle) }),
      h("p", { class: "pub-supporter__amount-help", text: t(copy.amountHelper) }),
    ),
    ladder.element,
  );

  // ---- other methods ----------------------------------------------------
  const methodPicker = methods.length > 0
    ? renderMethodPicker({
        ctx,
        methods,
        selectedId: selectedMethod?.id ?? null,
        title: t(copy.methodTitle),
        help: t(copy.methodHelp),
        selectedLabel: t(copy.selectedMethod),
        onSelect: (method) => {
          selectedMethod = method;
          refreshReceipt();
        },
      })
    : null;

  // ---- claim form states ------------------------------------------------
  let claimSection: HTMLElement;
  if (claimFormSection) {
    claimSection = claimFormSection;
  } else if (isDraft && methods.length > 0) {
    claimSection = h(
      "section",
      { class: "pub-claim-form pub-claim-form--note" },
      h("h2", { class: "pub-section-head__title", text: ctx.t("claim.form.title") }),
      h("p", { class: "pub-note", text: t(copy.previewOnly) }),
    );
  } else {
    claimSection = h(
      "section",
      { class: "pub-claim-form pub-claim-form--note" },
      h("h2", { class: "pub-section-head__title", text: ctx.t("claim.form.title") }),
      h("p", { class: "pub-note", text: t(copy.noMethods) }),
    );
  }

  // ---- claims ledger ----------------------------------------------------
  const claimsSection = published
    ? renderClaimsLedger(ctx, claims, {
        title: t(copy.claimsTitle),
        note: t(copy.claimsNote),
        empty: t(copy.claimsEmpty),
        moreLabel: ctx.t("creator.claims.more"),
      })
    : null;

  // ---- share kit (link, WhatsApp/Facebook, A4 poster) -------------------
  const shareKit = buildShareKit({
    slug: creator.slug,
    creatorName: creator.display_name,
    origin: ctx.origin,
    base: ctx.base,
    lang: ctx.lang,
  });
  const copyPageLink = () => {
    void copyText(shareKit.pageUrl).then((ok) => toast(ok ? ctx.t("common.linkCopied") : ctx.t("common.selectToCopy")));
  };
  const downloadPoster = () => {
    // Loaded on demand so the supporter cold load stays lean.
    void import("../lib/poster.ts")
      .then(({ generatePosterSvg }) => {
        const poster = generatePosterSvg({
          creator,
          method: selectedMethod,
          url: shareKit.pageUrl,
          lang: ctx.lang,
          demo,
          amount: selectedAmount,
        });
        if (!poster.ok || !poster.svg) {
          toast(ctx.t("poster.error"));
          return;
        }
        downloadSvg(poster.fileName, poster.svg);
        toast(ctx.t("poster.downloaded"));
      })
      .catch(() => toast(ctx.t("poster.error")));
  };
  const shareSection = h(
    "section",
    { class: "pub-supporter__share", attrs: { "aria-labelledby": "pub-share-title" } },
    h("h2", { class: "pub-supporter__share-title", id: "pub-share-title", text: ctx.t("creator.share") }),
    h(
      "div",
      { class: "pub-supporter__share-actions" },
      pubButton({ label: ctx.t("share.copyLink"), variant: "secondary", size: "sm", icon: "link", onClick: copyPageLink }),
      pubLink({
        href: shareKit.whatsappUrl,
        label: ctx.t("share.whatsapp"),
        variant: "secondary",
        size: "sm",
        icon: "whatsapp",
        external: true,
      }),
      pubLink({
        href: shareKit.facebookUrl,
        label: ctx.t("share.facebook"),
        variant: "secondary",
        size: "sm",
        icon: "facebook",
        external: true,
      }),
      pubButton({ label: ctx.t("share.poster"), variant: "secondary", size: "sm", icon: "download", onClick: downloadPoster }),
    ),
  );

  return h(
    "div",
    { class: "pub-page pub-supporter" },
    h(
      "div",
      { class: "pub-supporter__grid" },
      h("div", { class: "pub-supporter__col pub-supporter__col--side" }, identity, amountSection),
      h(
        "div",
        { class: "pub-supporter__col pub-supporter__col--flow" },
        receiptMount,
        methodPicker,
        claimSection,
      ),
    ),
    claimsSection,
    shareSection,
  );
}
