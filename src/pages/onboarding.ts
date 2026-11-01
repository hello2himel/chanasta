/**
 * `/onboarding` — four quiet steps: link → payment methods → identity → preview
 * & publish. The live preview is the chai receipt. Each step persists a draft;
 * publishing needs at least one enabled payment method.
 *
 * Local demo mode works with no backend (everything stays in this browser).
 * All data calls / error mapping / rate-limit behaviour are the existing ones.
 */
import { h, toast } from "../lib/dom.ts";
import { messageForError } from "../lib/messages.ts";
import { isValidHttpsUrl, isSlugRuleValid, slugProblem, validateProfileText } from "../lib/validate.ts";
import type { AppContext } from "../lib/app.ts";
import { cx } from "../lib/app.ts";
import type { Creator, Lang, PaymentMethod, SocialKey } from "../lib/types.ts";
import { AVATAR_ICONS, avatarIconClass } from "../lib/avatars.ts";
import {
  appAvatar,
  appBanner,
  appButton,
  appEmpty,
  appField,
  appLink,
  appPageHead,
  appProgressRail,
  appRadioGroup,
  appStamp,
} from "../components/app/ui.ts";
import { renderMethodEditor } from "../components/app/method-editor.ts";
import { renderReceiptPreview } from "../components/app/receipt.ts";
import { renderAppShareKit } from "../components/app/share.ts";
import { appCopyFor, fill } from "./copy.app.ts";

const STEP_KEYS = ["stepAccount", "stepPayment", "stepProfile", "stepPublish"] as const;
const MAX_METHODS = 8;

