/**
 * Shared creator-app shell + data loading.
 *
 * The global header/footer come from the Lead-owned chrome; this module renders
 * the creator header (RemixIcon avatar, name, mono slug, status stamp), the route
 * tabs and the page-content container in the coffee ledger language.
 */
import { h, copyText, toast } from "../../lib/dom.ts";
import { formatDate } from "../../lib/format.ts";
import type { AppContext } from "../../lib/app.ts";
import type { Creator, PaymentMethod, Session, SupportClaim } from "../../lib/types.ts";
import { appAvatar, appButton, appDialog, appEmpty, appLink, appStamp, appTabs, appBanner } from "../../components/app/ui.ts";
import { renderAppShareKit } from "../../components/app/share.ts";
import type { ResolvedAppCopy } from "../copy.app.ts";

export type DashboardSection = "inbox" | "profile" | "payments" | "settings";

export interface OwnData {
  session: Session | null;
  creator: Creator | null;
  signedIn: boolean;
}

export async function loadOwnData(ctx: AppContext): Promise<OwnData> {
  const session = await ctx.data.getSession().catch(() => null);
  const creator = await ctx.data.getMyCreator().catch(() => null);
  return { session, creator, signedIn: Boolean(session) };
}

export async function loadMethods(ctx: AppContext, creator: Creator | null): Promise<PaymentMethod[]> {
  if (!creator) return [];
  return ctx.data.listMyPaymentMethods(creator.id).catch(() => []);
}

export async function loadClaims(ctx: AppContext, creator: Creator | null): Promise<SupportClaim[]> {
  if (!creator) return [];
  return ctx.data.listMyClaims(creator.id).catch(() => []);
}

export function countsOf(claims: SupportClaim[]): {
  all: number;
  unverified: number;
  confirmed: number;
  hidden: number;
  rejected: number;
} {
  return {
    all: claims.length,
    unverified: claims.filter((claim) => claim.status === "unverified").length,
    confirmed: claims.filter((claim) => claim.status === "confirmed").length,
    hidden: claims.filter((claim) => claim.status === "hidden").length,
    rejected: claims.filter((claim) => claim.status === "rejected").length,
  };
}

function creatorStamp(creator: Creator, copy: ResolvedAppCopy): HTMLElement {
  if (creator.status === "published") {
    return appStamp({ label: copy.statusPublished, tone: "confirmed", icon: "checkbox-circle-line" });
  }
  if (creator.status === "suspended") {
    return appStamp({ label: copy.statusSuspended, tone: "danger", icon: "alert-line" });
  }
  return appStamp({ label: copy.statusDraft, tone: "self", icon: "draft-line" });
}

export function creatorHeader(
  ctx: AppContext,
  options: { creator: Creator; copy: ResolvedAppCopy; onShare?: () => void },
): HTMLElement {
  const { creator, copy } = options;
  const actions = h(
    "div",
    { class: "app-creator__actions" },
    options.onShare
      ? appButton({ label: copy.copyLink, variant: "secondary", size: "sm", icon: "share-line", onClick: options.onShare })
      : null,
    appLink({ label: copy.viewPage, href: ctx.href(`/@${creator.slug}`), variant: "ghost", size: "sm", icon: "external-link-line" }),
  );

  return h(
    "header",
    { class: "app-creator" },
    h(
      "div",
      { class: "app-creator__identity" },
      appAvatar(creator.avatar_emoji, "lg", creator.display_name),
      h(
        "div",
        { class: "app-creator__names" },
        h("h1", { class: "app-creator__name", text: creator.display_name, attrs: { tabindex: "-1" } }),
        h(
          "div",
          { class: "app-creator__meta" },
          h("span", { class: "app-mono app-creator__slug", text: `@${creator.slug}`, attrs: { dir: "ltr" } }),
          creatorStamp(creator, copy),
          creator.published_at
            ? h("span", { class: "app-creator__updated", text: formatDate(ctx.lang, creator.published_at) })
            : null,
        ),
      ),
    ),
    actions,
  );
}

export function appShell(
  ctx: AppContext,
  options: {
    active: DashboardSection;
    creator: Creator | null;
    copy: ResolvedAppCopy;
    counts?: { unverified: number };
    content: Node;
    onShare?: () => void;
  },
): HTMLElement {
  const share =
    options.onShare ??
    (() => {
      if (!options.creator) return;
      const url = `${ctx.origin}${ctx.href(`/@${options.creator.slug}`)}`;
      void copyText(url).then((ok) => toast(ok ? options.copy.copiedLink : options.copy.copyFailed));
    });
  const items = [
    { label: options.copy.navMessages, href: ctx.href("/dashboard"), active: options.active === "inbox", count: options.counts?.unverified },
    { label: options.copy.navPayments, href: ctx.href("/dashboard/payments"), active: options.active === "payments" },
    { label: options.copy.navProfile, href: ctx.href("/dashboard/profile"), active: options.active === "profile" },
    { label: options.copy.navSettings, href: ctx.href("/dashboard/settings"), active: options.active === "settings" },
  ];
  return h(
    "div",
    { class: "app-page" },
    options.creator ? creatorHeader(ctx, { creator: options.creator, copy: options.copy, onShare: share }) : null,
    appTabs({ items, ariaLabel: options.copy.navDashboard }),
    h("div", { class: "app-page__content" }, options.content),
  );
}

export function noPageContent(ctx: AppContext, copy: ResolvedAppCopy): HTMLElement {
  return h(
    "div",
    { class: "app-page" },
    h(
      "div",
      { class: "app-page__content" },
      appEmpty({
        icon: "store-2-line",
        title: copy.noPageTitle,
        body: copy.noPageBody,
        action: appLink({ label: copy.noPageCta, href: ctx.href("/onboarding"), variant: "primary", icon: "add-line" }),
      }),
      ctx.isDemoMode ? h("p", { class: "app-note", text: copy.demoNote }) : null,
    ),
  );
}

export async function openShareDialog(
  ctx: AppContext,
  options: { creator: Creator; methods: PaymentMethod[]; copy: ResolvedAppCopy },
): Promise<void> {
  await appDialog({
    title: options.copy.shareTitle,
    content: h("div", { class: "app-share-dialog" }, renderAppShareKit(ctx, options)),
    actions: [{ id: "close", label: options.copy.close, variant: "secondary" }],
  });
}

export function afterMutation(
  ctx: AppContext,
  message: string,
  options: { undo?: () => Promise<void>; undoLabel?: string } = {},
): void {
  if (options.undo) {
    toast(message, {
      actionLabel: options.undoLabel ?? "",
      onAction: () => {
        void options.undo?.().then(() => ctx.refresh());
      },
    });
  } else {
    toast(message);
  }
  ctx.refresh();
}

export function inlineError(message: string): HTMLElement {
  return appBanner({ tone: "error", body: message });
}
