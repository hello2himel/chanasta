/**
 * `/@:slug` — the product. Identity, amount ladder, the creator's own payment
 * methods, the self-reported claim form and the public claim list.
 *
 * The amount chips re-render the QR with `withAmount(base, amount)` (architecture
 * §5, Lead-approved); ইচ্ছেমতো keeps the static payload. No account is ever
 * substituted, and the decode badge + honesty strip are always visible.
 */
import { h, announce, focusElement, scrollToElement } from "../lib/dom.ts";
import { formatDate, formatTaka } from "../lib/format.ts";
import { parseTaka } from "../lib/validate.ts";
import { getSelectedAmount, setSelectedAmount } from "../lib/prefs.ts";
import type { AppContext } from "../lib/app.ts";
import type { Creator, PaymentMethod } from "../lib/types.ts";
import { icon } from "../components/icons.ts";
import {
  amountChips,
  avatar,
  badge,
  button,
  emptyState,
  linkButton,
  sectionHeading,
} from "../components/ui.ts";
import { renderPaymentMethods } from "../components/method-card.ts";
import { renderClaimCard, renderClaimForm } from "../components/claim.ts";
import { renderNotFound } from "./not-found.ts";

const CLAIM_PAGE_SIZE = 12;

function lastUpdated(creator: Creator, methods: PaymentMethod[]): string {
  const dates = [creator.updated_at, ...methods.map((method) => method.updated_at)].filter(Boolean) as string[];
  const newest = dates
    .map((value) => ({ value, time: Date.parse(value) }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((a, b) => b.time - a.time)[0];
  return newest?.value ?? creator.updated_at;
}

export async function renderCreator(ctx: AppContext): Promise<HTMLElement> {
  if (ctx.route.name !== "creator" && ctx.route.name !== "thanks") {
    return renderNotFound(ctx);
  }
  const slug = ctx.route.name === "thanks" ? ctx.route.slug : ctx.route.slug;
  const creator = await ctx.data.getCreator(slug).catch(() => null);
  if (!creator) {
    ctx.setMeta(ctx.t("meta.title.notFound"), { noindex: true });
    return renderNotFound(ctx);
  }

  const methods = await ctx.data.listPaymentMethods(slug).catch(() => [] as PaymentMethod[]);
  const isDraft = creator.status === "draft";
  const published = creator.status === "published";
  const claims = published ? await ctx.data.listPublicClaims(slug).catch(() => []) : [];

  ctx.setMeta(ctx.t("meta.title.creator", { name: creator.display_name }), {
    description: ctx.t("meta.desc.creator", { name: creator.display_name }),
    canonicalPath: `/@${creator.slug}`,
  });
  ctx.setFooterCreator(creator);

  const demo = creator.is_demo === true;
  let selectedAmount: number | null = getSelectedAmount() ?? 20;
  if (selectedAmount > 100_000) selectedAmount = 100_000;

  // ---- identity ----------------------------------------------------------
  const identity = h(
    "section",
    { class: "creator-identity", attrs: { "aria-labelledby": "creator-name" } },
    h(
      "div",
      { class: "creator-identity__row" },
      avatar(creator.avatar_emoji, "lg", undefined),
      h(
        "div",
        { class: "creator-identity__names" },
        h(
          "div",
          { class: "creator-identity__title-row" },
          h("h1", { class: "creator-identity__name", id: "creator-name", text: creator.display_name }),
          demo ? badge({ label: ctx.t("demo.badge"), variant: "demo" }) : null,
        ),
        creator.tagline ? h("p", { class: "creator-identity__tagline", text: creator.tagline }) : null,
      ),
    ),
    h("p", { class: "creator-identity__subline", text: ctx.t("creator.subline", { name: creator.display_name }) }),
    h("p", { class: "creator-identity__updated" },
      `${
        ctx.lang === "bn" ? "সর্বশেষ হালনাগাদ" : "Last updated"
      }: `,
      h("time", { attrs: { datetime: lastUpdated(creator, methods) }, text: formatDate(ctx.lang, lastUpdated(creator, methods)) }),
    ),
    isDraft
      ? h(
          "div",
          { class: "draft-banner draft-banner--page", attrs: { role: "note" } },
          h("span", { class: "draft-banner__icon", html: icon("info", 16) }),
          h("span", { class: "draft-banner__text", text: ctx.t("creator.draftBanner") }),
          h(
            "a",
            { class: "link", attrs: { href: ctx.href("/dashboard/profile"), "data-link": true }, text: ctx.t("creator.draftPublish") },
          ),
        )
      : null,
  );

  // ---- payment methods + claim form -------------------------------------
  const methodsHandle = published || isDraft
    ? renderPaymentMethods(ctx, {
        methods,
        creatorName: creator.display_name,
        amount: selectedAmount,
        creatorSlug: creator.slug,
      })
    : null;

  // Amount ladder (rendered before the methods in the DOM order; CSS moves it on desktop).
  const customWrap = h("div", { class: "amount-custom", attrs: { hidden: true } });
  const customInput = h("input", {
    class: "field__control amount-input__control",
    id: "creator-custom-amount",
    attrs: {
      type: "text",
      inputmode: "numeric",
      autocomplete: "off",
      placeholder: ctx.t("claim.form.amountPlaceholder"),
      "aria-label": ctx.t("creator.amount.customLabel"),
    },
  });
  const customError = h("p", { class: "field__error", attrs: { hidden: true, role: "alert" } });
  customWrap.append(
    h("label", { class: "field__label", attrs: { for: "creator-custom-amount" }, text: ctx.t("creator.amount.customLabel") }),
    h("div", { class: "amount-input" }, h("span", { class: "amount-input__prefix", text: "৳", attrs: { "aria-hidden": "true" } }), customInput),
    h("p", { class: "field__helper", text: ctx.t("creator.amount.customHelper") }),
    customError,
  );

  const applyAmount = (amount: number | null, options: { announceChange?: boolean } = {}) => {
    selectedAmount = amount;
    setSelectedAmount(amount);
    methodsHandle?.update(amount);
    const claimAmountInput = claimSection.querySelector<HTMLInputElement>("#claim-amount");
    if (claimAmountInput && !claimAmountInput.dataset.dirty) {
      claimAmountInput.value = amount === null ? "" : String(amount);
    }
    if (amount !== null && options.announceChange) {
      announce(ctx.t("creator.qr.amountAnnounce", { amount: formatTaka(amount, { symbol: false }) }));
    }
  };

  let claimSection: HTMLElement;

  const chips = amountChips(ctx, {
    selected: selectedAmount,
    onSelect: (amount) => {
      customWrap.hidden = amount !== null;
      if (amount === null) {
        customInput.focus();
        customError.hidden = true;
      }
      applyAmount(amount, { announceChange: amount !== null });
    },
  });

  customInput.addEventListener("change", () => {
    const parsed = parseTaka(customInput.value);
    if (parsed === null || parsed < 1 || parsed > 100_000) {
      customError.textContent = ctx.t("creator.amount.error");
      customError.hidden = false;
      customInput.setAttribute("aria-invalid", "true");
      return;
    }
    customError.hidden = true;
    customInput.removeAttribute("aria-invalid");
    applyAmount(Math.round(parsed), { announceChange: true });
  });
  customInput.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Enter") {
      event.preventDefault();
      customInput.dispatchEvent(new Event("change"));
    }
  });

  const amountSection = h(
    "section",
    { class: "creator-amount", attrs: { "aria-labelledby": "amount-title" } },
    h("h2", { class: "creator-amount__title", id: "amount-title", text: ctx.t("creator.amount.title") }),
    h("p", { class: "creator-amount__helper", text: ctx.t("creator.amount.helper") }),
    chips.element,
    customWrap,
    published && methods.length > 0
      ? button({
          label: ctx.t("creator.cta"),
          variant: "primary",
          block: true,
          iconTrailing: "arrowDown",
          onClick: () => {
            const heading = document.getElementById("how-to-send");
            scrollToElement(heading, 72);
            focusElement(heading as HTMLElement | null);
          },
        })
      : null,
  );

  // ---- claims ------------------------------------------------------------
  const claimsSection = h("section", { class: "creator-claims", attrs: { "aria-labelledby": "claims-title" } });
  const claimsHeader = h(
    "div",
    { class: "creator-claims__header" },
    sectionHeading(ctx.t("creator.claims.title"), "h2", "claims-title"),
    h("p", { class: "creator-claims__note", text: ctx.t("honesty.claimsNote") }),
  );
  claimsSection.append(claimsHeader);

  let shown = 0;
  const claimsList = h("ul", { class: "claim-list", attrs: { "aria-labelledby": "claims-title" } });
  const moreButton = button({
    label: ctx.t("creator.claims.more"),
    variant: "secondary",
    size: "sm",
    onClick: () => {
      const next = claims.slice(shown, shown + CLAIM_PAGE_SIZE);
      shown += next.length;
      appendClaims(next);
      moreButton.hidden = shown >= claims.length;
      announce(ctx.t("creator.claims.more"));
    },
  });
  const appendClaims = (batch: typeof claims) => {
    for (const claim of batch) {
      claimsList.append(h("li", { class: "claim-list__item" }, renderClaimCard(ctx, claim)));
    }
  };
  if (claims.length > 0) {
    const first = claims.slice(0, CLAIM_PAGE_SIZE);
    shown = first.length;
    appendClaims(first);
    claimsSection.append(claimsList);
    moreButton.hidden = shown >= claims.length;
    if (claims.length > CLAIM_PAGE_SIZE) claimsSection.append(h("div", { class: "claims__more" }, moreButton));
  } else {
    claimsSection.append(
      emptyState({
        title: ctx.t("creator.claims.empty"),
        action: published && methods.length > 0
          ? button({
              label: ctx.t("claim.cta"),
              variant: "secondary",
              size: "sm",
              onClick: () => {
                scrollToElement(claimSection, 72);
                const heading = claimSection.querySelector<HTMLElement>("#claim-form-title");
                focusElement(heading);
              },
            })
          : undefined,
      }),
    );
  }

  // ---- claim form --------------------------------------------------------
  if (published && methods.length > 0) {
    claimSection = renderClaimForm(ctx, {
      creatorSlug: creator.slug,
      creatorName: creator.display_name,
      methods,
      selectedAmount,
      onSubmitted: () => {
        ctx.navigate(`/@${creator.slug}/thanks`);
      },
    });
  } else if (isDraft && methods.length > 0) {
    claimSection = h(
      "section",
      { class: "claim-form-section claim-form-section--preview" },
      h("h2", { class: "section-heading", text: ctx.t("claim.form.title") }),
      h("p", { class: "claim-form__privacy", text: ctx.t("creator.previewOnly") }),
    );
  } else {
    claimSection = h(
      "section",
      { class: "claim-form-section" },
      h("h2", { class: "section-heading", text: ctx.t("claim.form.title") }),
      h("p", { class: "claim-form__privacy", text: ctx.t("creator.noMethods") }),
    );
  }

  return h(
    "div",
    { class: "creator-page" },
    h("div", { class: "creator-grid" },
      h("div", { class: "creator-grid__identity" }, identity),
      h(
        "div",
        { class: "creator-grid__side" },
        amountSection,
        methodsHandle?.element ?? h("div"),
        claimSection,
      ),
      h("div", { class: "creator-grid__claims" }, claimsSection),
    ),
    h(
      "div",
      { class: "creator-page__report" },
      h("p", { class: "creator-page__report-text", text: ctx.t("report.helper") }),
    ),
  );
}
