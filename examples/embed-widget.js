/**
 * Chanasta embed widget — optional, tiny, no dependencies, no tracking.
 * ----------------------------------------------------------------------
 * Adds an accessible modal that loads the iframe-friendly creator card at
 *   <origin>/embed/@<slug>
 * for any element carrying `data-chanasta-widget`.
 *
 * Usage — script form (origin defaults to the current page origin):
 *   <script src="embed-widget.js" data-origin="https://chanasta.example" defer></script>
 *   <button type="button" data-chanasta-widget data-slug="demo-teacher">
 *     Support @demo-teacher
 *   </button>
 *
 * Or call it directly:
 *   window.ChanastaEmbed.open("demo-teacher", "https://chanasta.example");
 *
 * The widget is intentionally dumb: it only opens a same-embed URL. Chanasta
 * never processes payments; money moves directly between supporter and creator
 * inside the provider's own app, and claims are self-reported messages.
 * All examples use the synthetic demo creators only.
 */
(function () {
  "use strict";

  var ALLOWED_SLUGS = ["demo-teacher", "demo-artist", "demo-writer"];
  var STYLE_ID = "chanasta-embed-widget-style";
  var current = null;

  /** Find the origin configured on the script tag that loaded this file. */
  function scriptOrigin() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("embed-widget.js") !== -1) {
        return scripts[i].getAttribute("data-origin") || "";
      }
    }
    return "";
  }

  function resolveOrigin(element) {
    var fromElement = element && element.getAttribute ? element.getAttribute("data-origin") : "";
    var origin = fromElement || scriptOrigin() || window.location.origin;
    return String(origin).replace(/\/+$/, "");
  }

  function resolveSlug(element) {
    var slug = (element && element.getAttribute ? element.getAttribute("data-slug") : "") || "";
    slug = String(slug).replace(/^@/, "").trim();
    // Demo data only, exactly like the rest of this repo.
    return ALLOWED_SLUGS.indexOf(slug) === -1 ? "demo-teacher" : slug;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    if (!document.head) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".chanasta-widget-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(30,22,14,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}",
      ".chanasta-widget-dialog{position:relative;display:flex;flex-direction:column;width:100%;max-width:460px;max-height:92vh;background:#fffaf2;color:#2c2419;border:1px solid #e6dccd;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.28);overflow:hidden}",
      "@media (prefers-color-scheme:dark){.chanasta-widget-dialog{background:#1f1a15;color:#f6efe6;border-color:#3a3128}}",
      ".chanasta-widget-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px 10px 16px;border-bottom:1px solid #e6dccd}",
      "@media (prefers-color-scheme:dark){.chanasta-widget-bar{border-color:#3a3128}}",
      ".chanasta-widget-label{font:600 13px/1.3 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#6f6252;margin:0}",
      "@media (prefers-color-scheme:dark){.chanasta-widget-label{color:#c4b7a7}}",
      ".chanasta-widget-close{appearance:none;border:1px solid #e6dccd;background:transparent;color:inherit;font:600 20px/1 system-ui,sans-serif;width:44px;height:44px;border-radius:999px;cursor:pointer;display:flex;align-items:center;justify-content:center}",
      ".chanasta-widget-close:hover{background:rgba(163,77,22,.08)}",
      ".chanasta-widget-close:focus-visible{outline:3px solid #1f5fbf;outline-offset:2px}",
      ".chanasta-widget-frame{display:block;width:100%;height:min(78vh,640px);border:0;background:transparent}",
      ".chanasta-widget-foot{padding:8px 16px 12px;font:400 11px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#6f6252;margin:0}",
      "@media (prefers-color-scheme:dark){.chanasta-widget-foot{color:#c4b7a7}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function close() {
    if (!current) return;
    var overlay = current.overlay;
    var lastFocused = current.lastFocused;
    var bodyOverflow = current.bodyOverflow;
    document.removeEventListener("keydown", current.onKeydown, true);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.body.style.overflow = bodyOverflow;
    current = null;
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function onKeydown(event) {
    if (!current) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    // Minimal focus containment: close button + iframe are the only focusables.
    var focusables = current.overlay.querySelectorAll("button, iframe, [tabindex]");
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open(slug, origin, trigger) {
    if (current) return;

    var safeSlug = resolveSlug({ getAttribute: function () { return slug; } });
    var safeOrigin = resolveOrigin({ getAttribute: function () { return origin; } });
    var embedUrl = safeOrigin + "/embed/@" + encodeURIComponent(safeSlug);

    injectStyles();

    var overlay = document.createElement("div");
    overlay.className = "chanasta-widget-overlay";

    var dialog = document.createElement("div");
    dialog.className = "chanasta-widget-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Chanasta support page — @" + safeSlug + " (synthetic demo)");

    var bar = document.createElement("div");
    bar.className = "chanasta-widget-bar";

    var label = document.createElement("p");
    label.className = "chanasta-widget-label";
    label.textContent = "চানাস্তা · Chanasta";

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "chanasta-widget-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.textContent = "\u00D7";

    var iframe = document.createElement("iframe");
    iframe.className = "chanasta-widget-frame";
    iframe.src = embedUrl;
    iframe.title = "Chanasta support page — @" + safeSlug + " (synthetic demo)";
    iframe.loading = "lazy";
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.setAttribute("allow", "clipboard-write");

    var foot = document.createElement("p");
    foot.className = "chanasta-widget-foot";
    foot.textContent =
      "Chanasta never processes payments or holds money. Send directly in your own app; claims are self-reported.";

    bar.appendChild(label);
    bar.appendChild(closeButton);
    dialog.appendChild(bar);
    dialog.appendChild(iframe);
    dialog.appendChild(foot);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    current = {
      overlay: overlay,
      lastFocused: trigger || document.activeElement,
      bodyOverflow: document.body.style.overflow,
      onKeydown: onKeydown
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeydown, true);

    closeButton.addEventListener("click", close);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) close();
    });
    closeButton.focus();
  }

  function init() {
    var triggers = document.querySelectorAll("[data-chanasta-widget]");
    for (var i = 0; i < triggers.length; i += 1) {
      (function (element) {
        element.addEventListener("click", function (event) {
          // Anchors with an href would jump; the widget always opens the modal.
          if (element.tagName === "A") event.preventDefault();
          open(resolveSlug(element), resolveOrigin(element), element);
        });
      })(triggers[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.ChanastaEmbed = {
    open: function (slug, origin) {
      open(slug, origin, document.activeElement);
    },
    close: close
  };
})();
