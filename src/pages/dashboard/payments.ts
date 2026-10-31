/**
 * `/dashboard/payments` — add / edit / enable / disable / reorder / delete the
 * creator's own payment methods. All writes go through the existing data layer
 * (`savePaymentMethod`, `deletePaymentMethod`, `reorderPaymentMethods`), so the
 * Supabase RPC reorder path and local store stay exactly as they were.
 */
import { h, toast } from "../../lib/dom.ts";
import { formatDate, maskNumber } from "../../lib/format.ts";
import { messageForError } from "../../lib/messages.ts";
import type { AppContext } from "../../lib/app.ts";
import type { PaymentMethod } from "../../lib/types.ts";
import {
  appBanner,
  appButton,
  appDialog,
  appEmpty,
  appIconButton,
  appSectionHead,
  appStamp,
  appSwitch,
} from "../../components/app/ui.ts";
import { renderMethodEditor } from "../../components/app/method-editor.ts";
import { appCopyFor } from "../copy.app.ts";
import { appShell, loadMethods, loadOwnData, noPageContent } from "./common.ts";

const MAX_METHODS = 8;

function qrStamp(ctx: AppContext, method: PaymentMethod): HTMLElement {
  const copy = appCopyFor(ctx.lang);
  if (method.qr_status === "verified") return appStamp({ label: copy.stampQrVerified, tone: "confirmed", icon: "checkbox-circle-line" });
  if (method.qr_status === "unverified") return appStamp({ label: copy.stampQrUnverified, tone: "self", icon: "information-line" });
  if (method.qr_status === "image_only") return appStamp({ label: copy.stampImageOnly, tone: "outline", icon: "image-line" });
  return appStamp({ label: copy.stampManual, tone: "outline", icon: "hashtag" });
}

