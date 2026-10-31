/**
 * `/onboarding` — the 4-step wizard: link → payment details → profile → publish
 * & share. Each step persists a draft; publishing needs ≥1 enabled payment
 * method. Local demo mode works with no backend (the page stays in this browser).
 */
import { h, openDialog, toast, focusElement } from "../lib/dom.ts";
import { formatDate } from "../lib/format.ts";
import { messageForError } from "../lib/messages.ts";
import { classifyPayload } from "../lib/qr-payload.ts";
import { generatePosterSvg } from "../lib/poster.ts";
import { buildShareKit, creatorPageUrl } from "../lib/share.ts";
import {
  checkSlugLocally,
  isSlugRuleValid,
  slugProblem,
  validatePaymentMethod,
  validateProfileText,
} from "../lib/validate.ts";
import type { AppContext } from "../lib/app.ts";
import { cx } from "../lib/app.ts";
import type {
  Creator,
  Lang,
  PaymentKind,
  PaymentMethod,
  PaymentQrStatus,
  QrDecodedSnapshot,
  SocialKey,
} from "../lib/types.ts";
import { icon, steamMark } from "../components/icons.ts";
import {
  avatar,
  badge,
  button,
  linkButton,
  selectField,
  textField,
} from "../components/ui.ts";
import { renderPreviewCard } from "../components/preview-card.ts";
import { renderShareKit } from "../components/share-kit.ts";
import { demoBanner } from "../components/layout.ts";

type Step = 1 | 2 | 3 | 4;

const STEP_KEYS: Record<Step, string> = {
  1: "onboarding.steps.link",
  2: "onboarding.steps.payment",
  3: "onboarding.steps.profile",
  4: "onboarding.steps.publish",
};

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

const EMOJIS = ["☕", "🍵", "🫖", "📚", "✍️", "🎨", "🎧", "🎬", "🧑‍🏫", "🌿", "🪷", "🐈", "🎸", "📷", "🧑‍💻", "🎙️", "🍰", "🥟", "🌙", "⭐", "🌻", "🦋", "🎓", "💡"];

interface WizardState {
  step: Step;
  creator: Creator | null;
  methods: PaymentMethod[];
  slug: string;
  slugStatus: "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";
  display_name: string;
  tagline: string;
  bio: string;
  avatar_emoji: string;
  socials: Array<{ platform: SocialKey; url: string }>;
}

function stepIndicator(ctx: AppContext, current: Step): HTMLElement {
  const list = h("ol", { class: "steps-indicator", attrs: { "aria-label": ctx.t("onboarding.title") } });
  for (const step of [1, 2, 3, 4] as Step[]) {
    list.append(
      h(
        "li",
        {
          class: cx("steps-indicator__item", step === current && "steps-indicator__item--current", step < current && "steps-indicator__item--done"),
          attrs: { "aria-current": step === current ? "step" : null },
        },
        h("span", { class: "steps-indicator__number", text: String(step), attrs: { "aria-hidden": "true" } }),
        h("span", { class: "steps-indicator__label", text: ctx.t(STEP_KEYS[step]) }),
      ),
    );
  }
  return list;
}

function authRequired(ctx: AppContext): HTMLElement {
  return h(
    "div",
    { class: "auth-card" },
    h("span", { class: "auth-card__mark", html: "☕", attrs: { "aria-hidden": "true" } }),
    h("h1", { class: "auth-card__title", text: ctx.t("onboarding.authRequired") }),
    linkButton({
      href: `${ctx.href("/login")}?next=${encodeURIComponent("/onboarding")}`,
      label: ctx.t("login.title"),
      variant: "primary",
      block: true,
    }),
    linkButton({ href: ctx.href("/"), label: ctx.t("login.back"), variant: "ghost", size: "sm", icon: "arrowLeft" }),
  );
}

