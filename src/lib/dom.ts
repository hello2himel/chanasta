/**
 * Tiny DOM toolkit: element helper, clipboard, toasts, dialogs, meta, a11y.
 * No framework, no virtual DOM — everything is real DOM so the pages stay tiny
 * and the built bundle is predictable.
 */
export type Child = Node | string | number | null | undefined | false;

export interface Props {
  class?: string | string[];
  id?: string;
  text?: string;
  /** Trusted markup only (inline SVG icons / engine-rendered QR). */
  html?: string;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  dataset?: Record<string, string | undefined>;
  style?: string;
  on?: Partial<Record<keyof GlobalEventHandlersEventMap, (event: Event) => void>>;
}

function appendChildren(element: HTMLElement, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) {
      appendChildren(element, child as Child[]);
      continue;
    }
    if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(String(child)));
      continue;
    }
    element.appendChild(child);
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (props) {
    if (props.class) {
      element.className = Array.isArray(props.class) ? props.class.filter(Boolean).join(" ") : props.class;
    }
    if (props.id) element.id = props.id;
    if (props.text !== undefined) element.textContent = props.text;
    if (props.html !== undefined) element.innerHTML = props.html;
    if (props.style) element.setAttribute("style", props.style);
    if (props.attrs) {
      for (const [name, value] of Object.entries(props.attrs)) {
        if (value === null || value === undefined || value === false) continue;
        element.setAttribute(name, value === true ? "" : String(value));
      }
    }
    if (props.dataset) {
      for (const [name, value] of Object.entries(props.dataset)) {
        if (value !== undefined) element.dataset[name] = value;
      }
    }
    if (props.on) {
      for (const [event, handler] of Object.entries(props.on)) {
        if (handler) element.addEventListener(event, handler);
      }
    }
  }
  appendChildren(element, children);
  return element;
}

export function frag(...children: Child[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === "string" || typeof child === "number") {
      fragment.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      fragment.appendChild(child);
    }
  }
  return fragment;
}

export function clear(element: Element): void {
  while (element.firstChild) element.removeChild(element.firstChild);
}

export function replaceChildren(element: Element, ...children: Child[]): void {
  clear(element);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }
}

export function mount(target: Element | null, child: Node | string): void {
  if (!target) return;
  clear(target);
  target.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Scroll an element into view, honouring reduced motion. */
export function scrollToElement(element: Element | null, offset = 0): void {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const top = window.scrollY + rect.top - offset;
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/** Move focus to an element (used after route changes / on the computed H1). */
export function focusElement(element: HTMLElement | null): void {
  if (!element) return;
  if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });
}

// ---- clipboard ------------------------------------------------------------

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea fallback */
  }
  try {
    const textarea = h("textarea", {
      attrs: { readonly: true, "aria-hidden": "true" },
      style: "position:fixed;top:-1000px;opacity:0",
    });
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

// ---- live regions, toasts -------------------------------------------------

let liveRegion: HTMLElement | null = null;

export function announce(message: string): void {
  if (!liveRegion) {
    liveRegion = h("div", { class: "sr-only", attrs: { role: "status", "aria-live": "polite" } });
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = "";
  // A microtask gap makes some screen readers announce repeated messages.
  window.setTimeout(() => {
    if (liveRegion) liveRegion.textContent = message;
  }, 30);
}

let toastHost: HTMLElement | null = null;
let currentToast: { element: HTMLElement; timer: number } | null = null;

export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export function toast(message: string, options: ToastOptions = {}): void {
  if (!toastHost) {
    toastHost = h("div", {
      class: "toast-host",
      attrs: { role: "status", "aria-live": "polite", "aria-atomic": "true" },
    });
    document.body.appendChild(toastHost);
  }
  if (currentToast) {
    window.clearTimeout(currentToast.timer);
    currentToast.element.remove();
    currentToast = null;
  }
  const duration = options.duration ?? (options.actionLabel ? 5000 : 3200);
  const action = options.actionLabel
    ? h("button", {
        class: "toast__action",
        attrs: { type: "button" },
        text: options.actionLabel,
        on: {
          click: () => {
            dismissToast();
            options.onAction?.();
          },
        },
      })
    : null;
  const element = h(
    "div",
    { class: "toast" },
    h("span", { class: "toast__text", text: message }),
    action,
  );
  toastHost.appendChild(element);
  announce(message);
  const timer = window.setTimeout(() => {
    element.remove();
    currentToast = null;
  }, duration);
  currentToast = { element, timer };
  element.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape") dismissToast();
  });
}

