/**
 * `/dashboard` — support notes as a quiet ledger. Newest first, filter tabs with
 * counts, confirm / hide / restore (self-reported → creator-confirmed; never
 * "paid"). All data calls and state transitions are the existing ones.
 */
import { h, announce } from "../../lib/dom.ts";
import { formatTaka, formatDateTime, relativeDate } from "../../lib/format.ts";
import { messageForError } from "../../lib/messages.ts";
import type { AppContext } from "../../lib/app.ts";
import { cx } from "../../lib/app.ts";
import type { ReviewAction, SupportClaim } from "../../lib/types.ts";
import { appBanner, appButton, appCopyRow, appEmpty, appLink, appStamp } from "../../components/app/ui.ts";
import { appCopyFor } from "../copy.app.ts";
import {
  afterMutation,
  appShell,
  countsOf,
  inlineError,
  loadClaims,
  loadMethods,
  loadOwnData,
  noPageContent,
  openShareDialog,
} from "./common.ts";

type Filter = "all" | "unverified" | "confirmed" | "hidden";

function stampFor(ctx: AppContext, claim: SupportClaim): HTMLElement {
  const copy = appCopyFor(ctx.lang);
  if (claim.status === "confirmed") return appStamp({ label: copy.stampConfirmed, tone: "confirmed", icon: "checkbox-circle-line" });
  if (claim.status === "hidden") return appStamp({ label: copy.stampHidden, tone: "outline", icon: "eye-off-line" });
  if (claim.status === "rejected") return appStamp({ label: copy.stampRejected, tone: "danger", icon: "alert-line" });
  return appStamp({ label: copy.stampSelfReported, tone: "self", icon: "draft-line" });
}

function methodLabel(ctx: AppContext, claim: SupportClaim): string {
  return claim.method_kind ? ctx.t(`claim.method.${claim.method_kind}`) : "";
}

