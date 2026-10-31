/**
 * `/dashboard/profile` — identity editor with a RemixIcon avatar picker, social
 * links, handle change and publish/unpublish. No goal UI, no emoji picker, no
 * identity badge. The live preview is the chai receipt.
 */
import { h, toast } from "../../lib/dom.ts";
import { messageForError } from "../../lib/messages.ts";
import { isDataError } from "../../lib/errors.ts";
import { isValidHttpsUrl, validateProfileText } from "../../lib/validate.ts";
import type { AppContext } from "../../lib/app.ts";
import type { Creator, Lang, SocialKey } from "../../lib/types.ts";
import { AVATAR_ICONS, avatarIconClass } from "../../lib/avatars.ts";
import {
  appAvatar,
  appBanner,
  appButton,
  appCopyRow,
  appDialog,
  appField,
  appRadioGroup,
  appSectionHead,
} from "../../components/app/ui.ts";
import { renderReceiptPreview } from "../../components/app/receipt.ts";
import { appCopyFor } from "../copy.app.ts";
import { appShell, inlineError, loadMethods, loadOwnData, noPageContent } from "./common.ts";

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

interface ProfileDraft {
  display_name: string;
  tagline: string;
  bio: string;
  avatar_emoji: string;
  default_locale: Lang;
  socials: Array<{ platform: SocialKey; url: string }>;
}