export async function renderDashboardPayments(ctx: AppContext): Promise<HTMLElement> {
  const copy = appCopyFor(ctx.lang);
  const own = await loadOwnData(ctx);
  if (!own.creator) return noPageContent(ctx, copy);

  const creator = own.creator;
  const methods = await loadMethods(ctx, creator);
  let editor: { mode: "add" | "edit"; method: PaymentMethod | null } | null = null;
  const noticeSlot = h("div", { class: "app-banner-slot" });
  const contentRoot = h("div", { class: "app-payments" });

  const ensurePublishable = async (remainingEnabled: number): Promise<void> => {
    if (remainingEnabled === 0 && creator.status === "published") {
      await ctx.data.setCreatorStatus(creator.id, "draft").catch(() => undefined);
      // Toast survives the route refresh; the persistent banner is rendered below
      // whenever the page is draft with no enabled method.
      toast(copy.needMethod);
    }
  };

  const saveOrder = (ids: string[]) => {
    void ctx.data
      .reorderPaymentMethods(ids)
      .then(() => ctx.refresh())
      .catch((error: unknown) => {
        noticeSlot.replaceChildren(appBanner({ tone: "error", body: messageForError(ctx, error) }));
      });
  };

  const move = (index: number, delta: number) => {
    const next = methods.slice();
    const target = next[index + delta];
    const current = next[index];
    if (!target || !current) return;
    next[index + delta] = current;
    next[index] = target;
    saveOrder(next.map((method) => method.id));
  };

  const toggleEnabled = (method: PaymentMethod) => {
    const enabling = !method.enabled;
    void ctx.data
      .savePaymentMethod({
        ...method,
        id: method.id,
        creator_id: creator.id,
        enabled: enabling,
      })
      .then(async () => {
        const enabledAfter = methods.filter((entry) => entry.enabled && entry.id !== method.id).length + (enabling ? 1 : 0);
        await ensurePublishable(enabledAfter);
        ctx.refresh();
      })
      .catch((error: unknown) => {
        noticeSlot.replaceChildren(appBanner({ tone: "error", body: messageForError(ctx, error) }));
      });
  };

  const remove = (method: PaymentMethod) => {
    void appDialog({
      title: copy.removeMethodTitle,
      description: copy.removeMethodBody,
      destructive: true,
      actions: [
        { id: "cancel", label: copy.cancel, variant: "secondary" },
        { id: "delete", label: copy.remove, variant: "danger" },
      ],
    }).then((action) => {
      if (action !== "delete") return;
      void ctx.data
        .deletePaymentMethod(method.id)
        .then(async () => {
          const enabledAfter = methods.filter((entry) => entry.enabled && entry.id !== method.id).length;
          await ensurePublishable(enabledAfter);
          ctx.refresh();
        })
        .catch((error: unknown) => {
          noticeSlot.replaceChildren(appBanner({ tone: "error", body: messageForError(ctx, error) }));
        });
    });
  };

  let focusEditorAfterMount = false;
  const renderEditor = (): HTMLElement | null => {
    if (!editor) return null;
    const handle = renderMethodEditor(ctx, {
      copy,
      existing: editor.method,
      canCancel: true,
      onCancel: () => {
        editor = null;
        render();
      },
      onSave: async (input) => {
        await ctx.data.savePaymentMethod({
          ...input,
          creator_id: creator.id,
          sort_order: editor?.method?.sort_order ?? methods.length,
          enabled: editor?.method?.enabled ?? true,
        });
        editor = null;
        ctx.refresh();
      },
    });
    focusEditorAfterMount = true;
    return handle.element;
  };

  const render = () => {
    contentRoot.replaceChildren();
    const editorElement = renderEditor();
    const rows = methods.map((method, index) => {
      const detail = method.account_number
        ? maskNumber(method.account_number)
        : method.qr_decoded?.account_mask ?? method.label;
      return h(
        "li",
        { class: "app-method" },
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
            qrStamp(ctx, method),
            method.enabled ? null : appStamp({ label: copy.stampDisabled, tone: "outline" }),
          ),
          h("p", { class: "app-method__detail", text: detail, attrs: { dir: "ltr" } }),
          h("p", { class: "app-method__updated", text: formatDate(ctx.lang, method.updated_at) }),
        ),
        h(
          "div",
          { class: "app-method__controls" },
          appSwitch({
            checked: method.enabled,
            label: method.enabled ? copy.stampEnabled : copy.stampDisabled,
            onChange: () => toggleEnabled(method),
          }),
          appIconButton({ label: copy.moveUp, icon: "arrow-up-line", disabled: index === 0, onClick: () => move(index, -1) }),
          appIconButton({
            label: copy.moveDown,
            icon: "arrow-down-line",
            disabled: index === methods.length - 1,
            onClick: () => move(index, 1),
          }),
          appButton({
            label: copy.edit,
            variant: "secondary",
            size: "sm",
            icon: "edit-line",
            onClick: () => {
              editor = { mode: "edit", method };
              render();
            },
          }),
          appIconButton({ label: copy.remove, icon: "delete-bin-line", onClick: () => remove(method) }),
        ),
      );
    });

    contentRoot.append(
      noticeSlot,
      ...(creator.status !== "published" && methods.filter((method) => method.enabled).length === 0
        ? [appBanner({ tone: "warn", body: copy.needMethod, role: "status" })]
        : []),
      appSectionHead({
        title: copy.methodsTitle,
        description: copy.methodsSub,
        actions: [
          appButton({
            label: copy.addMethod,
            variant: "primary",
            size: "sm",
            icon: "add-line",
            disabled: methods.length >= MAX_METHODS || editor !== null,
            onClick: () => {
              editor = { mode: "add", method: null };
              render();
            },
          }),
        ],
      }),
      h("p", { class: "app-field__helper", text: `${copy.maxMethods} · ${methods.filter((method) => method.enabled).length}/${MAX_METHODS}` }),
      ...(editorElement ? [editorElement] : []),
      methods.length === 0
        ? appEmpty({
            icon: "bank-card-line",
            title: copy.methodsEmpty,
            action: appButton({
              label: copy.addMethod,
              variant: "primary",
              size: "sm",
              icon: "add-line",
              onClick: () => {
                editor = { mode: "add", method: null };
                render();
              },
            }),
          })
        : h("ul", { class: "app-methods" }, ...rows),
      h("p", { class: "app-note", text: copy.lastMethodOff }),
      h("p", { class: "app-note app-note--foot", text: copy.footerNote }),
    );
  };

  render();
  if (focusEditorAfterMount) {
    const heading = contentRoot.querySelector<HTMLElement>("#method-editor-title");
    heading?.focus();
  }
  return appShell(ctx, { active: "payments", creator, copy, content: contentRoot });
}