export async function renderOnboarding(ctx: AppContext): Promise<HTMLElement> {
  ctx.setMeta(ctx.t("meta.title.onboarding"));
  const session = await ctx.data.getSession().catch(() => null);
  if (ctx.config.mode === "supabase" && !session) return authRequired(ctx);

  const creator = await ctx.data.getMyCreator().catch(() => null);
  const methods = creator ? await ctx.data.listMyPaymentMethods(creator.id).catch(() => []) : [];

  const state: WizardState = {
    step: creator ? 2 : 1,
    creator,
    methods,
    slug: creator?.slug ?? "",
    slugStatus: creator ? "available" : "idle",
    display_name: creator?.display_name ?? "",
    tagline: creator?.tagline ?? "",
    bio: creator?.bio ?? "",
    avatar_emoji: creator?.avatar_emoji ?? "☕",
    socials: Object.entries(creator?.socials ?? {}).map(([platform, url]) => ({
      platform: platform as SocialKey,
      url: String(url),
    })),
  };

  const page = h("div", { class: "onboarding" });
  const bannerSlot = h("div", { class: "banner-slot" });

  const previewCreator = (): Creator => ({
    id: state.creator?.id ?? "preview",
    slug: state.slug || "your-page",
    display_name: state.display_name.trim() || (state.slug ? state.slug.replace(/-/g, " ") : ctx.t("onboarding.title")),
    tagline: state.tagline.trim() || null,
    bio: state.bio.trim() || null,
    avatar_emoji: state.avatar_emoji,
    socials: Object.fromEntries(state.socials.filter((row) => row.url).map((row) => [row.platform, row.url])),
    goal_amount_bdt: null,
    goal_note: null,
    default_locale: "bn",
    status: state.creator?.status ?? "draft",
    verified: false,
    published_at: state.creator?.published_at ?? null,
    updated_at: new Date().toISOString(),
    created_at: state.creator?.created_at ?? new Date().toISOString(),
    is_demo: false,
  });

  const render = () => {
    page.className = cx("onboarding", state.step === 4 && "onboarding--step4");
    page.replaceChildren();
    bannerSlot.replaceChildren();

    const content = h("div", { class: "onboarding__inner" });
    content.append(
      h(
        "header",
        { class: "onboarding__header" },
        h("div", { class: "onboarding__intro" },
          h("span", { class: "onboarding__mark", html: steamMark(28), attrs: { "aria-hidden": "true" } }),
          h("h1", { class: "onboarding__title", text: ctx.t("onboarding.title") }),
          h("p", { class: "onboarding__subtitle", text: ctx.t("onboarding.intro") }),
        ),
        ctx.isDemoMode ? demoBanner(ctx, "demo.localBanner") : null,
        stepIndicator(ctx, state.step),
        bannerSlot,
      ),
    );

    const layout = h("div", { class: "onboarding__layout" });
    const formColumn = h("div", { class: "onboarding__form" });
    const previewColumn = h("aside", { class: "onboarding__preview", attrs: { "aria-label": ctx.t("onboarding.preview") } });
    previewColumn.append(
      h("p", { class: "onboarding__preview-label", text: ctx.t("onboarding.preview") }),
      renderPreviewCard(ctx, {
        creator: previewCreator(),
        methods: state.methods,
        variant: "preview",
        pageHref: null,
        amount: 20,
      }),
    );
    layout.append(formColumn, previewColumn);
    content.append(layout);
    page.append(content);

    const stepTitle = h("h2", { class: "section-heading", text: ctx.t(STEP_KEYS[state.step]) });
    formColumn.append(stepTitle);

    if (state.step === 1) formColumn.append(renderStepSlug(ctx, state, render, () => void nextFromSlug()));
    else if (state.step === 2) formColumn.append(renderStepPayments(ctx, state, render));
    else if (state.step === 3) formColumn.append(renderStepProfile(ctx, state, render));
    else formColumn.append(renderStepPublish(ctx, state, render));

    const nav = h("div", { class: "onboarding__nav" });
    if (state.step > 1 && state.creator) {
      nav.append(
        button({
          label: ctx.t("onboarding.back"),
          variant: "secondary",
          icon: "arrowLeft",
          onClick: () => {
            state.step = (state.step - 1) as Step;
            render();
          },
        }),
      );
    }
    if (state.step < 4) {
      nav.append(
        button({
          label: ctx.t("onboarding.next"),
          variant: "primary",
          iconTrailing: "arrowRight",
          disabled: state.step === 1 && state.slugStatus !== "available",
          onClick: () => void nextStep(),
        }),
        button({
          label: ctx.t("onboarding.continueLater"),
          variant: "ghost",
          size: "sm",
          onClick: () => void continueLater(),
        }),
      );
    } else {
      nav.append(
        button({
          label: ctx.t("onboarding.continueLater"),
          variant: "ghost",
          size: "sm",
          onClick: () => void continueLater(),
        }),
      );
    }
    formColumn.append(nav);
  };

  const nextFromSlug = async () => {
    const slug = state.slug.trim();
    if (!isSlugRuleValid(slug)) {
      state.slugStatus = "invalid";
      render();
      return;
    }
    const available = await ctx.data.isSlugAvailable(slug).catch(() => false);
    if (!available && state.creator?.slug !== slug) {
      state.slugStatus = "taken";
      render();
      return;
    }
    state.slugStatus = "available";
    try {
      if (!state.creator) {
        const created = await ctx.data.createCreator({
          slug,
          display_name: state.display_name.trim() || slug.replace(/-/g, " "),
          tagline: state.tagline || null,
          bio: state.bio || null,
          avatar_emoji: state.avatar_emoji,
        });
        state.creator = created;
        state.display_name = created.display_name;
      } else if (state.creator.slug !== slug) {
        const changed = await ctx.data.changeSlug(state.creator.id, slug);
        state.creator = changed;
      }
    } catch (error) {
      bannerSlot.replaceChildren(
        h("div", { class: "inline-banner inline-banner--error", attrs: { role: "alert" } }, h("p", { text: messageForError(ctx, error) })),
      );
      return;
    }
    state.step = 2;
    render();
  };

  const saveProfile = async () => {
    if (!state.creator) return;
    const validation = validateProfileText({ display_name: state.display_name, tagline: state.tagline, bio: state.bio });
    if (!validation.ok) {
      bannerSlot.replaceChildren(
        h(
          "div",
          { class: "inline-banner inline-banner--error", attrs: { role: "alert" } },
          h("p", {
            text:
              validation.errors.display_name === "REQUIRED"
                ? ctx.t("claim.form.amountError.required")
                : validation.errors.tagline === "BANNED" || validation.errors.bio === "BANNED"
                  ? ctx.t("claim.form.error.banned")
                  : ctx.t("claim.form.error.tooLong"),
          }),
        ),
      );
      return false;
    }
    const socials: Record<string, string> = {};
    for (const row of state.socials) {
      if (!row.url.trim()) continue;
      if (!row.url.trim().startsWith("https://")) {
        bannerSlot.replaceChildren(
          h("div", { class: "inline-banner inline-banner--error", attrs: { role: "alert" } }, h("p", { text: ctx.t("claim.form.error.invalid") })),
        );
        return false;
      }
      socials[row.platform] = row.url.trim();
    }
    try {
      state.creator = await ctx.data.updateCreator(state.creator.id, {
        display_name: state.display_name.trim(),
        tagline: state.tagline.trim() || null,
        bio: state.bio.trim() || null,
        avatar_emoji: state.avatar_emoji,
        socials,
      });
      return true;
    } catch (error) {
      bannerSlot.replaceChildren(
        h("div", { class: "inline-banner inline-banner--error", attrs: { role: "alert" } }, h("p", { text: messageForError(ctx, error) })),
      );
      return false;
    }
  };

  const nextStep = async () => {
    bannerSlot.replaceChildren();
    if (state.step === 1) return nextFromSlug();
    if (state.step === 2) {
      state.step = 3;
      render();
      return;
    }
    if (state.step === 3) {
      const saved = await saveProfile();
      if (!saved) return;
      toast(ctx.t("onboarding.draftSaved"));
      state.step = 4;
      render();
    }
  };

  const continueLater = async () => {
    if (state.creator && state.step >= 3) await saveProfile();
    ctx.navigate("/dashboard");
  };

  render();
  return page;
}

