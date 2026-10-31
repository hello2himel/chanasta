/**
 * `/dashboard` — the support-messages inbox. Newest first, filters with counts,
 * confirm / hide / restore (self-reported → creator-confirmed, never "paid").
 */
import { h, announce } from "../../lib/dom.ts";
import { formatTaka } from "../../lib/format.ts";
import { messageForError } from "../../lib/messages.ts";
import type { AppContext } from "../../lib/app.ts";
import { cx } from "../../lib/app.ts";
import type { ReviewAction, SupportClaim } from "../../lib/types.ts";
import { icon } from "../../components/icons.ts";
import { button, emptyState, linkButton } from "../../components/ui.ts";
import { copyPageLink } from "../../components/layout.ts";
import { renderDashboardClaimCard } from "../../components/claim.ts";
import {
  afterMutation,
  countsOf,
  dashboardHeading,
  dashboardPage,
  inlineBanner,
  loadClaims,
  loadOwnData,
  noPageContent,
} from "./common.ts";

const FILTERS = ["all", "unverified", "confirmed", "hidden"] as const;
type Filter = (typeof FILTERS)[number];

export async function renderDashboardInbox(ctx: AppContext): Promise<HTMLElement> {
  const own = await loadOwnData(ctx);
  if (!own.creator) {
    return dashboardPage(ctx, { active: "inbox", creator: null, signedIn: own.signedIn, content: noPageContent(ctx) });
  }
  const creator = own.creator;
  const claims = await loadClaims(ctx, creator);
  const counts = countsOf(claims);
  const filter = (ctx.params.claimFilter ?? "all") as Filter;
  const filtered = filter === "all" ? claims : claims.filter((claim) => claim.status === filter);

  const header = dashboardHeading(ctx, ctx.t("dashboard.inbox.title"), ctx.t("dashboard.inbox.desc"), [
    button({
      label: ctx.t("dashboard.share"),
      variant: "secondary",
      size: "sm",
      icon: "share",
      onClick: () => void copyPageLink(ctx, creator.slug),
    }),
    linkButton({
      href: ctx.href(`/@${creator.slug}`),
      label: ctx.t("dashboard.viewPage"),
      variant: "ghost",
      size: "sm",
      icon: "external",
    }),
  ]);

  const filterRow = h(
    "nav",
    { class: "filters", attrs: { "aria-label": ctx.t("dashboard.table.caption") } },
    ...FILTERS.map((value) => {
      const count = value === "all" ? counts.all : counts[value];
      const label = ctx.t(`dashboard.filters.${value}`);
      const active = value === filter;
      return h(
        "a",
        {
          class: cx("filters__link", active && "filters__link--active"),
          attrs: {
            href: value === "all" ? ctx.href("/dashboard") : `${ctx.href("/dashboard")}?f=${value}`,
            "data-link": true,
            "aria-current": active ? "page" : null,
          },
        },
        h("span", { text: label }),
        h("span", { class: "filters__count", text: String(count) }),
        h("span", { class: "sr-only", text: ` (${ctx.t("dashboard.table.caption")}: ${count})` }),
      );
    }),
  );

  const list = h("div", { class: "inbox" });
  const handleReview = (claim: SupportClaim, action: ReviewAction) => {
    void ctx.data
      .reviewClaim(claim.id, action)
      .then((updated) => {
        const message =
          action === "confirm"
            ? ctx.t("dashboard.confirmedToast")
            : action === "hide"
              ? ctx.t("dashboard.hiddenToast")
              : ctx.t("dashboard.restoredToast");
        announce(message);
        if (action === "hide") {
          afterMutation(ctx, message, {
            undo: async () => {
              await ctx.data.reviewClaim(claim.id, "restore");
              announce(ctx.t("dashboard.restoredToast"));
            },
          });
        } else {
          afterMutation(ctx, message);
        }
        void updated;
      })
      .catch((error: unknown) => {
        list.prepend(inlineBanner(ctx, { message: messageForError(ctx, error), tone: "error" }));
      });
  };

  if (filtered.length === 0) {
    list.append(
      claims.length === 0
        ? h(
            "div",
            { class: "dash-panel" },
            emptyState({
              icon: "message",
              title: ctx.t("dashboard.noClaims"),
              action: button({
                label: ctx.t("dashboard.share"),
                variant: "primary",
                size: "sm",
                icon: "share",
                onClick: () => void copyPageLink(ctx, creator.slug),
              }),
            }),
            h(
              "p",
              { class: "dash-note" },
              h("a", { class: "link", attrs: { href: ctx.href(`/@${creator.slug}`), "data-link": true }, text: ctx.t("dashboard.viewPage") }),
            ),
          )
        : h(
            "div",
            { class: "dash-panel" },
            emptyState({
              icon: "info",
              title: ctx.t("dashboard.filterEmpty"),
              action: linkButton({
                href: ctx.href("/dashboard"),
                label: ctx.t("dashboard.showAll"),
                variant: "secondary",
                size: "sm",
              }),
            }),
          ),
    );
  } else {
    list.append(
      h(
        "ul",
        { class: "inbox__list", attrs: { "aria-label": ctx.t("dashboard.table.caption") } },
        ...filtered.map((claim) =>
          h(
            "li",
            { class: "inbox__item" },
            renderDashboardClaimCard(ctx, claim, { onReview: handleReview }),
          ),
        ),
      ),
    );
  }

  const countNote = h(
    "p",
    { class: "dash-count", attrs: { "aria-live": "polite" } },
    h("span", { text: `${filtered.length}` }),
    h("span", {
      text:
        ctx.lang === "bn"
          ? `টি ${filter === "all" ? "বার্তা" : ctx.t(`dashboard.filters.${filter}`)}`
          : ` ${filter === "all" ? "messages" : ctx.t(`dashboard.filters.${filter}`).toLowerCase()}`,
    }),
    counts.unverified > 0 ? h("span", { class: "dash-count__new" }, ` · ${ctx.t("dashboard.newClaims", { count: counts.unverified })}`) : null,
  );

  const content = h(
    "div",
    {},
    header,
    filterRow,
    countNote,
    counts.hidden > 0 && filter === "all"
      ? h("p", { class: "dash-hint" }, h("span", { html: icon("eyeOff", 14) }), ctx.t("dashboard.removeWarning"))
      : null,
    list,
    h(
      "p",
      { class: "dash-hint" },
      h("span", { html: icon("info", 14) }),
      ctx.t("honesty.claimsNote"),
    ),
  );

  // The amount column is used in the accessible labels above; keep the import meaningful.
  void formatTaka;

  return dashboardPage(ctx, {
    active: "inbox",
    creator,
    signedIn: own.signedIn,
    counts,
    content,
  });
}
