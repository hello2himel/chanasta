/**
 * Ledger rows — the quiet, hairline-ruled lists that replace floating cards
 * (docs/redesign.md §1: ledger rows instead of a card grid).
 *
 * The claims ledger is the trust surface: every row is a supporter's own note,
 * so it always carries a stamp ("self-reported" or "creator confirmed") and the
 * no-receipt line lives in the section header.
 */
import { h } from "../../lib/dom.ts";
import { formatTaka, relativeDate, relativeTimeTag } from "../../lib/format.ts";
import type { AppContext } from "../../lib/app.ts";
import type { Creator, SupportClaim } from "../../lib/types.ts";
import type { IconName } from "../icons.ts";
import { icon } from "../icons.ts";
import { pubAvatar, pubButton, pubSlug, pubStamp } from "./primitives.ts";

// ---- generic rows ---------------------------------------------------------

export interface PubLedgerRowOptions {
  icon?: IconName;
  title: string;
  body?: string;
  meta?: string;
  trailing?: Node;
}

export function pubLedgerRow(options: PubLedgerRowOptions): HTMLElement {
  const content = [
    h("div", { class: "pub-ledger__body" },
      h("h3", { class: "pub-ledger__title", text: options.title }),
      options.body ? h("p", { class: "pub-ledger__text", text: options.body }) : null,
      options.meta ? h("p", { class: "pub-ledger__meta", text: options.meta }) : null,
    ),
    options.trailing ?? null,
  ];
  const row = h(
    "li",
    { class: "pub-ledger__row" },
    options.icon
      ? h("span", { class: "pub-ledger__icon", html: icon(options.icon, 20), attrs: { "aria-hidden": "true" } })
      : null,
    ...content,
  );
  return row;
}

export function pubLedgerList(rows: Node[], modifier?: string): HTMLUListElement {
  return h("ul", { class: ["pub-ledger", modifier ?? ""] }, ...rows);
}

// ---- demo strip -----------------------------------------------------------

/**
 * The three synthetic demo creators, stamped DEMO in both languages. Kept on
 * the landing page so visitors can try a real supporter page before making one.
 */
export function renderDemoStrip(
  ctx: AppContext,
  creators: readonly Creator[],
  copy: { title: string; intro: string; open: string; demoBadge: string },
): HTMLElement {
  return h(
    "section",
    { class: "pub-demo-strip", attrs: { id: "demo-pages", "aria-labelledby": "pub-demo-title" } },
    h(
      "header",
      { class: "pub-section-head pub-section-head--inline" },
      h("div", {},
        h("h2", { class: "pub-section-head__title", id: "pub-demo-title", text: copy.title }),
        h("p", { class: "pub-section-head__lead", text: copy.intro }),
      ),
    ),
    h(
      "ul",
      { class: "pub-demo-strip__list" },
      ...creators.map((creator) =>
        h(
          "li",
          { class: "pub-demo-strip__item" },
          h(
            "a",
            {
              class: "pub-demo-strip__link",
              attrs: { href: ctx.href(`/@${creator.slug}`), "data-link": true },
            },
            pubAvatar(creator.avatar_emoji, "md"),
            h(
              "span",
              { class: "pub-demo-strip__names" },
              h("span", { class: "pub-demo-strip__name", text: creator.display_name }),
              pubSlug(creator.slug, "pub-demo-strip__slug"),
            ),
            creator.tagline ? h("span", { class: "pub-demo-strip__tagline", text: creator.tagline }) : null,
            h("span", { class: "pub-demo-strip__end" },
              pubStamp(copy.demoBadge, "demo", "store"),
              h("span", { class: "pub-demo-strip__open", text: copy.open }),
            ),
          ),
        ),
      ),
    ),
  );
}

// ---- who it is for --------------------------------------------------------

export interface WhoRow {
  icon: IconName;
  title: string;
  body: string;
}

export function renderWhoLedger(rows: WhoRow[], options: { title: string; lead: string; id?: string }): HTMLElement {
  return h(
    "section",
    { class: "pub-who", attrs: { "aria-labelledby": options.id ?? "pub-who-title" } },
    h(
      "header",
      { class: "pub-section-head" },
      h("h2", { class: "pub-section-head__title", id: options.id ?? "pub-who-title", text: options.title }),
      h("p", { class: "pub-section-head__lead", text: options.lead }),
    ),
    pubLedgerList(
      rows.map((row) =>
        h(
          "li",
          { class: "pub-ledger__row" },
          h("span", { class: "pub-ledger__icon", html: icon(row.icon, 20), attrs: { "aria-hidden": "true" } }),
          h(
            "div",
            { class: "pub-ledger__body" },
            h("h3", { class: "pub-ledger__title", text: row.title }),
            h("p", { class: "pub-ledger__text", text: row.body }),
          ),
        ),
      ),
      "pub-ledger--who",
    ),
  );
}