// ---- step 1: slug ---------------------------------------------------------

function renderStepSlug(ctx: AppContext, state: WizardState, rerender: () => void, onNext: () => void): HTMLElement {
  const statusText: Record<WizardState["slugStatus"], string> = {
    idle: ctx.t("onboarding.slug.helper"),
    checking: ctx.t("onboarding.slug.checking"),
    available: ctx.t("onboarding.slug.available"),
    taken: ctx.t("onboarding.slug.taken"),
    reserved: ctx.t("onboarding.slug.reserved"),
    invalid: ctx.t("onboarding.slug.invalid"),
  };

  const input = h("input", {
    class: "field__control slug-input__control",
    id: "onboarding-slug",
    attrs: {
      type: "text",
      autocomplete: "off",
      autocapitalize: "none",
      autocorrect: "off",
      spellcheck: "false",
      maxlength: 30,
      value: state.slug,
      "aria-describedby": "onboarding-slug-helper",
    },
  });
  const status = h("p", {
    class: cx("slug-status", `slug-status--${state.slugStatus}`),
    id: "onboarding-slug-helper",
    attrs: { "aria-live": "polite" },
    text: statusText[state.slugStatus],
  });

  let timer = 0;
  input.addEventListener("input", () => {
    state.slug = input.value.trim().toLowerCase();
    input.value = state.slug;
    window.clearTimeout(timer);
    const problem = slugProblem(state.slug);
    if (problem === "reserved") {
      state.slugStatus = "reserved";
    } else if (problem !== null) {
      state.slugStatus = state.slug.length === 0 ? "idle" : "invalid";
    } else if (state.creator?.slug === state.slug) {
      state.slugStatus = "available";
    } else {
      state.slugStatus = "checking";
      timer = window.setTimeout(() => {
        void ctx.data.isSlugAvailable(state.slug).then((available) => {
          state.slugStatus = available ? "available" : "taken";
          rerender();
        });
      }, 400);
    }
    status.textContent = statusText[state.slugStatus];
    status.className = cx("slug-status", `slug-status--${state.slugStatus}`);
  });
  input.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Enter") {
      event.preventDefault();
      onNext();
    }
  });

  return h(
    "div",
    { class: "onboarding-step" },
    h(
      "div",
      { class: "field" },
      h("label", { class: "field__label", attrs: { for: "onboarding-slug" }, text: ctx.t("onboarding.slug.label") }),
      h(
        "div",
        { class: "slug-input" },
        h("span", { class: "slug-input__prefix", text: "@", attrs: { "aria-hidden": "true" } }),
        input,
      ),
      h("p", { class: "field__helper", text: ctx.t("onboarding.slug.helper") }),
      status,
    ),
    h("p", { class: "field__helper", text: ctx.t("honesty.creatorNote") }),
  );
}

