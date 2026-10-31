/**
 * `/dashboard/settings` — appearance, language, session, legal links and the
 * page-deletion danger zone. No billing, no notification preferences, no export
 * in MVP. Deletion is disabled in local demo mode (nothing is on a server).
 */
import { h, toast } from "../../lib/dom.ts";
import { messageForError } from "../../lib/messages.ts";
import { getThemePreference, type ThemePreference } from "../../lib/prefs.ts";
import type { AppContext } from "../../lib/app.ts";
import {
  appBanner,
  appButton,
  appDialog,
  appField,
  appLink,
  appRadioGroup,
  appSectionHead,
} from "../../components/app/ui.ts";
import { appCopyFor } from "../copy.app.ts";
import { appShell, inlineError, loadOwnData, noPageContent } from "./common.ts";

export async function renderDashboardSettings(ctx: AppContext): Promise<HTMLElement> {
  const copy = appCopyFor(ctx.lang);
  const own = await loadOwnData(ctx);
  if (!own.creator) return noPageContent(ctx, copy);
  const creator = own.creator;
  const bannerSlot = h("div", { class: "app-banner-slot" });

  // ---- appearance ---------------------------------------------------------
  const theme = getThemePreference();
  const appearance = h(
    "section",
    { class: "app-section", attrs: { "aria-labelledby": "settings-appearance" } },
    appSectionHead({ title: copy.appearance, description: copy.appearanceBody, id: "settings-appearance" }),
    appRadioGroup({
      legend: copy.themeChoice,
      name: "theme",
      choices: [
        { value: "system", label: copy.themeSystem },
        { value: "light", label: copy.themeLight },
        { value: "dark", label: copy.themeDark },
      ],
      value: theme,
      onChange: (value) => {
        ctx.setTheme(value as ThemePreference);
        toast(copy.saved);
      },
    }),
  );

  // ---- language -----------------------------------------------------------
  const langButton = (value: "bn" | "en", label: string): HTMLElement => {
    const active = ctx.lang === value;
    return h("button", {
      class: `app-langbtn${active ? " app-langbtn--active" : ""}`,
      attrs: { type: "button", "aria-pressed": String(active), lang: value },
      text: label,
    });
  };
  const bnButton = langButton("bn", "বাংলা");
  const enButton = langButton("en", "English");
  bnButton.addEventListener("click", () => ctx.setLang("bn"));
  enButton.addEventListener("click", () => ctx.setLang("en"));
  const language = h(
    "section",
    { class: "app-section", attrs: { "aria-labelledby": "settings-language" } },
    appSectionHead({ title: copy.languageL, id: "settings-language" }),
    h("div", { class: "app-lang", attrs: { role: "group", "aria-label": copy.languageL } }, bnButton, enButton),
  );

  // ---- session ------------------------------------------------------------
  const session = h(
    "section",
    { class: "app-section", attrs: { "aria-labelledby": "settings-session" } },
    appSectionHead({ title: copy.sessionL, id: "settings-session" }),
    ctx.isDemoMode
      ? h("p", { class: "app-note", text: copy.localSession })
      : h(
          "div",
          { class: "app-session" },
          h("p", { class: "app-session__email", text: copy.loggedInAs.replace("{email}", own.session?.email ?? "") }),
          appButton({
            label: copy.logout,
            variant: "secondary",
            size: "sm",
            icon: "logout-box-line",
            onClick: () => {
              void ctx.data.signOut().then(() => {
                toast(copy.logout);
                ctx.navigate("/");
              });
            },
          }),
        ),
  );

  // ---- legal --------------------------------------------------------------
  const legal = h(
    "section",
    { class: "app-section", attrs: { "aria-labelledby": "settings-legal" } },
    appSectionHead({ title: copy.legalL, id: "settings-legal" }),
    h(
      "ul",
      { class: "app-legal-links" },
      h("li", {}, appLink({ label: copy.terms, href: ctx.href("/legal/terms"), variant: "ghost", size: "sm", iconTrailing: "arrow-right-line" })),
      h("li", {}, appLink({ label: copy.privacy, href: ctx.href("/legal/privacy"), variant: "ghost", size: "sm", iconTrailing: "arrow-right-line" })),
      h("li", {}, appLink({ label: copy.howItWorks, href: ctx.href("/legal/how-it-works"), variant: "ghost", size: "sm", iconTrailing: "arrow-right-line" })),
    ),
  );

  // ---- danger zone --------------------------------------------------------
  const deleteAction = () => {
    if (ctx.isDemoMode) return;
    const confirmField = appField({
      id: "delete-confirm",
      label: copy.delConfirmHint.replace("{slug}", creator.slug),
      mono: true,
      placeholder: creator.slug,
    });
    void appDialog({
      title: copy.delConfirmTitle,
      description: copy.delConfirmBody,
      content: confirmField.wrap,
      destructive: true,
      actions: [
        { id: "cancel", label: copy.cancel, variant: "secondary" },
        { id: "delete", label: copy.delYes, variant: "danger" },
      ],
      onAction: (id) => {
        if (id === "delete" && confirmField.input.value.trim() !== creator.slug) {
          confirmField.setError(copy.delConfirmHint.replace("{slug}", creator.slug));
          confirmField.input.focus();
          return false;
        }
        return true;
      },
    }).then((action) => {
      if (action !== "delete") return;
      void ctx.data
        .softDeleteCreator(creator.id)
        .then(() => {
          toast(copy.delDone);
          ctx.navigate("/");
        })
        .catch((error: unknown) => {
          bannerSlot.replaceChildren(inlineError(messageForError(ctx, error)));
        });
    });
  };

  const danger = h(
    "section",
    { class: "app-section app-section--danger", attrs: { "aria-labelledby": "settings-danger" } },
    appSectionHead({ title: copy.dangerT, description: copy.dangerBody, id: "settings-danger" }),
    appButton({
      label: copy.delBtn,
      variant: "danger",
      size: "sm",
      icon: "delete-bin-line",
      disabled: ctx.isDemoMode,
      onClick: deleteAction,
    }),
    ctx.isDemoMode ? h("p", { class: "app-field__helper", text: copy.delDemoOff }) : null,
  );

  const content = h(
    "div",
    { class: "app-settings" },
    bannerSlot,
    appearance,
    language,
    session,
    legal,
    danger,
    h("p", { class: "app-note app-note--foot", text: copy.footerNote }),
  );

  return appShell(ctx, { active: "settings", creator, copy, content });
}
