/**
 * `/dashboard/profile` — identity editor, emoji picker, social links, slug
 * change and publish/unpublish. No goal UI (Lead decision 5), no identity badge.
 */
import { h, openDialog, toast } from "../../lib/dom.ts";
import { formatDate } from "../../lib/format.ts";
import { messageForError } from "../../lib/messages.ts";
import { isDataError } from "../../lib/errors.ts";
import { validateProfileText, isValidHttpsUrl } from "../../lib/validate.ts";
import type { AppContext } from "../../lib/app.ts";
import type { Creator, SocialKey } from "../../lib/types.ts";
import { icon } from "../../components/icons.ts";
import { avatar, button, selectField, statusPill, textField } from "../../components/ui.ts";
import { renderPreviewCard } from "../../components/preview-card.ts";
import { dashboardHeading, dashboardPage, inlineBanner, loadMethods, loadOwnData, noPageContent } from "./common.ts";

const EMOJIS = [
  "☕", "🍵", "🫖", "📚", "✍️", "🎨", "🎧", "🎬", "🧑‍🏫", "🌿", "🪷", "🐈",
  "🎸", "📷", "🧑‍💻", "🎙️", "🍰", "🥟", "🌙", "⭐", "🌻", "🦋", "🎓", "💡",
];

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

interface Draft {
  display_name: string;
  tagline: string;
  bio: string;
  avatar_emoji: string;
  socials: Array<{ platform: SocialKey; url: string }>;
}