// ---- step 2: payment methods ---------------------------------------------

function renderStepPayments(ctx: AppContext, state: WizardState, rerender: () => void): HTMLElement {
  const wrap = h("div", { class: "onboarding-step" });
  const list = h("ul", { class: "method-list method-list--compact" });
  if (state.methods.length === 0) {
    wrap.append(h("p", { class: "onboarding__empty", text: ctx.t("onboarding.payment.empty") }));
  } else {
    for (const method of state.methods) {
      list.append(
        h(
          "li",
          { class: "method-row method-row--compact" },
          h("div", { class: "method-row__identity" },
            h("span", { class: "method-row__provider", text: ctx.t(`provider.${method.kind}`) }),
            h("span", { class: "method-row__label", text: method.label }),
          ),
          qrMethodBadge(ctx, method),
          h("span", { class: "method-row__account", attrs: { dir: "ltr" }, text: method.account_number ?? "" }),
          button({
            label: ctx.t("common.remove"),
            variant: "ghost",
            size: "sm",
            icon: "trash",
            onClick: () => {
              void ctx.data.deletePaymentMethod(method.id).then(() => {
                state.methods = state.methods.filter((entry) => entry.id !== method.id);
                rerender();
              });
            },
          }),
        ),
      );
    }
    wrap.append(list);
    wrap.append(h("p", { class: "field__helper", text: ctx.t("onboarding.payment.addedCount", { count: state.methods.length }) }));
  }

  wrap.append(h("h3", { class: "form-section__title", text: ctx.t("onboarding.payment.addAnother") }));

  let mode: "paste" | "upload" | "manual" = "paste";
  let qrPayload = "";
  let qrStatus: PaymentQrStatus = "none";
  let qrDecoded: QrDecodedSnapshot | null = null;

  const modeButtons = (["paste", "upload", "manual"] as const).map((value) =>
    h(
      "button",
      {
        class: cx("segment", mode === value && "segment--active"),
        attrs: { type: "button", "aria-pressed": String(mode === value) },
        text: ctx.t(`onboarding.payment.${value === "paste" ? "qrTab" : value === "upload" ? "uploadTab" : "manualTab"}`),
      },
    ),
  );
  const segments = h("div", { class: "segments" }, ...modeButtons);

  const kindField = selectField(ctx.lang, {
    id: "onboarding-kind",
    label: ctx.t("onboarding.payment.kind"),
    choices: [
      { value: "bkash", label: ctx.t("provider.bkash") },
      { value: "nagad", label: ctx.t("provider.nagad") },
      { value: "rocket", label: ctx.t("provider.rocket") },
      { value: "bank", label: ctx.t("provider.bank") },
      { value: "other", label: ctx.t("provider.other") },
    ],
    value: "bkash",
  });
  const labelField = textField(ctx.lang, {
    id: "onboarding-label",
    label: ctx.t("onboarding.payment.label"),
    placeholder: ctx.t("onboarding.payment.labelPlaceholder"),
    maxlength: 40,
    required: true,
  });
  const accountField = textField(ctx.lang, {
    id: "onboarding-account",
    label: ctx.t("onboarding.payment.account"),
    inputmode: "numeric",
    mono: true,
  });
  const holderField = textField(ctx.lang, { id: "onboarding-holder", label: ctx.t("onboarding.payment.holder") });
  const bankField = textField(ctx.lang, { id: "onboarding-bank", label: ctx.t("onboarding.payment.bank") });
  const branchField = textField(ctx.lang, { id: "onboarding-branch", label: ctx.t("onboarding.payment.branch") });
  const routingField = textField(ctx.lang, { id: "onboarding-routing", label: ctx.t("onboarding.payment.routing"), inputmode: "numeric" });
  const bankFields = h("div", { class: "form-grid", attrs: { hidden: true } }, bankField.wrap, branchField.wrap, routingField.wrap);

  kindField.input.addEventListener("change", () => {
    bankFields.hidden = kindField.input.value !== "bank";
  });

  const decodeStatus = h("p", { class: "decode-status decode-status--idle", attrs: { "aria-live": "polite" }, text: ctx.t("onboarding.payment.decode.idle") });
  const merchantLine = h("p", { class: "decode-merchant", attrs: { hidden: true } });

  const applyPayload = (payload: string) => {
    const classification = classifyPayload(payload);
    if (!classification.ok) {
      qrPayload = payload;
      qrStatus = "none";
      qrDecoded = null;
      decodeStatus.className = "decode-status decode-status--error";
      decodeStatus.textContent = ctx.t("onboarding.payment.decode.failed");
      merchantLine.hidden = true;
      return;
    }
    qrPayload = payload;
    qrStatus = classification.status;
    qrDecoded = classification.decoded;
    if (classification.merchantName) {
      merchantLine.hidden = false;
      merchantLine.textContent = `${classification.merchantName} — ${ctx.t("onboarding.payment.merchant")}`;
    }
    decodeStatus.className = `decode-status decode-status--${classification.status === "verified" ? "ok" : "warn"}`;
    decodeStatus.textContent = ctx.t(
      classification.status === "verified" ? "onboarding.payment.decode.verified" : "onboarding.payment.decode.unverified",
    );
  };

  // paste area
  const pasteArea = h("div", { class: "form-section" });
  const qrText = h("textarea", {
    class: "field__control field__control--area field__control--mono",
    id: "onboarding-payload",
    attrs: { rows: 3, placeholder: ctx.t("onboarding.payment.pastePlaceholder"), spellcheck: "false" },
  });
  let pasteTimer = 0;
  qrText.addEventListener("input", () => {
    window.clearTimeout(pasteTimer);
    const value = qrText.value.trim();
    if (!value) {
      qrPayload = "";
      qrStatus = "none";
      qrDecoded = null;
      decodeStatus.className = "decode-status decode-status--idle";
      decodeStatus.textContent = ctx.t("onboarding.payment.decode.idle");
      merchantLine.hidden = true;
      return;
    }
    decodeStatus.className = "decode-status decode-status--idle";
    decodeStatus.textContent = ctx.t("onboarding.payment.decode.reading");
    pasteTimer = window.setTimeout(() => applyPayload(value), 250);
  });
  pasteArea.append(
    h("label", { class: "field__label", attrs: { for: "onboarding-payload" }, text: ctx.t("onboarding.payment.pasteLabel") }),
    qrText,
  );

  // upload area
  const uploadArea = h("div", { class: "form-section", attrs: { hidden: true } });
  const fileInput = h("input", {
    class: "sr-only",
    id: "onboarding-qr-file",
    attrs: { type: "file", accept: "image/png,image/jpeg,image/webp" },
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    decodeStatus.className = "decode-status decode-status--idle";
    decodeStatus.textContent = ctx.t("onboarding.payment.decode.reading");
    void import("../lib/qr-image.ts")
      .then((module) => module.decodeQrImageFile(file))
      .then((result) => {
        if (!result.ok || !result.payload) {
          decodeStatus.className = "decode-status decode-status--error";
          decodeStatus.textContent =
            result.error === "too_large" ? ctx.t("onboarding.payment.decode.tooLarge") : ctx.t("onboarding.payment.decode.failed");
          return;
        }
        qrText.value = result.payload;
        applyPayload(result.payload);
      })
      .catch(() => {
        decodeStatus.className = "decode-status decode-status--error";
        decodeStatus.textContent = ctx.t("onboarding.payment.decode.failed");
      });
  });
  uploadArea.append(
    h(
      "label",
      { class: "upload-drop", attrs: { for: "onboarding-qr-file" } },
      h("span", { class: "upload-drop__icon", html: icon("image", 32) }),
      h("span", { class: "upload-drop__title", text: ctx.t("onboarding.payment.uploadLabel") }),
      h("span", { class: "upload-drop__hint", text: ctx.t("onboarding.payment.uploadHint") }),
      h("span", { class: "field__helper", text: ctx.t("onboarding.payment.uploadTypes") }),
    ),
    fileInput,
    h("p", { class: "field__helper", text: ctx.t("onboarding.payment.uploadNote") }),
  );

  const modeAreas = { paste: pasteArea, upload: uploadArea, manual: h("div", { attrs: { hidden: true } }) };
  const setMode = (next: "paste" | "upload" | "manual") => {
    mode = next;
    modeButtons.forEach((buttonElement, index) => {
      const value = (["paste", "upload", "manual"] as const)[index];
      buttonElement.classList.toggle("segment--active", value === next);
      buttonElement.setAttribute("aria-pressed", String(value === next));
    });
    pasteArea.hidden = next !== "paste";
    uploadArea.hidden = next !== "upload";
    if (next === "manual") {
      qrPayload = "";
      qrStatus = "none";
      qrDecoded = null;
      decodeStatus.className = "decode-status decode-status--idle";
      decodeStatus.textContent = ctx.t("onboarding.payment.decode.idle");
      merchantLine.hidden = true;
    }
  };
  modeButtons.forEach((buttonElement, index) => {
    const value = (["paste", "upload", "manual"] as const)[index];
    if (value) buttonElement.addEventListener("click", () => setMode(value));
  });

  const save = button({
    label: ctx.t("onboarding.payment.save"),
    variant: "primary",
    onClick: () => {
      if (!state.creator) return;
      const kind = kindField.input.value as PaymentKind;
      const account = accountField.input.value.trim();
      const evidenceOk = mode === "manual" ? account.length > 0 : qrPayload.length > 0 || account.length > 0;
      if (!evidenceOk) {
        decodeStatus.className = "decode-status decode-status--error";
        decodeStatus.textContent = ctx.t("claim.form.error.invalid");
        return;
      }
      if (mode !== "manual" && qrPayload && qrStatus === "none") {
        decodeStatus.className = "decode-status decode-status--error";
        decodeStatus.textContent = ctx.t("onboarding.payment.decode.failed");
        return;
      }
      const validation = validatePaymentMethod({
        kind,
        label: labelField.input.value,
        account_number: account || null,
        account_holder: holderField.input.value,
        bank_name: bankField.input.value,
        routing_number: routingField.input.value,
        qr_payload: qrPayload || null,
      });
      if (!validation.ok) {
        const issue = validation.issues[0];
        const message = ctx.t("claim.form.error.invalid");
        if (issue?.field === "label") labelField.setError(message);
        if (issue?.field === "account") accountField.setError(message);
        if (issue?.field === "routing") routingField.setError(message);
        if (issue?.field === "evidence") accountField.setError(message);
        return;
      }
      void ctx.data
        .savePaymentMethod({
          creator_id: state.creator.id,
          kind,
          label: labelField.input.value.trim(),
          account_number: account || null,
          account_holder: holderField.input.value.trim() || null,
          bank_name: kind === "bank" ? bankField.input.value.trim() : null,
          branch: kind === "bank" ? branchField.input.value.trim() : null,
          routing_number: kind === "bank" ? routingField.input.value.trim() : null,
          qr_payload: qrPayload || null,
          qr_status: qrPayload ? qrStatus : "none",
          qr_decoded: qrDecoded,
          sort_order: state.methods.length,
          enabled: true,
        })
        .then((method) => {
          state.methods = [...state.methods, method];
          toast(ctx.t("onboarding.payment.saved"));
          rerender();
        })
        .catch((error: unknown) => {
          decodeStatus.className = "decode-status decode-status--error";
          decodeStatus.textContent = messageForError(ctx, error);
        });
    },
  });

  wrap.append(
    h("div", { class: "method-editor" },
      segments,
      modeAreas.paste,
      modeAreas.upload,
      decodeStatus,
      merchantLine,
      h("div", { class: "form-grid" }, kindField.wrap, labelField.wrap),
      h("div", { class: "form-grid" }, accountField.wrap, holderField.wrap),
      bankFields,
      save,
    ),
    h("p", { class: "field__helper", text: ctx.t("honesty.creatorNote") }),
  );
  if (mode === "paste") {
    pasteArea.hidden = false;
    uploadArea.hidden = true;
  }
  return wrap;
}

