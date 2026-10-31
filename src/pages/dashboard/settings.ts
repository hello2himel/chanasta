/**
 * `/dashboard/settings` — appearance, language, session, legal links and the
 * page-deletion danger zone. No export in MVP (Lead decision), no billing, no
 * notification preferences.
 */
import { h, openDialog, toast } from "../../lib/dom.ts";
import { messageForError } from "../../lib/messages.ts";
import type { AppContext } from "../../lib/app.ts";
import type { ThemePreference } from "../../lib/prefs.ts";
import { icon } from "../../components/icons.ts";
import { button, linkButton } from "../../components/ui.ts";
import { languageToggle } from "../../components/layout.ts";
import { dashboardHeading, dashboardPage, inlineBanner, loadOwnData } from "./common.ts";

export async function renderDashboardSettings(ctx: AppContext): Promise<HTMLElement> {
  const own = await loadOwnData(ctx);
  const creator = own.creator;
  const bannerSlot = h("div", { class: "banner-slot" });

  const themeGroup = h("fieldset", { class: "radio-group" },
    h("legend", { class: "radio-group__legend", text: ctx.t("dashboard.settings.theme") }),
  );
  const themes: { value: ThemePreference; key: string }[] = [
    { value: "system", key: "theme.system" },
    { value: "light", key: "theme.light" },
    { value: "dark", key: "theme.dark" },
  ];
  const currentTheme = (document.documentElement.dataset.theme as ThemePreference | undefined) ?? "system";
  for (const theme of themes) {
    const input = h("input", {
      class: "radio-group__input",
      id: `theme-${theme.value}`,
      attrs: { type: "radio", name: "theme", value: theme.value, checked: currentTheme === theme.value },
    });
    input.addEventListener("change", () => {
      ctx.setTheme(theme.value);
      toast(ctx.t("common.saved"));
    });
    themeGroup.append(
      h("label", { class: "radio-group__option", attrs: { for: `theme-${theme.value}` } },
        input,
        h("span", { text: ctx.t(theme.key) }),
      ),
    );
  }

  const appearance = h(
    "section",
    { class: "settings-section dash-panel", attrs: { "aria-labelledby": "settings-appearance" } },
    h("h2", { class: "settings-section__title", id: "settings-appearance", text: ctx.t("dashboard.settings.appearance") }),
    themeGroup,
    h(
      "div",
      { class: "settings-row" },
      h("span", { class: "settings-row__label", text: ctx.t("dashboard.settings.lang") }),
      languageToggle(ctx),
    ),
  );

  const session = h(
    "section",
    { class: "settings-section dash-panel", attrs: { "aria-labelledby": "settings-session" } },
    h("h2", { class: "settings-section__title", id: "settings-session", text: ctx.t("dashboard.settings.session") }),
    ctx.isDemoMode
      ? h("p", { class: "settings-section__body", text: ctx.t("dashboard.settings.localSession") })
      : h(
          "div",
          { class: "settings-row settings-row--column" },
          h("p", { class: "settings-section__body", text: ctx.t("dashboard.settings.loggedInAs", { email: own.session?.email ?? "" }) }),
          button({
            label: ctx.t("nav.logout"),
            variant: "secondary",
            size: "sm",
            icon: "user",
            onClick: () => {
              void ctx.data.signOut().then(() => {
                toast(ctx.t("nav.logout"));
                ctx.navigate("/");
              });
            },
          }),
        ),
  );

  const legal = h(
    "section",
    { class: "settings-section dash-panel", attrs: { "aria-labelledby": "settings-legal" } },
    h("h2", { class: "settings-section__title", id: "settings-legal", text: ctx.t("dashboard.settings.legal") }),
    h(
      "ul",
      { class: "settings-links" },
      h("li", {}, linkButton({ href: ctx.href("/legal/terms"), label: ctx.t("footer.terms"), variant: "ghost", size: "sm" })),
      h("li", {}, linkButton({ href: ctx.href("/legal/privacy"), label: ctx.t("footer.privacy"), variant: "ghost", size: "sm" })),
      h("li", {}, linkButton({ href: ctx.href("/legal/how-it-works"), label: ctx.t("footer.howItWorks"), variant: "ghost", size: "sm" })),
    ),
  );

  const danger = h(
    "section",
    { class: "settings-section settings-section--danger", attrs: { "aria-labelledby": "settings-danger" } },
    h("h2", { class: "settings-section__title", id: "settings-danger", text: ctx.t("dashboard.settings.danger") }),
    h("p", { class: "settings-section__body", text: ctx.t("dashboard.settings.deleteBody") }),
    ctx.isDemoMode
      ? h("p", { class: "field__helper", text: ctx.t("dashboard.settings.demoNoDelete") })
      : creator
        ? button({
            label: ctx.t("dashboard.settings.delete"),
            variant: "danger",
            size: "sm",
            icon: "trash",
            onClick: () => {
              void (async () => {
                const input = h("input", {
                  class: "field__control",
                  id: "delete-confirm-slug",
                  attrs: { type: "text", autocomplete: "off", spellcheck: "false", "aria-label": ctx.t("dashboard.settings.deleteConfirmLabel", { slug: creator.slug }) },
                });
                const content = h(
                  "div",
                  { class: "field" },
                  h("label", { class: "field__label", attrs: { for: "delete-confirm-slug" }, text: ctx.t("dashboard.settings.deleteConfirmLabel", { slug: creator.slug }) }),
                  input,
                );
                const action = await openDialog({
                  title: ctx.t("dashboard.settings.delete"),
                  description: ctx.t("dashboard.settings.deleteBody"),
                  content,
                  destructive: true,
                  actions: [
                    { id: "cancel", label: ctx.t("common.cancel"), variant: "secondary" },
                    { id: "delete", label: ctx.t("dashboard.settings.delete"), variant: "danger" },
                  ],
                  onAction: (id) => {
                    if (id === "delete" && input.value.trim() !== creator.slug) {
                      input.setAttribute("aria-invalid", "true");
                      input.focus();
                      return false;
                    }
                    return true;
                  },
                });
                if (action !== "delete") return;
                try {
                  await ctx.data.softDeleteCreator(creator.id);
                  toast(ctx.t("dashboard.settings.deletedToast"));
                  ctx.navigate("/");
                } catch (error) {
                  bannerSlot.replaceChildren(inlineBanner(ctx, { message: messageForError(ctx, error), tone: "error" }));
                }
              })();
            },
          })
        : null,
  );

  const content = h(
    "div",
    {},
    dashboardHeading(ctx, ctx.t("dashboard.settings.title"), ctx.t("dashboard.settings.demoNote"), [
      creator
        ? linkButton({ href: ctx.href(`/@${creator.slug}`), label: ctx.t("dashboard.viewPage"), variant: "ghost", size: "sm", icon: "external" })
        : null,
    ].filter(Boolean) as HTMLElement[]),
    bannerSlot,
    ctx.isDemoMode
      ? h(
          "div",
          { class: "inline-banner inline-banner--warn", attrs: { role: "note" } },
          h("span", { html: icon("info", 18) }),
          h("p", { text: ctx.t("dashboard.settings.demoNote") }),
        )
      : null,
    h("div", { class: "settings-grid" }, appearance, session, legal, danger),
  );

  return dashboardPage(ctx, { active: "settings", creator, signedIn: own.signedIn, content });
}
