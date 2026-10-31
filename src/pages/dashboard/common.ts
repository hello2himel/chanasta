/** Shared dashboard helpers: owner data loading, no-page state, shell wiring. */
import { h, toast } from "../../lib/dom.ts";
import type { AppContext } from "../../lib/app.ts";
import type { Creator, PaymentMethod, Session, SupportClaim } from "../../lib/types.ts";
import { button, emptyState, linkButton } from "../../components/ui.ts";
import { demoBanner, renderDashboardShell, type DashboardSection } from "../../components/layout.ts";

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

export function countsOf(claims: SupportClaim[]): { all: number; unverified: number; confirmed: number; hidden: number; rejected: number } {
  return {
    all: claims.length,
    unverified: claims.filter((claim) => claim.status === "unverified").length,
    confirmed: claims.filter((claim) => claim.status === "confirmed").length,
    hidden: claims.filter((claim) => claim.status === "hidden").length,
    rejected: claims.filter((claim) => claim.status === "rejected").length,
  };
}

/** The "no page yet" state (also the local first-run dashboard). */
export function noPageContent(ctx: AppContext): HTMLElement {
  return h(
    "div",
    { class: "dash-content" },
    demoBanner(ctx, "demo.localDashboard"),
    h("header", { class: "page-heading" },
      h("h1", { class: "page-heading__title", text: ctx.t("dashboard.noPage") }),
    ),
    h(
      "div",
      { class: "dash-panel" },
      emptyState({
        icon: "sparkle",
        title: ctx.t("dashboard.noPage"),
        body: ctx.t("dashboard.noPageBody"),
        action: linkButton({
          href: ctx.href("/onboarding"),
          label: ctx.t("dashboard.noPageCta"),
          variant: "primary",
          icon: "plus",
        }),
      }),
      ctx.isDemoMode ? h("p", { class: "dash-note", text: ctx.t("demo.localDashboard") }) : null,
    ),
  );
}

/** Wrap dashboard content in the shell (sidebar + mobile tabs) + page container. */
export function dashboardPage(
  ctx: AppContext,
  options: {
    active: DashboardSection;
    creator: Creator | null;
    signedIn: boolean;
    counts?: ReturnType<typeof countsOf>;
    content: Node;
  },
): HTMLElement {
  const content = h(
    "div",
    { class: "dash-content" },
    ctx.isDemoMode && options.active !== "settings" ? demoBanner(ctx, "demo.localDashboard") : null,
    options.content,
  );
  return renderDashboardShell(ctx, {
    active: options.active,
    creator: options.creator,
    counts: options.counts ? { unverified: options.counts.unverified, all: options.counts.all } : undefined,
    content,
    signedIn: options.signedIn,
  });
}

/** Toast a successful mutation and re-render the current route. */
export function afterMutation(ctx: AppContext, message: string, options: { undo?: () => Promise<void> } = {}): void {
  if (options.undo) {
    toast(message, {
      actionLabel: ctx.t("common.undo"),
      onAction: () => {
        void options.undo?.().then(() => ctx.refresh());
      },
    });
  } else {
    toast(message);
  }
  ctx.refresh();
}

/** Standard dashboard page heading with up to two actions. */
export function dashboardHeading(
  ctx: AppContext,
  title: string,
  description: string,
  actions: Node[] = [],
): HTMLElement {
  return h(
    "header",
    { class: "page-heading page-heading--dash" },
    h("div", { class: "page-heading__text" },
      h("h1", { class: "page-heading__title", text: title, attrs: { tabindex: "-1" } }),
      h("p", { class: "page-heading__desc", text: description }),
    ),
    actions.length > 0 ? h("div", { class: "page-actions" }, ...actions) : null,
  );
}

/** Inline banner used for blocked publish / save failures. */
export function inlineBanner(
  ctx: AppContext,
  options: { message: string; actionLabel?: string; onAction?: () => void; tone?: "warn" | "error" },
): HTMLElement {
  const banner = h(
    "div",
    { class: `inline-banner inline-banner--${options.tone ?? "warn"}`, attrs: { role: "alert" } },
    h("p", { text: options.message }),
  );
  if (options.actionLabel && options.onAction) {
    banner.append(button({ label: options.actionLabel, variant: "secondary", size: "sm", onClick: options.onAction }));
  }
  return banner;
}