export async function renderDashboardInbox(ctx: AppContext): Promise<HTMLElement> {
  const copy = appCopyFor(ctx.lang);
  const own = await loadOwnData(ctx);
  if (!own.creator) return noPageContent(ctx, copy);

  const creator = own.creator;
  const claims = await loadClaims(ctx, creator);
  const counts = countsOf(claims);
  const filter = (ctx.params.claimFilter ?? "all") as Filter;
  const visible = filter === "all" ? claims : claims.filter((claim) => claim.status === filter);
  const duplicateTxids = new Set(
    claims
      .map((claim) => claim.txid?.toLowerCase())
      .filter((txid): txid is string => Boolean(txid))
      .filter((txid, index, all) => all.indexOf(txid) !== index),
  );

  const share = () => {
    void loadMethods(ctx, creator).then((methods) => openShareDialog(ctx, { creator, methods, copy }));
  };

  const review = (claim: SupportClaim, action: ReviewAction, row: HTMLElement) => {
    for (const button of row.querySelectorAll<HTMLButtonElement>(".app-claim__actions button")) {
      button.disabled = true;
    }
    void ctx.data
      .reviewClaim(claim.id, action)
      .then(() => {
        announce(action === "confirm" ? copy.confirmedToast : action === "hide" ? copy.hiddenToast : copy.restoredToast);
        if (action === "hide") {
          afterMutation(ctx, copy.hiddenToast, {
            undoLabel: copy.undo,
            undo: async () => {
              await ctx.data.reviewClaim(claim.id, "restore");
              announce(copy.restoredToast);
            },
          });
        } else {
          afterMutation(ctx, action === "confirm" ? copy.confirmedToast : copy.restoredToast);
        }
      })
      .catch((error: unknown) => {
        row.append(inlineError(messageForError(ctx, error)));
        for (const button of row.querySelectorAll<HTMLButtonElement>(".app-claim__actions button")) {
          button.disabled = false;
        }
      });
  };

  const renderClaim = (claim: SupportClaim): HTMLElement => {
    const detailsId = `claim-details-${claim.id}`;
    const isNew = claim.status === "unverified";
    const who = claim.supporter_name?.trim() || copy.anonymous;
    const details = h("div", { class: "app-claim__details", id: detailsId });
    let detailsBuilt = false;
    const buildDetails = () => {
      if (detailsBuilt) return;
      detailsBuilt = true;
      const detailsList = h(
        "dl",
        { class: "app-kv" },
        h("dt", { text: copy.whenLabel }),
        h("dd", { text: formatDateTime(ctx.lang, claim.created_at) }),
      );
      if (claim.method_kind) {
        detailsList.append(h("dt", { text: copy.navPayments }), h("dd", { text: methodLabel(ctx, claim) }));
      }
      details.append(detailsList);
      if (claim.txid) {
        details.append(
          appCopyRow({
            value: claim.txid,
            label: copy.txidLabel,
            mono: true,
            mask: false,
            copyLabel: copy.copy,
            copiedLabel: copy.copied,
          }),
          h("p", { class: "app-field__helper", text: copy.txidPrivate }),
        );
        if (duplicateTxids.has(claim.txid.toLowerCase())) {
          details.append(appBanner({ tone: "warn", body: copy.duplicateTxid }));
        }
      }
      details.append(h("p", { class: "app-field__helper", text: copy.hideWarning }));
    };

    const detailsButton = appButton({
      label: copy.detailsAction,
      variant: "ghost",
      size: "sm",
      icon: "arrow-down-s-line",
      onClick: () => {
        const expanded = detailsButton.getAttribute("aria-expanded") === "true";
        if (!expanded) buildDetails();
        detailsButton.setAttribute("aria-expanded", String(!expanded));
        details.hidden = expanded;
      },
    });
    detailsButton.setAttribute("aria-expanded", "false");
    detailsButton.setAttribute("aria-controls", detailsId);

    const actions = h("div", { class: "app-claim__actions" });
    if (claim.status === "unverified") {
      actions.append(
        appButton({
          label: copy.confirmAction,
          variant: "primary",
          size: "sm",
          icon: "check-line",
          onClick: () => review(claim, "confirm", row),
        }),
      );
    }
    if (claim.status === "unverified" || claim.status === "confirmed") {
      actions.append(
        appButton({
          label: copy.hideAction,
          variant: "ghost",
          size: "sm",
          icon: "eye-off-line",
          onClick: () => review(claim, "hide", row),
        }),
      );
    }
    if (claim.status === "hidden") {
      actions.append(
        appButton({
          label: copy.restoreAction,
          variant: "secondary",
          size: "sm",
          icon: "eye-line",
          onClick: () => review(claim, "restore", row),
        }),
      );
    }
    if (claim.status !== "rejected") actions.append(detailsButton);

    const row = h(
      "article",
      { class: cx("app-claim", `app-claim--${claim.status}`), attrs: { "aria-labelledby": `claim-who-${claim.id}` } },
      h(
        "div",
        { class: "app-claim__body" },
        h(
          "div",
          { class: "app-claim__top" },
          h("p", { class: "app-claim__who", id: `claim-who-${claim.id}`, text: who }),
          h("p", { class: "app-claim__amount", text: formatTaka(claim.amount_bdt), attrs: { dir: "ltr" } }),
        ),
        claim.message ? h("p", { class: "app-claim__message", text: claim.message }) : null,
        h(
          "div",
          { class: "app-claim__meta" },
          stampFor(ctx, claim),
          isNew ? appStamp({ label: copy.stampNew, tone: "self" }) : null,
          methodLabel(ctx, claim) ? h("span", { class: "app-claim__dot", attrs: { "aria-hidden": "true" } }) : null,
          methodLabel(ctx, claim) ? h("span", { text: methodLabel(ctx, claim) }) : null,
          h("span", { class: "app-claim__dot", attrs: { "aria-hidden": "true" } }),
          h("time", { attrs: { datetime: claim.created_at }, text: relativeDate(ctx.lang, claim.created_at) }),
        ),
        actions,
        claim.status === "unverified" ? h("p", { class: "app-claim__hint", text: copy.confirmHint }) : null,
        details.hidden ? null : details,
      ),
    );
    // Details are empty in the DOM until expanded: the TxID is only rendered
    // into the page when the creator asks for it.
    details.hidden = true;
    row.querySelector(".app-claim__body")?.append(details);
    return row;
  };

  const filterDefs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: copy.filterAll, count: counts.all },
    { id: "unverified", label: copy.filterPending, count: counts.unverified },
    { id: "confirmed", label: copy.filterConfirmed, count: counts.confirmed },
    { id: "hidden", label: copy.filterHidden, count: counts.hidden },
  ];
  const filters = h(
    "div",
    { class: "app-filters", attrs: { role: "group", "aria-label": copy.filterAll } },
    ...filterDefs.map((def) => {
      const active = def.id === filter;
      const href = def.id === "all" ? ctx.href("/dashboard") : `${ctx.href("/dashboard")}?f=${def.id}`;
      return h(
        "a",
        { class: cx("app-filter", active && "app-filter--active"), attrs: { href, "data-link": true, "aria-current": active ? "true" : null } },
        h("span", { text: def.label }),
        h("span", { class: "app-filter__count", text: String(def.count) }),
      );
    }),
  );

  const ledger = h("div", { class: "app-ledger" });
  if (visible.length === 0) {
    ledger.append(
      claims.length === 0
        ? appEmpty({
            icon: "message-3-line",
            title: copy.noNotesTitle,
            body: copy.noNotesBody,
            action: appButton({ label: copy.copyLink, variant: "primary", size: "sm", icon: "share-line", onClick: share }),
          })
        : appEmpty({
            icon: "filter-3-line",
            title: copy.nothingHere,
            action: appLink({ label: copy.filterAll, href: ctx.href("/dashboard"), variant: "secondary", size: "sm" }),
          }),
    );
  } else {
    ledger.append(...visible.map((claim) => renderClaim(claim)));
  }

  const content = h(
    "div",
    { class: "app-inbox" },
    appBanner({ tone: "info", body: copy.claimsHelp, role: "note" }),
    h(
      "div",
      { class: "app-stats", attrs: { "aria-label": copy.atAGlance } },
      h("p", { class: "app-stats__title", text: copy.atAGlance }),
      h(
        "div",
        { class: "app-stats__grid" },
        h("div", { class: "app-stat" }, h("span", { class: "app-stat__label", text: copy.toReviewCount }), h("span", { class: "app-stat__value", text: String(counts.unverified) })),
        h("div", { class: "app-stat" }, h("span", { class: "app-stat__label", text: copy.confirmedCount }), h("span", { class: "app-stat__value", text: String(counts.confirmed) })),
        h("div", { class: "app-stat" }, h("span", { class: "app-stat__label", text: copy.hiddenCount }), h("span", { class: "app-stat__value", text: String(counts.hidden) })),
      ),
    ),
    filters,
    ledger,
    h("p", { class: "app-note", text: copy.noBalanceNote }),
    h("p", { class: "app-note app-note--foot", text: copy.footerNote }),
  );

  return appShell(ctx, {
    active: "inbox",
    creator,
    copy,
    counts,
    onShare: share,
    content,
  });
}