// ---- honesty limits -------------------------------------------------------

export function renderLimits(
  options: {
    title: string;
    doTitle: string;
    doItems: readonly string[];
    dontTitle: string;
    dontItems: readonly string[];
    terms?: string;
  },
  id = "pub-limits-title",
): HTMLElement {
  const row = (text: string, kind: "do" | "dont") =>
    h(
      "li",
      { class: "pub-limits__item" },
      h("span", {
        class: ["pub-limits__mark", `pub-limits__mark--${kind}`],
        html: icon(kind === "do" ? "check" : "x", 16),
        attrs: { "aria-hidden": "true" },
      }),
      h("span", { text }),
    );

  return h(
    "section",
    { class: "pub-limits", attrs: { "aria-labelledby": id } },
    h(
      "header",
      { class: "pub-section-head" },
      h("h2", { class: "pub-section-head__title", id, text: options.title }),
    ),
    h(
      "div",
      { class: "pub-limits__grid" },
      h(
        "div",
        { class: "pub-limits__col" },
        h("h3", { class: "pub-limits__heading", text: options.doTitle }),
        h("ul", { class: "pub-limits__list" }, ...options.doItems.map((item) => row(item, "do"))),
      ),
      h(
        "div",
        { class: "pub-limits__col pub-limits__col--dont" },
        h("h3", { class: "pub-limits__heading", text: options.dontTitle }),
        h("ul", { class: "pub-limits__list" }, ...options.dontItems.map((item) => row(item, "dont"))),
      ),
    ),
    options.terms ? h("p", { class: "pub-limits__terms", text: options.terms }) : null,
  );
}

// ---- claims ledger --------------------------------------------------------

export interface ClaimsLedgerOptions {
  title: string;
  note: string;
  empty: string;
  moreLabel: string;
  pageSize?: number;
}

const CLAIM_PAGE_SIZE = 12;

/**
 * The public thank-you ledger. Claims render newest first; each row shows the
 * amount, the supporter's own words and the self-reported/confirmed stamp.
 * TxIDs are never part of the public claim data, so they cannot leak here.
 */
export function renderClaimsLedger(
  ctx: AppContext,
  claims: readonly SupportClaim[],
  options: ClaimsLedgerOptions,
): HTMLElement {
  const section = h(
    "section",
    { class: "pub-claims", attrs: { "aria-labelledby": "pub-claims-title" } },
    h(
      "header",
      { class: "pub-claims__head" },
      h("h2", { class: "pub-section-head__title", id: "pub-claims-title", text: options.title }),
      h("p", { class: "pub-claims__note", text: options.note }),
    ),
  );

  if (claims.length === 0) {
    section.append(
      h("p", { class: "pub-claims__empty", text: options.empty }),
    );
    return section;
  }

  const pageSize = options.pageSize ?? CLAIM_PAGE_SIZE;
  const list = h("ul", { class: "pub-ledger pub-ledger--claims" });
  let shown = 0;

  const claimRow = (claim: SupportClaim): HTMLElement => {
    const name = claim.supporter_name?.trim() || ctx.t("claim.anonymous");
    const stamp =
      claim.status === "confirmed"
        ? pubStamp(ctx.t("claim.badge.creatorConfirmed"), "confirmed", "checkCircle")
        : pubStamp(ctx.t("claim.badge.selfReported"), "self", "info");
    const method = claim.method_kind ? ctx.t(`claim.method.${claim.method_kind}`) : "";
    return h(
      "li",
      { class: "pub-ledger__row pub-claim" },
      h(
        "div",
        { class: "pub-claim__head" },
        h("span", { class: "pub-claim__amount", text: formatTaka(claim.amount_bdt), attrs: { dir: "ltr" } }),
        stamp,
      ),
      h(
        "div",
        { class: "pub-claim__body" },
        h("p", { class: "pub-claim__name", text: name }),
        claim.message
          ? h("blockquote", { class: "pub-claim__message" }, h("p", { text: claim.message }))
          : null,
        h(
          "p",
          { class: "pub-claim__meta" },
          method ? h("span", { text: method }) : null,
          method ? " · " : null,
          h("time", { attrs: { datetime: relativeTimeTag(claim.created_at) }, text: relativeDate(ctx.lang, claim.created_at) }),
        ),
      ),
    );
  };

  const append = (batch: readonly SupportClaim[]) => {
    for (const claim of batch) list.append(claimRow(claim));
  };

  const first = claims.slice(0, pageSize);
  shown = first.length;
  append(first);
  section.append(list);

  if (claims.length > pageSize) {
    const more = pubButton({
      label: options.moreLabel,
      variant: "secondary",
      size: "sm",
      onClick: () => {
        const next = claims.slice(shown, shown + pageSize);
        shown += next.length;
        append(next);
        more.hidden = shown >= claims.length;
      },
    });
    section.append(h("div", { class: "pub-claims__more" }, more));
  }

  return section;
}
