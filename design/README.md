# Chanasta design system — how to use this folder

`design/tokens.css` is the single source of truth for every colour, size, radius and motion value
in Chanasta. `docs/ui-ux.md` is the implementation-ready handoff that explains the tokens, the
components, every screen and every state. If the docs and the CSS disagree, **the CSS wins** and the
doc is fixed in the same PR.

## Drop-in usage

```html
<!doctype html>
<html lang="bn">          <!-- Bangla is the default; the toggle switches to lang="en" -->
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

    <!-- Two font files only (~126 KB): Figtree (Latin + tabular figures) and
         Noto Sans Bengali (Bangla + ৳ + Bengali digits). display=swap. -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Figtree:wght@400..700&family=Noto+Sans+Bengali:wght@400..700&display=swap"
    />

    <!-- Tokens first; app styles after. -->
    <link rel="stylesheet" href="/design/tokens.css" />
  </head>
  <body>
    <a class="skip-link" href="#main">মূল অংশে যান / Skip to content</a>
    <!-- ... -->
  </body>
</html>
```

## Integration with the app (Phase 3)

[`docs/architecture.md`](../docs/architecture.md) is the binding implementation contract. This
folder is owned by UI/UX and is read-only for the web workstream; the app consumes it via
`src/styles.css` importing `../design/tokens.css` (or a `<link>` tag in `index.html`), and the font
links above live in `index.html` exactly once. If implementation needs a token that is missing,
message the Lead/design instead of adding a raw value in `src/styles.css`.

## Rules that keep the system honest

- **No raw values in app CSS.** Use component tokens (`--button-primary-bg`) first, semantic aliases
  (`--leading-body`, `--leading-heading`) second, core tokens (`--ink`, `--accent`) only when a
  component token does not exist.
- **Theme is a swap, not a stylesheet.** Set `data-theme="dark"` on `<html>` for an explicit choice;
  with no attribute the OS preference (`prefers-color-scheme`) applies; never invert the QR.
- **Bangla first.** `lang="bn"` is the default and switches leading via `:lang()`; never apply
  `letter-spacing`, `text-transform` or justified text to Bangla.
- **Amounts** use `--font-num`, `--amount-feature-settings` (`tnum` + `lnum`), `৳` + Latin digits, and
  `dir="ltr"` + `unicode-bidi: isolate` on the amount span.
- **44 px targets, visible focus.** Use `--tap-min`, `--focus-ring`, `:focus-visible`; never remove
  outlines without a replacement.
- **Motion is calm and optional.** Respect `prefers-reduced-motion` (the tokens collapse durations);
  no animation is ever required to understand content.
- **Money is never on our path.** No token, component or state may imply that Chanasta processes,
  holds, confirms, refunds or guarantees a payment. Honesty surfaces (disclosure strip, decode-status
  badges, self-reported/creator-confirmed badges, footer trust block, report link) are mandatory on
  the surfaces listed in `docs/ui-ux.md` §5–§6.

## File map

| File | What it is |
|---|---|
| [`design/tokens.css`](./tokens.css) | Drop-in tokens: light + dark, fonts, type scale, spacing, radii, shadows, motion, z-index, layout, component tokens, reduced-motion and forced-colours overrides. No imports, no build step, no dependencies. |
| [`docs/ui-ux.md`](../docs/ui-ux.md) | Design direction, token tables, component inventory with all states, page-by-page wireframes and states, supporter flow, trust & safety UX, accessibility (measured contrast), performance/3G budgets, A4 print spec, content map + new strings, hand-off checklist. |
| [`docs/brand-copy.md`](../docs/brand-copy.md) | The copy source of truth (Bangla first, English sibling). UI text comes from there or from the new-string bank in `docs/ui-ux.md` §9.3 — nowhere else. |
| [`docs/decisions.md`](../docs/decisions.md) | Binding Lead decisions (no goal UI, no explore, Bangla default, self-reported claims, demo mode). |

## Quick verification before shipping a component

1. All states in `docs/ui-ux.md` §3.0 implemented (hover, focus-visible, active, disabled, loading,
   error, dark, reduced motion).
2. 360 px width, 200% zoom and dark theme checked.
3. Contrast pair used is in the measured table (`docs/ui-ux.md` §7.2) — do not eyeball it.
4. No banned words (donate/দান, tip/টিপ, guaranteed, verified payment, fund, campaign, wallet,
   balance, refund, payout, secure, instant, official, partner).
5. No real personal data, account numbers or QR payloads — synthetic demo data only
   (`@demo-teacher`, `@demo-artist`, `@demo-writer`, account `01000000000`, `DEMO STORE`).