const SOCIAL_PLATFORMS: { value: SocialKey; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
  { value: "threads", label: "Threads" },
  { value: "telegram", label: "Telegram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "website", label: "Website" },
];

type HandleStatus = "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";

function authCard(ctx: AppContext, copy: ReturnType<typeof appCopyFor>): HTMLElement {
  return h(
    "div",
    { class: "app-onboarding app-onboarding--auth" },
    h(
      "div",
      { class: "app-auth-card" },
      h(
        "div",
        { class: "app-auth-card__mark" },
        h("i", { class: "ri-cup-line ri", attrs: { "aria-hidden": "true" } }),
      ),
      h("h1", { class: "app-auth-card__title", text: copy.needLogin }),
      appLink({ label: copy.loginTitle, href: `${ctx.href("/login")}?next=${encodeURIComponent("/onboarding")}`, variant: "primary", block: true }),
      appLink({ label: copy.backHome, href: ctx.href("/"), variant: "ghost", size: "sm", icon: "arrow-left-line" }),
    ),
  );
}

export async function renderOnboarding(ctx: AppContext): Promise<HTMLElement> {
  const copy = appCopyFor(ctx.lang);
  ctx.setMeta(ctx.t("meta.title.onboarding"));

  const session = await ctx.data.getSession().catch(() => null);
  if (ctx.config.mode === "supabase" && !session) return authCard(ctx, copy);

  const initialCreator = await ctx.data.getMyCreator().catch(() => null);
  let creator: Creator | null = initialCreator;
  let methods: PaymentMethod[] = creator ? await ctx.data.listMyPaymentMethods(creator.id).catch(() => []) : [];

  // ---- state --------------------------------------------------------------
  let step: 1 | 2 | 3 | 4 = creator ? 2 : 1;
  let handle = creator?.slug ?? "";
  let handleStatus: HandleStatus = creator ? "available" : "idle";
  let displayName = creator?.display_name ?? "";
  let tagline = creator?.tagline ?? "";
  let bio = creator?.bio ?? "";
  let avatar = avatarIconClass(creator?.avatar_emoji ?? "");
  let defaultLocale: Lang = creator?.default_locale ?? "bn";
  let socials: Array<{ platform: SocialKey; url: string }> = Object.entries(creator?.socials ?? {}).map(
    ([platform, url]) => ({ platform: platform as SocialKey, url: String(url) }),
  );
  let published = creator?.status === "published";
  let busy = false;

  const page = h("div", { class: "app-onboarding" });
  const bannerSlot = h("div", { class: "app-banner-slot" });
  const previewSlot = h("div", { class: "app-onboarding__preview" });
  const stepHost = h("div", { class: "app-onboarding__step" });
  const navHost = h("div", { class: "app-onboarding__nav" });
  const railSlot = h("div", { class: "app-onboarding__rail" });

  const enabledMethods = (): PaymentMethod[] => methods.filter((method) => method.enabled);

  // ---- preview ------------------------------------------------------------
  const updatePreview = () => {
    previewSlot.replaceChildren(
      h("p", { class: "app-eyebrow", text: copy.previewL }),
      renderReceiptPreview(ctx, {
        creatorName: displayName || handle.replace(/-/g, " "),
        tagline,
        avatar,
        slug: handle,
        methods,
        copy,
        demo: ctx.isDemoMode,
        compact: true,
      }),
    );
  };

  // ---- rail + nav ---------------------------------------------------------
  const updateRail = () => {
    railSlot.replaceChildren(
      appProgressRail({
        steps: [1, 2, 3, 4].map((index) => ({
          label: copy[STEP_KEYS[index - 1] ?? "stepAccount"],
          index,
          state: index < step ? "done" : index === step ? "current" : "todo",
        })),
        currentLabel: fill(copy.stepOf, { current: step, total: 4 }) + ` · ${copy[STEP_KEYS[step - 1] ?? "stepAccount"]}`,
      }),
    );
  };

  const updateNav = () => {
    navHost.replaceChildren();
    if (step > 1) {
      navHost.append(
        appButton({
          label: copy.back,
          variant: "secondary",
          icon: "arrow-left-line",
          onClick: () => {
            if (step > 1) {
              step = (step - 1) as 1 | 2 | 3 | 4;
              renderStep({ focus: true });
            }
          },
        }),
      );
    }
    if (step < 4) {
      navHost.append(
        appButton({
          label: copy.next,
          variant: "primary",
          iconTrailing: "arrow-right-line",
          disabled: step === 1 && handleStatus !== "available",
          loading: busy,
          onClick: () => void next(),
        }),
      );
    }
    navHost.append(
      appButton({
        label: copy.continueLater,
        variant: "ghost",
        size: "sm",
        onClick: () => void continueLater(),
      }),
    );
  };

  // ---- helpers ------------------------------------------------------------
  const checkHandle = (value: string): { status: HandleStatus; message: string } => {
    if (!value) return { status: "idle", message: copy.handleInvalid };
    if (creator?.slug === value) return { status: "available", message: copy.handleAvailable };
    const problem = slugProblem(value);
    if (problem === "reserved") return { status: "reserved", message: copy.handleReserved };
    if (problem !== null) return { status: "invalid", message: copy.handleInvalid };
    return { status: "idle", message: "" };
  };

  const applyHandle = (value: string): void => {
    handle = value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
    const checked = checkHandle(handle);
    handleStatus = checked.status;
    updateNav();
    updatePreview();
  };

  const showError = (message: string): void => {
    bannerSlot.replaceChildren(appBanner({ tone: "error", body: message }));
    bannerSlot.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const persistProfile = async (): Promise<boolean> => {
    if (!creator) return false;
    const validation = validateProfileText({ display_name: displayName, tagline, bio });
    if (!validation.ok) {
      showError(validation.errors.display_name ? copy.required : ctx.t("claim.form.error.banned"));
      return false;
    }
    const socialMap: Record<string, string> = {};
    for (const row of socials) {
      if (!row.url.trim()) continue;
      if (!isValidHttpsUrl(row.url.trim())) {
        showError(copy.handleInvalid);
        return false;
      }
      socialMap[row.platform] = row.url.trim();
    }
    try {
      creator = await ctx.data.updateCreator(creator.id, {
        display_name: displayName.trim(),
        tagline: tagline.trim() || null,
        bio: bio.trim() || null,
        avatar_emoji: avatar,
        socials: socialMap,
        default_locale: defaultLocale,
      });
      return true;
    } catch (error) {
      showError(messageForError(ctx, error));
      return false;
    }
  };

  const next = async (): Promise<void> => {
    bannerSlot.replaceChildren();
    if (busy) return;
    busy = true;
    updateNav();
    try {
      if (step === 1) {
        const value = handle.trim();
        if (!isSlugRuleValid(value)) {
          handleStatus = "invalid";
          updateNav();
          return;
        }
        if (!creator) {
          creator = await ctx.data.createCreator({
            slug: value,
            display_name: displayName.trim() || value.replace(/-/g, " "),
            avatar_emoji: avatar,
          });
          displayName = creator.display_name;
          step = 2;
        } else if (creator.slug !== value) {
          creator = await ctx.data.changeSlug(creator.id, value);
          step = 2;
        } else {
          step = 2;
        }
      } else if (step === 2) {
        step = 3;
      } else if (step === 3) {
        if (!(await persistProfile())) return;
        step = 4;
      }
      renderStep({ focus: true });
    } catch (error) {
      showError(messageForError(ctx, error));
    } finally {
      busy = false;
      updateNav();
    }
  };

  const continueLater = async (): Promise<void> => {
    if (step >= 3 && creator) await persistProfile();
    ctx.navigate("/dashboard");
  };

  // ---- step 1 -------------------------------------------------------------
  const renderStepAccount = (): HTMLElement => {
    const input = h("input", {
      class: "app-input app-input--mono",
      id: "onboarding-handle",
      attrs: {
        type: "text",
        autocomplete: "off",
        autocapitalize: "none",
        autocorrect: "off",
        spellcheck: "false",
        maxlength: 30,
        value: handle,
        placeholder: "your-name",
        "aria-describedby": "onboarding-handle-status",
      },
    });
    const status = h("p", {
      class: cx("app-field__helper", handleStatus === "available" && "app-status--ok", (handleStatus === "taken" || handleStatus === "reserved" || handleStatus === "invalid") && "app-status--bad"),
      id: "onboarding-handle-status",
      attrs: { role: "status", "aria-live": "polite" },
    });
    const showStatus = () => {
      const messages: Record<HandleStatus, string> = {
        idle: copy.handleInvalid,
        checking: copy.handleChecking,
        available: copy.handleAvailable,
        taken: copy.handleTaken,
        reserved: copy.handleReserved,
        invalid: copy.handleInvalid,
      };
      status.textContent = handle ? messages[handleStatus] : "";
      status.className = cx(
        "app-field__helper",
        handleStatus === "available" && "app-status--ok",
        (handleStatus === "taken" || handleStatus === "reserved" || handleStatus === "invalid") && "app-status--bad",
      );
    };
    showStatus();
    let timer = 0;
    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      applyHandle(input.value);
      input.value = handle;
      const local = checkHandle(handle);
      if (local.status === "available" || local.status === "reserved" || local.status === "invalid") {
        showStatus();
        return;
      }
      if (!handle) {
        handleStatus = "idle";
        showStatus();
        return;
      }
      handleStatus = "checking";
      showStatus();
      timer = window.setTimeout(() => {
        void ctx.data.isSlugAvailable(handle).then((available) => {
          handleStatus = available ? "available" : "taken";
          showStatus();
          updateNav();
        });
      }, 400);
    });
    input.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        event.preventDefault();
        void next();
      }
    });

    const accountLine = ctx.isDemoMode
      ? h("p", { class: "app-field__helper", text: copy.accountLocal })
      : h("p", { class: "app-field__helper", text: `${copy.accountSignedIn}: ${session?.email ?? ""}` });

    return h(
      "section",
      { class: "app-section", attrs: { "aria-labelledby": "onboarding-handle-title" } },
      h("h2", { class: "app-section-head__title", id: "onboarding-handle-title", text: copy.handleChooseTitle }),
      h("p", { class: "app-field__helper", text: copy.handleChooseSub }),
      accountLine,
      h(
        "div",
        { class: "app-field" },
        h("label", { class: "app-field__label", attrs: { for: "onboarding-handle" } }, h("span", { text: copy.handleL })),
        h("div", { class: "app-slug-input" }, h("span", { class: "app-slug-input__prefix", text: "@" }), input),
        h("p", { class: "app-field__helper", text: copy.handleRule }),
        status,
      ),
      h(
        "div",
        { class: "app-handle-preview" },
        h("span", { class: "app-field__helper", text: copy.yourLink }),
        h("span", { class: "app-mono", text: `chanasta/@${handle || "your-name"}`, attrs: { dir: "ltr" } }),
      ),
    );
  };

  // ---- step 2 -------------------------------------------------------------
  const renderStepPayments = (): HTMLElement => {
    const section = h("section", { class: "app-section", attrs: { "aria-labelledby": "onboarding-payment-title" } });
    section.append(
      h("h2", { class: "app-section-head__title", id: "onboarding-payment-title", text: copy.paymentTitle }),
      h("p", { class: "app-field__helper", text: copy.paymentSub }),
      h("p", { class: "app-helper", text: ctx.t("honesty.creatorNote") }),
    );

    if (methods.length > 0) {
      section.append(
        h(
          "ul",
          { class: "app-methods" },
          ...methods.map((method) =>
            h(
              "li",
              { class: "app-method app-method--compact" },
              h(
                "div",
                { class: "app-method__body" },
                h(
                  "div",
                  { class: "app-method__top" },
                  h("span", { class: "app-method__provider", text: ctx.t(`provider.${method.kind}`) }),
                  h("span", { class: "app-method__label", text: method.label }),
                ),
                h(
                  "div",
                  { class: "app-method__meta" },
                  method.qr_status === "verified"
                    ? appStamp({ label: copy.stampQrVerified, tone: "confirmed", icon: "checkbox-circle-line" })
                    : method.qr_status === "unverified"
                      ? appStamp({ label: copy.stampQrUnverified, tone: "self", icon: "information-line" })
                      : appStamp({ label: copy.stampManual, tone: "outline", icon: "hashtag" }),
                ),
                h("p", { class: "app-method__detail", text: method.account_number ?? "", attrs: { dir: "ltr" } }),
              ),
              h(
                "div",
                { class: "app-method__controls" },
                appButton({
                  label: copy.remove,
                  variant: "ghost",
                  size: "sm",
                  icon: "delete-bin-line",
                  onClick: () => {
                    void ctx.data.deletePaymentMethod(method.id).then(() => {
                      methods = methods.filter((entry) => entry.id !== method.id);
                      renderStep();
                    });
                  },
                }),
              ),
            ),
          ),
        ),
      );
    } else {
      section.append(appEmpty({ icon: "bank-card-line", title: copy.addedEmpty, body: copy.paymentSub }));
    }

    if (creator && methods.length < MAX_METHODS) {
      const editor = renderMethodEditor(ctx, {
        copy,
        canCancel: false,
        onSave: async (input) => {
          await ctx.data.savePaymentMethod({
            ...input,
            creator_id: creator?.id ?? "",
            sort_order: methods.length,
            enabled: true,
          });
          methods = creator ? await ctx.data.listMyPaymentMethods(creator.id) : methods;
          toast(copy.methodSaved);
          renderStep();
        },
      });
      section.append(editor.element);
    } else if (methods.length >= MAX_METHODS) {
      section.append(h("p", { class: "app-field__helper", text: copy.maxMethods }));
    }

    return section;
  };

  // ---- step 3 -------------------------------------------------------------
  const renderStepProfile = (): HTMLElement => {
    const section = h("section", { class: "app-section", attrs: { "aria-labelledby": "onboarding-profile-title" } });
    section.append(
      h("h2", { class: "app-section-head__title", id: "onboarding-profile-title", text: copy.profileStepTitle }),
      h("p", { class: "app-field__helper", text: copy.profileStepSub }),
    );

    const nameField = appField({
      id: "onboarding-name",
      label: copy.nameL,
      placeholder: copy.namePh,
      maxlength: 60,
      value: displayName,
      onInput: (value) => {
        displayName = value;
        updatePreview();
      },
    });
    const taglineField = appField({
      id: "onboarding-tagline",
      label: copy.tagL,
      placeholder: copy.tagPh,
      maxlength: 80,
      value: tagline,
      onInput: (value) => {
        tagline = value;
        updatePreview();
      },
    });
    const bioField = appField({
      id: "onboarding-bio",
      label: copy.bioL,
      placeholder: copy.bioPh,
      multiline: true,
      rows: 4,
      maxlength: 600,
      value: bio,
      onInput: (value) => {
        bio = value;
      },
    });

    const avatarPreview = appAvatar(avatar, "lg", displayName || copy.avatarL);
    const grid = h("div", { class: "app-avatar-grid", attrs: { role: "radiogroup", "aria-label": copy.avatarPickerLabel } });
    const avatarButtons = AVATAR_ICONS.map((iconClass) =>
      h("button", {
        class: "app-avatar-pick",
        attrs: { type: "button", role: "radio", "aria-checked": String(avatar === iconClass), "aria-label": iconClass },
        html: `<i class="${iconClass} ri" aria-hidden="true"></i>`,
      }),
    );
    avatarButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const iconClass = button.querySelector("i")?.className.split(" ")[0] ?? "ri-cup-line";
        avatar = iconClass;
        avatarPreview.innerHTML = `<i class="${iconClass} ri" aria-hidden="true"></i>`;
        for (const other of avatarButtons) other.setAttribute("aria-checked", String(other === button));
        updatePreview();
      });
    });
    grid.append(...avatarButtons);

    const socialsHost = h("div", { class: "app-socials" });
    const renderSocials = () => {
      socialsHost.replaceChildren();
      socials.forEach((row, index) => {
        const platformSelect = h(
          "select",
          { class: "app-input app-select", attrs: { "aria-label": copy.platformL } },
          ...SOCIAL_PLATFORMS.map((platform) => {
            const option = h("option", { attrs: { value: platform.value }, text: platform.label });
            if (platform.value === row.platform) option.selected = true;
            return option;
          }),
        );
        platformSelect.addEventListener("change", () => {
          row.platform = platformSelect.value as SocialKey;
        });
        const urlField = appField({
          id: `onboarding-social-${index}`,
          label: copy.linkUrl,
          type: "url",
          placeholder: "https://",
          value: row.url,
          onInput: (value) => {
            row.url = value;
          },
        });
        socialsHost.append(
          h(
            "div",
            { class: "app-social-row" },
            h("div", { class: "app-social-row__platform" }, platformSelect),
            urlField.wrap,
            appButton({
              label: copy.remove,
              variant: "ghost",
              size: "sm",
              icon: "delete-bin-line",
              onClick: () => {
                socials.splice(index, 1);
                renderSocials();
              },
            }),
          ),
        );
      });
    };
    renderSocials();

    section.append(
      h(
        "div",
        { class: "app-avatar-row" },
        avatarPreview,
        h(
          "details",
          { class: "app-avatar-picker" },
          h(
            "summary",
            { class: "app-avatar-picker__summary" },
            h("i", { class: "ri-emotion-line ri", attrs: { "aria-hidden": "true" } }),
            h("span", { text: copy.avatarPick }),
          ),
          grid,
        ),
      ),
      nameField.wrap,
      taglineField.wrap,
      bioField.wrap,
      appRadioGroup({
        legend: copy.defaultLang,
        name: "onboarding-locale",
        choices: [
          { value: "bn", label: "বাংলা" },
          { value: "en", label: "English" },
        ],
        value: defaultLocale,
        onChange: (value) => {
          defaultLocale = value as Lang;
        },
      }),
      h(
        "details",
        { class: "app-details" },
        h(
          "summary",
          { class: "app-details__summary" },
          h("i", { class: "ri-link ri", attrs: { "aria-hidden": "true" } }),
          h("span", { text: copy.socialsTitle }),
        ),
        h("p", { class: "app-field__helper", text: copy.socialsBody }),
        socialsHost,
        socials.length < 6
          ? appButton({
              label: copy.addLink,
              variant: "secondary",
              size: "sm",
              icon: "add-line",
              onClick: () => {
                socials.push({ platform: "youtube", url: "" });
                renderSocials();
              },
            })
          : null,
      ),
      h("p", { class: "app-tip", text: copy.noPressure }),
    );
    return section;
  };

  // ---- step 4 -------------------------------------------------------------
  const renderStepPublish = (): HTMLElement => {
    const section = h("section", { class: "app-section", attrs: { "aria-labelledby": "onboarding-publish-title" } });
    section.append(
      h("h2", { class: "app-section-head__title", id: "onboarding-publish-title", text: copy.publishTitle }),
      h("p", { class: "app-field__helper", text: copy.publishSub }),
    );

    if (published && creator) {
      section.append(
        appBanner({ tone: "success", title: copy.liveTitle, body: copy.liveSub, role: "status" }),
        renderAppShareKit(ctx, { creator, methods, copy }),
        h(
          "div",
          { class: "app-onboarding__final" },
          appLink({ label: copy.viewPage, href: ctx.href(`/@${creator.slug}`), variant: "primary", icon: "external-link-line", external: true }),
          appLink({ label: copy.toDashboard, href: ctx.href("/dashboard"), variant: "secondary", icon: "arrow-right-line" }),
        ),
      );
      return section;
    }

    const checks = [
      { label: copy.checkHandle, done: handleStatus === "available" || Boolean(creator) },
      { label: copy.checkMethod, done: enabledMethods().length > 0 },
      { label: copy.checkName, done: displayName.trim().length > 0 },
    ];
    const allDone = checks.every((check) => check.done);

    const checklist = h("ul", { class: "app-checklist" });
    for (const check of checks) {
      checklist.append(
        h(
          "li",
          { class: cx("app-checklist__item", check.done && "app-checklist__item--done") },
          h("i", { class: check.done ? "ri-checkbox-circle-line ri" : "ri-checkbox-blank-circle-line ri", attrs: { "aria-hidden": "true" } }),
          h("span", { text: check.label }),
        ),
      );
    }

    section.append(
      checklist,
      ...(enabledMethods().length === 0 ? [appBanner({ tone: "warn", body: copy.publishBlocked, role: "alert" })] : []),
      h(
        "div",
        { class: "app-onboarding__final" },
        appButton({
          label: copy.publishCta,
          variant: "primary",
          icon: "checkbox-circle-line",
          disabled: !allDone || !creator,
          onClick: () => {
            if (!creator || busy) return;
            busy = true;
            void ctx.data
              .setCreatorStatus(creator.id, "published")
              .then((updated) => {
                creator = updated;
                published = true;
                toast(copy.liveTitle);
                busy = false;
                renderStep();
              })
              .catch((error: unknown) => {
                busy = false;
                showError(messageForError(ctx, error));
                renderStep();
              });
          },
        }),
        appLink({ label: copy.viewPage, href: ctx.href(`/@${creator?.slug ?? ""}`), variant: "ghost", size: "sm", icon: "external-link-line", external: true }),
      ),
    );
    return section;
  };

  // ---- render -------------------------------------------------------------
  const renderStep = (options: { focus?: boolean } = {}) => {
    bannerSlot.replaceChildren();
    updateRail();
    updatePreview();
    updateNav();
    stepHost.replaceChildren(
      step === 1
        ? renderStepAccount()
        : step === 2
          ? renderStepPayments()
          : step === 3
            ? renderStepProfile()
            : renderStepPublish(),
    );
    if (options.focus) {
      const heading = stepHost.querySelector<HTMLElement>("h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
  };

  page.append(
    appPageHead({
      eyebrow: ctx.t("app.name"),
      title: copy.onboardingTitle,
      description: copy.onboardingSub,
    }),
    railSlot,
    h(
      "div",
      { class: "app-onboarding__layout" },
      h("div", { class: "app-onboarding__main" }, bannerSlot, stepHost, navHost),
      previewSlot,
    ),
  );

  renderStep();
  return page;
}