export async function renderDashboardProfile(ctx: AppContext): Promise<HTMLElement> {
  const copy = appCopyFor(ctx.lang);
  const own = await loadOwnData(ctx);
  if (!own.creator) return noPageContent(ctx, copy);

  const creator = own.creator;
  const methods = await loadMethods(ctx, creator);
  const draft: ProfileDraft = {
    display_name: creator.display_name,
    tagline: creator.tagline ?? "",
    bio: creator.bio ?? "",
    avatar_emoji: avatarIconClass(creator.avatar_emoji),
    default_locale: creator.default_locale,
    socials: Object.entries(creator.socials ?? {}).map(([platform, url]) => ({
      platform: platform as SocialKey,
      url: String(url),
    })),
  };
  let dirty = false;
  const bannerSlot = h("div", { class: "app-banner-slot" });
  const saveBar = h("div", { class: "app-savebar", attrs: { hidden: true } });

  // ---- fields -------------------------------------------------------------
  const nameField = appField({
    id: "profile-name",
    label: copy.nameL,
    placeholder: copy.namePh,
    maxlength: 60,
    value: draft.display_name,
    onInput: (value) => {
      draft.display_name = value;
      markDirty();
    },
  });
  const taglineField = appField({
    id: "profile-tagline",
    label: copy.tagL,
    placeholder: copy.tagPh,
    maxlength: 80,
    value: draft.tagline,
    onInput: (value) => {
      draft.tagline = value;
      markDirty();
    },
  });
  const bioField = appField({
    id: "profile-bio",
    label: copy.bioL,
    placeholder: copy.bioPh,
    multiline: true,
    rows: 5,
    maxlength: 600,
    value: draft.bio,
    onInput: (value) => {
      draft.bio = value;
      markDirty();
    },
  });

  // ---- avatar picker ------------------------------------------------------
  const avatarPreview = appAvatar(draft.avatar_emoji, "lg", creator.display_name);
  const avatarGrid = h("div", { class: "app-avatar-grid", attrs: { role: "radiogroup", "aria-label": copy.avatarPickerLabel } });
  const avatarButtons = AVATAR_ICONS.map((iconClass) =>
    h("button", {
      class: "app-avatar-pick",
      attrs: {
        type: "button",
        role: "radio",
        "aria-checked": String(avatarIconClass(draft.avatar_emoji) === iconClass),
        "aria-label": iconClass.replace(/^ri-/, "").replace(/-line$/, "").replace(/-/g, " "),
      },
      html: `<i class="${iconClass} ri" aria-hidden="true"></i>`,
    }),
  );
  avatarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const iconClass = button.querySelector("i")?.className.split(" ")[0] ?? "ri-cup-line";
      draft.avatar_emoji = iconClass;
      avatarPreview.innerHTML = `<i class="${iconClass} ri" aria-hidden="true"></i>`;
      for (const other of avatarButtons) other.setAttribute("aria-checked", String(other === button));
      markDirty();
    });
  });
  avatarGrid.append(...avatarButtons);

  // ---- socials ------------------------------------------------------------
  const socialsList = h("div", { class: "app-socials" });
  const renderSocials = () => {
    socialsList.replaceChildren();
    draft.socials.forEach((row, index) => {
      const platformSelect = h(
        "select",
        { class: "app-input app-select", id: `social-platform-${index}`, attrs: { "aria-label": copy.platformL } },
        ...SOCIAL_PLATFORMS.map((platform) => {
          const option = h("option", { attrs: { value: platform.value }, text: platform.label });
          if (platform.value === row.platform) option.selected = true;
          return option;
        }),
      );
      platformSelect.addEventListener("change", () => {
        row.platform = platformSelect.value as SocialKey;
        markDirty();
      });
      const urlField = appField({
        id: `social-url-${index}`,
        label: copy.linkUrl,
        value: row.url,
        type: "url",
        placeholder: "https://",
        onInput: (value) => {
          row.url = value;
          markDirty();
        },
      });
      socialsList.append(
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
              draft.socials.splice(index, 1);
              renderSocials();
              markDirty();
            },
          }),
        ),
      );
    });
  };
  renderSocials();

  // ---- preview ------------------------------------------------------------
  const previewSlot = h("div", { class: "app-profile__preview" });
  const updatePreview = () => {
    previewSlot.replaceChildren(
      renderReceiptPreview(ctx, {
        creatorName: draft.display_name || creator.slug,
        tagline: draft.tagline,
        avatar: draft.avatar_emoji,
        slug: creator.slug,
        methods,
        copy,
        demo: creator.is_demo === true,
        compact: true,
      }),
    );
  };

  const markDirty = () => {
    dirty = true;
    saveBar.hidden = false;
    document.body.classList.add("app-dirty");
    updatePreview();
  };
  const clearDirty = () => {
    dirty = false;
    saveBar.hidden = true;
    document.body.classList.remove("app-dirty");
  };

  // ---- handle dialog ------------------------------------------------------
  const openHandleDialog = () => {
    const input = h("input", {
      class: "app-input app-input--mono",
      id: "profile-handle",
      attrs: { type: "text", autocomplete: "off", spellcheck: "false", autocapitalize: "none", value: creator.slug, "aria-label": copy.handleL },
    });
    const status = h("p", { class: "app-field__helper", attrs: { "aria-live": "polite" } });
    let timer = 0;
    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      const value = input.value.trim().toLowerCase();
      input.value = value;
      status.textContent = copy.handleChecking;
      timer = window.setTimeout(() => {
        void ctx.data.isSlugAvailable(value).then((available) => {
          status.textContent = available ? copy.handleAvailable : copy.handleTaken;
        });
      }, 400);
    });
    const content = h(
      "div",
      { class: "app-field-set" },
      h("div", { class: "app-slug-input" },
        h("span", { class: "app-slug-input__prefix", text: "@" }),
        input,
      ),
      h("p", { class: "app-field__helper", text: copy.handleRule }),
      status,
      appCopyRow({
        value: `${ctx.origin.replace(/^https?:\/\//, "")}/@${creator.slug}`,
        mono: true,
        mask: false,
        copyLabel: copy.copy,
        copiedLabel: copy.copied,
      }),
    );
    void appDialog({
      title: copy.changeHandleTitle,
      description: copy.changeHandleBody,
      content,
      actions: [
        { id: "cancel", label: copy.cancel, variant: "secondary" },
        { id: "save", label: copy.save, variant: "primary" },
      ],
    }).then((action) => {
      if (action !== "save") return;
      const slug = input.value.trim();
      if (!slug || slug === creator.slug) return;
      void ctx.data
        .changeSlug(creator.id, slug)
        .then(() => {
          toast(copy.saved);
          ctx.refresh();
        })
        .catch((error: unknown) => {
          bannerSlot.replaceChildren(inlineError(messageForError(ctx, error)));
        });
    });
  };

  // ---- publish / unpublish ----------------------------------------------
  const publishAction = () => {
    const nextStatus = creator.status === "published" ? "draft" : "published";
    void ctx.data
      .setCreatorStatus(creator.id, nextStatus)
      .then(() => {
        toast(nextStatus === "published" ? copy.statusPublished : copy.statusDraft);
        ctx.refresh();
      })
      .catch((error: unknown) => {
        bannerSlot.replaceChildren(
          appBanner({
            tone: "warn",
            body: messageForError(ctx, error),
            action:
              isDataError(error) && error.code === "PUBLISH_NEEDS_METHOD"
                ? appButton({ label: copy.publishBlockedLink, variant: "secondary", size: "sm", onClick: () => ctx.navigate("/dashboard/payments") })
                : undefined,
          }),
        );
      });
  };
  const publishButton = appButton({
    label: creator.status === "published" ? copy.unpublish : copy.publish,
    variant: creator.status === "published" ? "secondary" : "primary",
    size: "sm",
    icon: creator.status === "published" ? "eye-off-line" : "checkbox-circle-line",
    onClick: () => {
      if (creator.status !== "published") {
        publishAction();
        return;
      }
      void appDialog({
        title: copy.unpublish,
        description: copy.hideWarning,
        destructive: true,
        actions: [
          { id: "cancel", label: copy.cancel, variant: "secondary" },
          { id: "confirm", label: copy.unpublish, variant: "danger" },
        ],
      }).then((action) => {
        if (action === "confirm") publishAction();
      });
    },
  });

  // ---- save ---------------------------------------------------------------
  const persist = async (): Promise<void> => {
    const validation = validateProfileText({
      display_name: draft.display_name,
      tagline: draft.tagline,
      bio: draft.bio,
    });
    nameField.setError(validation.errors.display_name ? copy.required : null);
    taglineField.setError(
      validation.errors.tagline
        ? validation.errors.tagline === "BANNED"
          ? ctx.t("claim.form.error.banned")
          : copy.required
        : null,
    );
    bioField.setError(
      validation.errors.bio
        ? validation.errors.bio === "BANNED"
          ? ctx.t("claim.form.error.banned")
          : copy.required
        : null,
    );

    const socials: Record<string, string> = {};
    let socialError = "";
    for (const row of draft.socials) {
      if (!row.url.trim()) continue;
      if (!isValidHttpsUrl(row.url.trim())) {
        socialError = copy.handleInvalid;
        break;
      }
      socials[row.platform] = row.url.trim();
    }
    if (socialError) {
      bannerSlot.replaceChildren(appBanner({ tone: "error", body: socialError }));
      return;
    }
    if (!validation.ok) {
      bannerSlot.replaceChildren(appBanner({ tone: "error", body: copy.required }));
      const first = [nameField, taglineField, bioField].find((field) => field.wrap.classList.contains("app-field--error"));
      first?.input.focus();
      return;
    }
    try {
      await ctx.data.updateCreator(creator.id, {
        display_name: draft.display_name.trim(),
        tagline: draft.tagline.trim() || null,
        bio: draft.bio.trim() || null,
        avatar_emoji: draft.avatar_emoji,
        socials,
        default_locale: draft.default_locale,
      });
      clearDirty();
      toast(copy.saved);
      ctx.refresh();
    } catch (error) {
      bannerSlot.replaceChildren(inlineError(messageForError(ctx, error)));
    }
  };

  saveBar.append(
    h("p", { class: "app-savebar__text", text: copy.unsaved }),
    appButton({ label: copy.cancel, variant: "ghost", size: "sm", onClick: () => ctx.refresh() }),
    appButton({ label: copy.save, variant: "primary", size: "sm", icon: "check-line", onClick: () => void persist() }),
  );

  window.addEventListener(
    "beforeunload",
    (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    },
    { once: true },
  );

  updatePreview();

  const content = h(
    "div",
    { class: "app-profile" },
    bannerSlot,
    h(
      "div",
      { class: "app-profile__layout" },
      h(
        "div",
        { class: "app-profile__form" },
        h(
          "section",
          { class: "app-section" },
          appSectionHead({ title: copy.profileTitle, description: copy.profileSub }),
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
              avatarGrid,
            ),
          ),
          nameField.wrap,
          taglineField.wrap,
          bioField.wrap,
          appRadioGroup({
            legend: copy.defaultLang,
            name: "default-locale",
            choices: [
              { value: "bn", label: "বাংলা" },
              { value: "en", label: "English" },
            ],
            value: draft.default_locale,
            onChange: (value) => {
              draft.default_locale = value as Lang;
              markDirty();
            },
          }),
          h("p", { class: "app-tip", text: copy.noPressure }),
        ),
        h(
          "section",
          { class: "app-section" },
          appSectionHead({
            title: copy.socialsTitle,
            description: copy.socialsBody,
            actions: [
              draft.socials.length < 6
                ? appButton({
                    label: copy.addLink,
                    variant: "secondary",
                    size: "sm",
                    icon: "add-line",
                    onClick: () => {
                      draft.socials.push({ platform: "youtube", url: "" });
                      renderSocials();
                      markDirty();
                    },
                  })
                : null,
            ].filter(Boolean) as Node[],
          }),
          socialsList,
        ),
        h(
          "section",
          { class: "app-section" },
          appSectionHead({ title: copy.handleL, description: copy.handleRule }),
          h(
            "div",
            { class: "app-handle-row" },
            h("span", { class: "app-mono app-handle-row__slug", text: `@${creator.slug}`, attrs: { dir: "ltr" } }),
            h(
              "button",
              { class: "app-btn app-btn--secondary app-btn--sm", attrs: { type: "button" }, on: { click: openHandleDialog } },
              h("i", { class: "ri-edit-line ri", attrs: { "aria-hidden": "true" } }),
              h("span", { class: "app-btn__label", text: copy.changeHandle }),
            ),
          ),
        ),
        h(
          "section",
          { class: "app-section" },
          appSectionHead({ title: copy.statusPublished }),
          h("div", { class: "app-publish-row" }, publishButton),
        ),
        saveBar,
      ),
      h(
        "aside",
        { class: "app-profile__aside" },
        h("p", { class: "app-eyebrow", text: copy.previewL }),
        previewSlot,
      ),
    ),
  );

  return appShell(ctx, { active: "profile", creator, copy, content });
}
