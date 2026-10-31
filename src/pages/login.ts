/**
 * `/login` — magic link for Supabase mode; an honest demo explanation in local
 * mode (never a fake login). No password, no social login.
 */
import { h } from "../lib/dom.ts";
import { isEmail } from "../lib/supabase.ts";
import type { AppContext } from "../lib/app.ts";
import { icon } from "../components/icons.ts";
import { button, linkButton, textField } from "../components/ui.ts";

function maskedEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, user.length - 2))}@${domain}`;
}

export async function renderLogin(ctx: AppContext): Promise<HTMLElement> {
  const container = h("div", { class: "auth-page" });

  if (ctx.config.mode === "local") {
    container.append(
      h("div", { class: "auth-card" },
        h("span", { class: "auth-card__mark", html: "☕", attrs: { "aria-hidden": "true" } }),
        h("h1", { class: "auth-card__title", text: ctx.t("login.demoTitle") }),
        h("p", { class: "auth-card__body", text: ctx.t("login.demoBody") }),
        linkButton({ href: ctx.href("/dashboard"), label: ctx.t("login.demoCta"), variant: "primary", block: true }),
        linkButton({ href: ctx.href("/"), label: ctx.t("login.back"), variant: "ghost", size: "sm", icon: "arrowLeft" }),
      ),
    );
    return container;
  }

  const session = await ctx.data.getSession().catch(() => null);
  const next = ctx.params.next ?? "/dashboard";

  if (session) {
    container.append(
      h("div", { class: "auth-card" },
        h("h1", { class: "auth-card__title", text: ctx.t("login.sent") }),
        h("p", { class: "auth-card__body", text: ctx.t("dashboard.settings.loggedInAs", { email: session.email ?? "" }) }),
        linkButton({ href: ctx.href(next), label: ctx.t("login.demoCta"), variant: "primary", block: true }),
      ),
    );
    return container;
  }

  const expired = window.location.search.includes("error=") || window.location.hash.includes("error=");
  const card = h("div", { class: "auth-card" });
  card.append(
    h("span", { class: "auth-card__mark", html: "☕", attrs: { "aria-hidden": "true" } }),
    h("h1", { class: "auth-card__title", text: ctx.t("login.title") }),
    h("p", { class: "auth-card__body", text: ctx.t("login.intro") }),
  );

  if (expired) {
    card.append(
      h("div", { class: "inline-banner inline-banner--warn", attrs: { role: "alert" } },
        h("span", { html: icon("info", 18) }),
        h("p", { text: ctx.t("login.expired") }),
      ),
    );
  }

  const emailField = textField(ctx.lang, {
    id: "login-email",
    label: ctx.t("login.email"),
    type: "email",
    autocomplete: "email",
    required: true,
    placeholder: "you@example.com",
  });
  const form = h("form", { class: "auth-form", attrs: { novalidate: true } }, emailField.wrap);
  const submit = button({ label: ctx.t("login.send"), variant: "primary", block: true, type: "submit" });
  const status = h("p", { class: "sr-only", attrs: { role: "status", "aria-live": "polite" } });
  form.append(submit, status);
  card.append(form);

  const sentPanel = h("div", { class: "auth-card__sent", attrs: { hidden: true } });
  card.append(sentPanel);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = emailField.input.value.trim();
    if (!isEmail(email)) {
      emailField.setError(ctx.t("login.invalidEmail"));
      emailField.input.focus();
      return;
    }
    emailField.setError(null);
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    const label = submit.querySelector(".btn__label");
    if (label) label.textContent = ctx.t("login.sending");
    status.textContent = ctx.t("login.sending");

    const redirectTo = `${ctx.origin}${ctx.href(next)}`;
    void ctx.data
      .signInWithMagicLink(email, redirectTo)
      .then(() => {
        form.hidden = true;
        sentPanel.hidden = false;
        sentPanel.replaceChildren(
          h("h2", { class: "auth-card__title", text: ctx.t("login.sent") }),
          h("p", { class: "auth-card__body", text: ctx.t("login.sentBody", { email: maskedEmail(email) }) }),
          h("p", { class: "auth-card__helper", text: ctx.t("login.spam") }),
          h("p", { class: "auth-card__helper", text: ctx.t("login.linkShort") }),
          h(
            "div",
            { class: "auth-card__actions" },
            button({
              label: ctx.t("login.otherEmail"),
              variant: "secondary",
              size: "sm",
              onClick: () => {
                sentPanel.hidden = true;
                form.hidden = false;
                submit.disabled = false;
                submit.removeAttribute("aria-busy");
                if (label) label.textContent = ctx.t("login.send");
                emailField.input.focus();
              },
            }),
          ),
        );
        sentPanel.querySelector("h2")?.focus?.();
      })
      .catch((error: unknown) => {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
        if (label) label.textContent = ctx.t("login.send");
        emailField.setError(ctx.t("error.authFailed"));
        void error;
      });
  });

  card.append(
    h("p", { class: "auth-card__helper", text: ctx.t("login.spam") }),
    linkButton({ href: ctx.href("/"), label: ctx.t("login.back"), variant: "ghost", size: "sm", icon: "arrowLeft" }),
  );
  container.append(card);
  return container;
}