function qrMethodBadge(ctx: AppContext, method: PaymentMethod): HTMLElement {
  if (method.qr_status === "verified") {
    return badge({ label: ctx.t("creator.qr.status.verified"), variant: "confirmed", icon: "checkCircle" });
  }
  if (method.qr_status === "unverified") {
    return badge({ label: ctx.t("creator.qr.status.unverified"), variant: "selfreported", icon: "info" });
  }
  return badge({ label: ctx.t("creator.qr.status.manual"), variant: "neutral", icon: "hash" });
}

// ---- step 3: profile ------------------------------------------------------

function renderStepProfile(ctx: AppContext, state: WizardState, rerender: () => void): HTMLElement {
  const wrap = h("div", { class: "onboarding-step" });
  const emojiPreview = avatar(state.avatar_emoji, "lg");
  const emojiGrid = h("div", { class: "emoji-grid", attrs: { role: "radiogroup", "aria-label": ctx.t("common.emojiPicker") } });
  const emojiButtons = EMOJIS.map((emoji) =>
    h("button", {
      class: "emoji-grid__item",
      attrs: { type: "button", role: "radio", "aria-checked": String(emoji === state.avatar_emoji), "aria-label": emoji },
      text: emoji,
    }),
  );
  emojiButtons.forEach((emojiButton) => {
    emojiButton.addEventListener("click", () => {
      state.avatar_emoji = emojiButton.textContent ?? "☕";
      emojiPreview.textContent = state.avatar_emoji;
      for (const other of emojiButtons) other.setAttribute("aria-checked", String(other === emojiButton));
      rerender();
    });
  });
  emojiGrid.append(...emojiButtons);

  const nameField = textField(ctx.lang, {
    id: "onboarding-name",
    label: ctx.t("onboarding.profile.displayName"),
    value: state.display_name,
    maxlength: 60,
    required: true,
  });
  nameField.input.addEventListener("input", () => {
    state.display_name = nameField.input.value;
  });
  const taglineField = textField(ctx.lang, {
    id: "onboarding-tagline",
    label: ctx.t("onboarding.profile.tagline"),
    value: state.tagline,
    maxlength: 80,
  });
  taglineField.input.addEventListener("input", () => {
    state.tagline = taglineField.input.value;
  });
  const bioField = textField(ctx.lang, {
    id: "onboarding-bio",
    label: ctx.t("onboarding.profile.bio"),
    value: state.bio,
    rows: 4,
    maxlength: 600,
  });
  bioField.input.addEventListener("input", () => {
    state.bio = (bioField.input as HTMLTextAreaElement).value;
  });

  const socialList = h("div", { class: "social-list" });
  const renderSocials = () => {
    socialList.replaceChildren();
    state.socials.forEach((row, index) => {
      const platform = selectField(ctx.lang, {
        id: `onboarding-social-${index}`,
        label: ctx.t("onboarding.profile.socialPlatform"),
        choices: SOCIAL_PLATFORMS.map((entry) => ({ value: entry.value, label: entry.label })),
        value: row.platform,
      });
      platform.input.addEventListener("change", () => {
        row.platform = platform.input.value as SocialKey;
      });
      const url = textField(ctx.lang, {
        id: `onboarding-social-url-${index}`,
        label: ctx.t("onboarding.profile.socialUrl"),
        value: row.url,
        type: "url",
        placeholder: "https://",
      });
      url.input.addEventListener("input", () => {
        row.url = url.input.value;
      });
      socialList.append(
        h("div", { class: "social-row" },
          platform.wrap,
          url.wrap,
          button({
            label: ctx.t("common.remove"),
            variant: "ghost",
            size: "sm",
            icon: "trash",
            onClick: () => {
              state.socials.splice(index, 1);
              renderSocials();
            },
          }),
        ),
      );
    });
  };
  renderSocials();

  wrap.append(
    h("div", { class: "emoji-row" },
      emojiPreview,
      h("details", { class: "emoji-picker" },
        h("summary", { class: "emoji-picker__summary" }, icon("emoji", 18), ctx.t("onboarding.profile.emoji")),
        emojiGrid,
      ),
    ),
    nameField.wrap,
    taglineField.wrap,
    bioField.wrap,
    h("h3", { class: "form-section__title", text: ctx.t("onboarding.profile.socials") }),
    socialList,
    ...(state.socials.length < 6
      ? [
          button({
            label: ctx.t("onboarding.profile.addSocial"),
            variant: "secondary",
            size: "sm",
            icon: "plus",
            onClick: () => {
              state.socials.push({ platform: "youtube", url: "" });
              renderSocials();
            },
          }),
        ]
      : []),
  );
  return wrap;
}