function dismissToast(): void {
  if (!currentToast) return;
  window.clearTimeout(currentToast.timer);
  currentToast.element.remove();
  currentToast = null;
}

// ---- dialogs --------------------------------------------------------------

export interface DialogAction {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export interface DialogOptions {
  title: string;
  description?: string;
  content?: Node | string;
  actions: DialogAction[];
  /** Focus the least destructive action first (default: true for destructive dialogs). */
  destructive?: boolean;
  onAction?: (id: string) => boolean | void;
}

/**
 * Native `<dialog>` with the platform focus trap. The returned promise resolves
 * with the chosen action id, or null when dismissed.
 */
export function openDialog(options: DialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const finishing = (value: string | null) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const dialog = h("dialog", { class: "dialog", attrs: { "aria-labelledby": "dialog-title" } });
    const title = h("h2", { class: "dialog__title", id: "dialog-title", text: options.title });
    const description =
      options.description !== undefined
        ? h("p", { class: "dialog__description", text: options.description })
        : null;
    const content = options.content
      ? h("div", { class: "dialog__content" }, typeof options.content === "string" ? h("p", { text: options.content }) : options.content)
      : null;

    const actions = h("div", { class: "dialog__actions" });
    const actionButtons: HTMLButtonElement[] = [];
    for (const action of options.actions) {
      const button = h("button", {
        class: ["btn", action.variant === "secondary" ? "btn--secondary" : action.variant === "danger" ? "btn--danger" : "btn--primary"],
        attrs: { type: "button", disabled: action.disabled ?? false },
        text: action.label,
        on: {
          click: () => {
            if (options.onAction && options.onAction(action.id) === false) return;
            finishing(action.id);
            dialog.close();
          },
        },
      });
      actionButtons.push(button);
      actions.appendChild(button);
    }

    dialog.append(title);
    if (description) dialog.appendChild(description);
    if (content) dialog.appendChild(content);
    dialog.appendChild(actions);

    dialog.addEventListener("close", () => {
      dialog.remove();
      finishing(null);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog && !options.destructive) dialog.close();
    });

    document.body.appendChild(dialog);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");

    const preferred =
      options.destructive
        ? actionButtons.find((button) => button.classList.contains("btn--secondary"))
        : actionButtons.find((button) => button.classList.contains("btn--primary"));
    (preferred ?? actionButtons[0])?.focus();
  });
}

// ---- document meta --------------------------------------------------------

export function setDocumentTitle(title: string): void {
  document.title = title;
}

export function setMetaDescription(description: string): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = h("meta", { attrs: { name: "description" } });
    document.head.appendChild(meta);
  }
  meta.content = description;
}

export function setNoIndex(noindex: boolean): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (noindex) {
    if (!meta) {
      meta = h("meta", { attrs: { name: "robots" } });
      document.head.appendChild(meta);
    }
    meta.content = "noindex";
  } else if (meta) {
    meta.remove();
  }
}

export function setCanonical(url: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = h("link", { attrs: { rel: "canonical" } });
    document.head.appendChild(link);
  }
  link.href = url;
}

// ---- files ----------------------------------------------------------------

export function downloadSvg(filename: string, svg: string): void {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = h("a", { attrs: { href: url, download: filename } });
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const escape = (cell: string) => `"${String(cell).replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = h("a", { attrs: { href: url, download: filename } });
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