export async function renderDashboardProfile(ctx: AppContext): Promise<HTMLElement> {
  const own = await loadOwnData(ctx);
  if (!own.creator) {
    return dashboardPage(ctx, { active: "profile", creator: null, signedIn: own.signedIn, content: noPageContent(ctx) });
  }
  const creator = own.creator;
  const methods = await loadMethods(ctx, creator);
  const draft: Draft = {
    display_name: creator.display_name,
    tagline: creator.tagline ?? "",
    bio: creator.bio ?? "",
    avatar_emoji: creator.avatar_emoji,
    socials: Object.entries(creator.socials ?? {}).map(([platform, url]) => ({
      platform: platform as SocialKey,
      url: String(url),
    })),
  };
  let dirty = false;
  const bannerSlot = h("div", { class: "banner-slot" });

  const previewSlot = h("div", { class: "profile-preview" });
  const updatePreview = () => {
    const previewCreator: Creator = {
      ...creator,
      display_name: draft.display_name || creator.slug,
      tagline: draft.tagline || null,
      bio: draft.bio || null,
      avatar_emoji: draft.avatar_emoji,
      socials: Object.fromEntries(draft.socials.filter((row) => row.url).map((row) => [row.platform, row.url])),
    };
    previewSlot.replaceChildren(
      renderPreviewCard(ctx, { creator: previewCreator, methods, variant: "preview", pageHref: null, amount: 20 }),
    );
  };

  // ---- form fields -------------------------------------------------------
  const nameField = textField(ctx.lang, {
    id: "profile-name",
    label: ctx.t("onboarding.profile.displayName"),
    value: draft.display_name,
    maxlength: 60,
    required: true,
  });
  const nameCounter = h("p", { class: "field__counter", attrs: { "aria-live": "polite" }, text: `${draft.display_name.length}/60` });
  nameField.wrap.appendChild(nameCounter);
  nameField.input.addEventListener("input", () => {
    draft.display_name = nameField.input.value;
    nameCounter.textContent = `${draft.display_name.length}/60`;
    markDirty();
  });

  const taglineField = textField(ctx.lang, {
    id: "profile-tagline",
    label: ctx.t("onboarding.profile.tagline"),
    value: draft.tagline,
    maxlength: 80,
  });
  const taglineCounter = h("p", { class: "field__counter", attrs: { "aria-live": "polite" }, text: `${draft.tagline.length}/80` });
  taglineField.wrap.appendChild(taglineCounter);
  taglineField.input.addEventListener("input", () => {
    draft.tagline = taglineField.input.value;
    taglineCounter.textContent = `${draft.tagline.length}/80`;
    markDirty();
  });

  const bioField = textField(ctx.lang, {
    id: "profile-bio",
    label: ctx.t("onboarding.profile.bio"),
    value: draft.bio,
    rows: 5,
    maxlength: 600,
  });
  const bioCounter = h("p", { class: "field__counter", attrs: { "aria-live": "polite" }, text: `${draft.bio.length}/600` });
  bioField.wrap.appendChild(bioCounter);
  (bioField.input as HTMLTextAreaElement).addEventListener("input", () => {
    draft.bio = (bioField.input as HTMLTextAreaElement).value;
    bioCounter.textContent = `${draft.bio.length}/600`;
    markDirty();
  });

  // ---- emoji picker -----------------------------------------------------
  const emojiPreview = avatar(draft.avatar_emoji, "lg");
  const emojiGrid = h("div", { class: "emoji-grid", attrs: { role: "radiogroup", "aria-label": ctx.t("common.emojiPicker") } });
  const emojiButtons: HTMLButtonElement[] = EMOJIS.map((emoji) =>
    h(
      "button",
      {
        class: "emoji-grid__item",
        attrs: { type: "button", role: "radio", "aria-checked": String(emoji === draft.avatar_emoji), "aria-label": emoji },
        text: emoji,
      },
    ),
  );
  emojiButtons.forEach((buttonElement) => {
    buttonElement.addEventListener("click", () => {
      draft.avatar_emoji = buttonElement.textContent ?? "☕";
      emojiPreview.textContent = draft.avatar_emoji;
      for (const other of emojiButtons) other.setAttribute("aria-checked", String(other === buttonElement));
      markDirty();
    });
  });
  emojiGrid.append(...emojiButtons);
  const emojiDetails = h(
    "details",
    { class: "emoji-picker" },
    h("summary", { class: "emoji-picker__summary" }, icon("emoji", 18), ctx.t("onboarding.profile.emoji")),
    emojiGrid,
  );

  // ---- social links -----------------------------------------------------
  const socialList = h("div", { class: "social-list" });
  const addSocial = () => {
    if (draft.socials.length >= 6) return;
    draft.socials.push({ platform: "youtube", url: "" });
    renderSocials();
    markDirty();
  };
  const renderSocials = () => {
    socialList.replaceChildren();
    draft.socials.forEach((row, index) => {
      const platformField = selectField(ctx.lang, {
        id: `social-platform-${index}`,
        label: ctx.t("onboarding.profile.socialPlatform"),
        choices: SOCIAL_PLATFORMS.map((platform) => ({ value: platform.value, label: platform.label })),
        value: row.platform,
      });
      platformField.input.addEventListener("change", () => {
        row.platform = platformField.input.value as SocialKey;
        markDirty();
      });
      const urlField = textField(ctx.lang, {
        id: `social-url-${index}`,
        label: ctx.t("onboarding.profile.socialUrl"),
        value: row.url,
        type: "url",
        placeholder: "https://",
      });
      urlField.input.addEventListener("input", () => {
        row.url = urlField.input.value;
        markDirty();
      });
      const remove = button({
        label: ctx.t("common.remove"),
        variant: "ghost",
        size: "sm",
        icon: "trash",
        onClick: () => {
          draft.socials.splice(index, 1);
          renderSocials();
          markDirty();
        },
      });
      socialList.append(
        h("div", { class: "social-row" }, platformField.wrap, urlField.wrap, remove),
      );
    });
  };
  renderSocials();

  // ---- slug -------------------------------------------------------------
  const slugRow = h(
    "div",
    { class: "slug-row" },
    h("div", { class: "slug-row__value" },
      h("span", { class: "slug-row__prefix", text: "@" }),
      h("span", { class: "slug-row__slug", text: creator.slug, attrs: { dir: "ltr" } }),
    ),
    h(
      "button",
      { class: "btn btn--secondary btn--sm", attrs: { type: "button" }, on: { click: () => void openSlugDialog() } },
      h("span", { class: "btn__icon", html: icon("edit", 16) }),
      h("span", { class: "btn__label", text: ctx.t("dashboard.profile.changeSlug") }),
    ),
  );

  const openSlugDialog = async () => {
    const input = h("input", {
      class: "field__control",
      id: "slug-input",
      attrs: { type: "text", autocomplete: "off", spellcheck: "false", value: creator.slug, "aria-label": ctx.t("onboarding.slug.label") },
    });
    const status = h("p", { class: "field__helper", attrs: { "aria-live": "polite" } });
    let timer = 0;
    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      status.textContent = ctx.t("onboarding.slug.checking");
      timer = window.setTimeout(() => {
        void ctx.data.isSlugAvailable(input.value.trim()).then((available) => {
          status.textContent = available ? ctx.t("onboarding.slug.available") : ctx.t("onboarding.slug.taken");
        });
      }, 400);
    });
    const content = h("div", { class: "field" },
      h("label", { class: "field__label", attrs: { for: "slug-input" }, text: ctx.t("onboarding.slug.label") }),
      input,
      h("p", { class: "field__helper", text: ctx.t("onboarding.slug.helper") }),
      h("p", { class: "field__helper", text: ctx.t("dashboard.profile.slugHelper") }),
      status,
    );
    const action = await openDialog({
      title: ctx.t("dashboard.profile.changeSlugTitle"),
      description: ctx.t("dashboard.profile.changeSlugBody"),
      content,
      actions: [
        { id: "cancel", label: ctx.t("common.cancel"), variant: "secondary" },
        { id: "save", label: ctx.t("common.save"), variant: "primary" },
      ],
    });
    if (action !== "save") return;
    const slug = input.value.trim();
    try {
      await ctx.data.changeSlug(creator.id, slug);
      toast(ctx.t("common.saved"));
      ctx.refresh();
    } catch (error) {
      bannerSlot.replaceChildren(inlineBanner(ctx, { message: messageForError(ctx, error), tone: "error" }));
    }
  };

  // ---- publish / unpublish ---------------------------------------------
  const publishAction = async () => {
    try {
      if (creator.status === "published") {
        await ctx.data.setCreatorStatus(creator.id, "draft");
        toast(ctx.t("dashboard.profile.unpublishedToast"));
      } else {
        await ctx.data.setCreatorStatus(creator.id, "published");
        toast(ctx.t("dashboard.profile.publishedToast"));
      }
      ctx.refresh();
    } catch (error) {
      const message = messageForError(ctx, error);
      bannerSlot.replaceChildren(
        inlineBanner(ctx, {
          message,
          tone: "warn",
          actionLabel: isDataError(error) && error.code === "PUBLISH_NEEDS_METHOD" ? ctx.t("dashboard.profile.publishBlockedLink") : undefined,
          onAction: () => ctx.navigate("/dashboard/payments"),
        }),
      );
    }
  };

  const publishButton = button({
    label: creator.status === "published" ? ctx.t("dashboard.profile.unpublish") : ctx.t("dashboard.profile.publish"),
    variant: creator.status === "published" ? "secondary" : "primary",
    size: "sm",
    icon: creator.status === "published" ? "eyeOff" : "checkCircle",
    onClick: () => {
      if (creator.status === "published") {
        void (async () => {
          const action = await openDialog({
            title: ctx.t("dashboard.profile.unpublish"),
            description: ctx.t("creator.draftBanner"),
            destructive: true,
            actions: [
              { id: "cancel", label: ctx.t("common.cancel"), variant: "secondary" },
              { id: "confirm", label: ctx.t("dashboard.profile.unpublish"), variant: "danger" },
            ],
          });
          if (action === "confirm") await publishAction();
        })();
      } else {
        void publishAction();
      }
    },
  });

  // ---- save bar ---------------------------------------------------------
  const saveBar = h("div", { class: "save-bar", attrs: { hidden: true } });
  const save = button({
    label: ctx.t("common.save"),
    variant: "primary",
    size: "sm",
    onClick: () => void persist(),
  });
  const cancel = button({ label: ctx.t("common.cancel"), variant: "secondary", size: "sm", onClick: () => ctx.refresh() });
  saveBar.append(h("p", { class: "save-bar__text", text: ctx.t("dashboard.profile.discard") }), cancel, save);

  const markDirty = () => {
    dirty = true;
    saveBar.hidden = false;
    document.body.classList.add("is-dirty");
    updatePreview();
  };

  const persist = async () => {
    const validation = validateProfileText({
      display_name: draft.display_name,
      tagline: draft.tagline,
      bio: draft.bio,
    });
    nameField.setError(validation.errors.display_name ? ctx.t("claim.form.error.tooLong") : null);
    taglineField.setError(validation.errors.tagline ? (validation.errors.tagline === "BANNED" ? ctx.t("claim.form.error.banned") : ctx.t("claim.form.error.tooLong")) : null);
    bioField.setError(validation.errors.bio ? (validation.errors.bio === "BANNED" ? ctx.t("claim.form.error.banned") : ctx.t("claim.form.error.tooLong")) : null);

    const socials: Record<string, string> = {};
    let socialError = "";
    for (const row of draft.socials) {
      if (!row.url.trim()) continue;
      if (!isValidHttpsUrl(row.url.trim())) {
        socialError = ctx.t("claim.form.error.invalid");
        break;
      }
      socials[row.platform] = row.url.trim();
    }
    if (Object.keys(socials).length > 6) socialError = ctx.t("error.generic");

    if (!validation.ok || socialError) {
      if (socialError) bannerSlot.replaceChildren(inlineBanner(ctx, { message: socialError, tone: "error" }));
      return;
    }

    try {
      await ctx.data.updateCreator(creator.id, {
        display_name: draft.display_name.trim(),
        tagline: draft.tagline.trim() || null,
        bio: draft.bio.trim() || null,
        avatar_emoji: draft.avatar_emoji,
        socials,
      });
      dirty = false;
      saveBar.hidden = true;
      document.body.classList.remove("is-dirty");
      toast(ctx.t("dashboard.profile.savedToast"));
      ctx.refresh();
    } catch (error) {
      bannerSlot.replaceChildren(inlineBanner(ctx, { message: messageForError(ctx, error), tone: "error" }));
    }
  };

  window.addEventListener("beforeunload", (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  }, { once: true });

  updatePreview();

  const content = h(
    "div",
    {},
    dashboardHeading(ctx, ctx.t("dashboard.profile.title"), ctx.t("dashboard.profile.desc"), [publishButton]),
    bannerSlot,
    h(
      "div",
      { class: "profile-layout" },
      h(
        "div",
        { class: "profile-form dash-panel" },
        h("section", { class: "form-section" },
          h("h2", { class: "form-section__title", text: ctx.t("dashboard.profile.title") }),
          h("div", { class: "emoji-row" }, emojiPreview, emojiDetails),
          nameField.wrap,
          taglineField.wrap,
          bioField.wrap,
        ),
        h("section", { class: "form-section" },
          h("h2", { class: "form-section__title", text: ctx.t("onboarding.profile.socials") }),
          socialList,
          draft.socials.length < 6
            ? button({ label: ctx.t("onboarding.profile.addSocial"), variant: "secondary", size: "sm", icon: "plus", onClick: addSocial })
            : null,
        ),
        h("section", { class: "form-section" },
          h("h2", { class: "form-section__title", text: ctx.t("dashboard.profile.slug") }),
          slugRow,
          h("p", { class: "field__helper", text: ctx.t("dashboard.profile.slugHelper") }),
        ),
        h("section", { class: "form-section" },
          h("h2", { class: "form-section__title", text: ctx.t("dashboard.status.published") }),
          h("div", { class: "profile-status" },
            statusPill(ctx, creator.status),
            creator.published_at
              ? h("span", { class: "field__helper", text: ctx.t("creator.method.lastUpdated", { date: formatDate(ctx.lang, creator.published_at) }) })
              : null,
          ),
        ),
        saveBar,
      ),
      h("aside", { class: "profile-preview-col" },
        h("p", { class: "profile-preview__label", text: ctx.t("dashboard.profile.preview") }),
        previewSlot,
      ),
    ),
  );

  return dashboardPage(ctx, { active: "profile", creator, signedIn: own.signedIn, content });
}