// ---- step 4: publish & share ---------------------------------------------

function renderStepPublish(ctx: AppContext, state: WizardState, rerender: () => void): HTMLElement {
  const wrap = h("div", { class: "onboarding-step" });
  if (!state.creator) return wrap;
  const creator = state.creator;
  const published = creator.status === "published";
  const enabled = state.methods.filter((method) => method.enabled);
  const pageUrl = creatorPageUrl(creator.slug, ctx.origin, ctx.base);

  if (published) {
    wrap.append(
      h("div", { class: "inline-banner inline-banner--ok", attrs: { role: "status" } },
        h("span", { html: icon("checkCircle", 18) }),
        h("p", { text: ctx.t("onboarding.publish.published") }),
      ),
      renderShareKit(ctx, { slug: creator.slug, creatorName: creator.display_name }),
      h("div", { class: "onboarding__published-actions" },
        linkButton({ href: ctx.href(`/@${creator.slug}`), label: ctx.t("onboarding.publish.openPage"), variant: "primary", icon: "external" }),
        linkButton({ href: ctx.href("/dashboard"), label: ctx.t("onboarding.publish.goDashboard"), variant: "secondary", icon: "arrowRight" }),
        posterButton(),
      ),
    );
    return wrap;
  }

  wrap.append(
    h("p", { class: "onboarding__ready", text: ctx.t("onboarding.publish.ready") }),
    ...(enabled.length === 0
      ? [
          h("div", { class: "inline-banner inline-banner--warn", attrs: { role: "alert" } },
            h("span", { html: icon("info", 18) }),
            h("p", { text: ctx.t("onboarding.publish.blocked") }),
          ),
        ]
      : []),
    h("div", { class: "onboarding__publish-actions" },
      button({
        label: ctx.t("onboarding.publish.publish"),
        variant: "primary",
        icon: "checkCircle",
        disabled: enabled.length === 0,
        onClick: () => {
          void ctx.data
            .setCreatorStatus(creator.id, "published")
            .then((updated) => {
              state.creator = updated;
              toast(ctx.t("onboarding.publish.published"));
              rerender();
            })
            .catch((error: unknown) => {
              wrap.prepend(
                h("div", { class: "inline-banner inline-banner--error", attrs: { role: "alert" } },
                  h("p", { text: messageForError(ctx, error) }),
                ),
              );
            });
        },
      }),
      linkButton({ href: pageUrl, label: ctx.t("onboarding.publish.openPage"), variant: "ghost", size: "sm", icon: "external", external: true }),
    ),
  );
  return wrap;

  function posterButton(): HTMLElement {
    return button({
      label: ctx.t("share.poster"),
      variant: "secondary",
      size: "sm",
      icon: "download",
      onClick: () => {
        const method = enabled.find((entry) => entry.qr_payload) ?? enabled[0] ?? null;
        const poster = generatePosterSvg({
          creator,
          method,
          url: pageUrl,
          lang: ctx.lang as Lang,
          demo: creator.is_demo === true,
        });
        if (!poster.ok || !poster.svg) {
          toast(ctx.t("creator.qr.encodeError"));
          return;
        }
        const blob = new Blob([poster.svg], { type: "image/svg+xml;charset=utf-8" });
        const objectUrl = URL.createObjectURL(blob);
        const link = h("a", { attrs: { href: objectUrl, download: poster.fileName } });
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
        toast(ctx.t("poster.downloaded"));
      },
    });
  }
}
