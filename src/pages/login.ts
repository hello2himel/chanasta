/**
 * `/login` — magic link for Supabase mode; an honest demo explanation in local
 * mode (never a fake login, no password, no social login).
 */
import { h } from "../lib/dom.ts";
import { isEmail } from "../lib/supabase.ts";
import type { AppContext } from "../lib/app.ts";
import { appButton, appField, appBanner, appLink } from "../components/app/ui.ts";
import { appCopyFor } from "./copy.app.ts";

function maskedEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(2, user.length - 2))}@${domain}`;
}

function authShell(content: Node, copy: ReturnType<typeof appCopyFor>): HTMLElement {
  void copy;
  return h(
    "div",
    { class: "app-auth" },
    h(
      "div",
      { class: "app-auth-card" },
      h("div", { class: "app-auth-card__mark" }, h("i", { class: "ri-cup-line ri", attrs: { "aria-hidden": "true" } })),
      content,
    ),
  );
}

export async function renderLogin(ctx: AppContext): Promise<HTMLElement> {
  const copy = appCopyFor(ctx.lang);

  if (ctx.config.mode === "local") {
    return authShell(
      h(
        "div",
        { class: "app-auth-card__body" },
        h("h1", { class: "app-auth-card__title", text: copy.demoLoginTitle }),
        h("p", { class: "app-field__helper", text: copy.demoLoginBody }),
        appLink({ label: copy.openDashboard, href: ctx.href("/dashboard"), variant: "primary", block: true }),
        appLink({ label: copy.backHome, href: ctx.href("/"), variant: "ghost", size: "sm", icon: "arrow-left-line" }),
        h("p", { class: "app-note", text: copy.loginDemoNote }),
      ),
      copy,
    );
  }

  const session = await ctx.data.getSession().catch(() => null);
  const next = ctx.params.next ?? "/dashboard";

  if (session) {
    return authShell(
      h(
        "div",
        { class: "app-auth-card__body" },
        h("h1", { class: "app-auth-card__title", text: copy.signedInAlready }),
        h("p", { class: "app-field__helper", text: copy.loggedInAs.replace("{email}", session.email ?? "") }),
        appLink({ label: copy.openDashboard, href: ctx.href(next), variant: "primary", block: true }),
        appLink({ label: copy.backHome, href: ctx.href("/"), variant: "ghost", size: "sm", icon: "arrow-left-line" }),
      ),
      copy,
    );
  }

  const expired = window.location.search.includes("error=") || window.location.hash.includes("error=");
  const title = h("h1", { class: "app-auth-card__title", text: copy.loginTitle });
  const intro = h("p", { class: "app-field__helper", text: copy.loginIntro });
  const emailField = appField({
    id: "login-email",
    label: copy.emailL,
    type: "email",
    autocomplete: "email",
    placeholder: "you@example.com",
    required: true,
  });
  const form = h("form", { class: "app-auth-form", attrs: { novalidate: true } }, emailField.wrap);
  const submit = appButton({ label: copy.sendLink, variant: "primary", block: true, type: "submit" });
  const status = h("p", { class: "app-sr", attrs: { role: "status", "aria-live": "polite" } });
  form.append(submit, status);
  const sentHost = h("div", { attrs: { hidden: true } });
  const bannerHost = h("div", { class: "app-banner-slot" });
  if (expired) bannerHost.append(appBanner({ tone: "warn", body: copy.linkExpired }));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = emailField.input.value.trim();
    if (!isEmail(email)) {
      emailField.setError(copy.emailErr);
      emailField.input.focus();
      return;
    }
    emailField.setError(null);
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    const label = submit.querySelector(".app-btn__label");
    if (label) label.textContent = copy.sending;
    status.textContent = copy.sending;
    const redirectTo = `${ctx.origin}${ctx.href(next)}`;
    void ctx.data
      .signInWithMagicLink(email, redirectTo)
      .then(() => {
        form.hidden = true;
        sentHost.hidden = false;
        sentHost.replaceChildren(
          h("h2", { class: "app-auth-card__title", text: copy.linkSentTitle }),
          h(
            "p",
            { class: "app-field__helper" },
            h("span", { text: copy.linkSentBody }),
            " ",
            h("strong", { text: maskedEmail(email) }),
          ),
          h("p", { class: "app-field__helper", text: copy.linkSentHelp }),
          h("p", { class: "app-field__helper", text: copy.linkShort }),
          h(
            "div",
            { class: "app-auth-form" },
            appButton({
              label: copy.back,
              variant: "secondary",
              size: "sm",
              onClick: () => {
                sentHost.hidden = true;
                form.hidden = false;
                submit.disabled = false;
                submit.removeAttribute("aria-busy");
                if (label) label.textContent = copy.sendLink;
                emailField.input.focus();
              },
            }),
          ),
        );
        sentHost.querySelector("h2")?.focus?.();
      })
      .catch((error: unknown) => {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
        if (label) label.textContent = copy.sendLink;
        bannerHost.replaceChildren(appBanner({ tone: "error", body: copy.loginFailed }));
        void error;
      });
  });

  return authShell(
    h(
      "div",
      { class: "app-auth-card__body" },
      title,
      intro,
      bannerHost,
      form,
      sentHost,
      h("p", { class: "app-note", text: copy.loginDemoNote }),
      appLink({ label: copy.backHome, href: ctx.href("/"), variant: "ghost", size: "sm", icon: "arrow-left-line" }),
    ),
    copy,
  );
}
