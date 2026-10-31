> **Superseded for visuals (2026-11-01):** the coffee-theme redesign in [`redesign.md`](./redesign.md) is now the visual source of truth. This document remains useful for its accessibility, contrast and component-state research.

# Chanasta — UI/UX design handoff

**Status:** Phase 2 · implementation-ready · every screen and state is specified to be built without further design decisions
**Owner:** `ui-ux` · **Last updated:** 2026-11-01
**Companion docs:** [blueprint.md](./blueprint.md) · [decisions.md](./decisions.md) · [brand-copy.md](./brand-copy.md) · [data-model.md](./data-model.md) · [compliance.md](./compliance.md) · [architecture.md](./architecture.md)
**Design system file:** [`design/tokens.css`](../design/tokens.css) — the single source of truth for every value in this document.

## Contents

0. [How to use this document](#0-how-to-use-this-document) · 1. [Design direction](#1-design-direction) · 2. [Design tokens](#2-design-tokens) · 3. [Component inventory](#3-component-inventory) · 4. [Page-by-page specifications](#4-page-by-page-specifications) · 5. [Supporter flow UX](#5-supporter-flow-ux) · 6. [Trust & safety UX](#6-trust--safety-ux) · 7. [Accessibility](#7-accessibility-specification) · 8. [Performance, responsive, print](#8-performance-responsive-and-print) · 9. [Content map + new strings](#9-content-placement-map-and-new-strings) · 10. [Hand-off checklist](#10-hand-off-checklist) · 11. [Open questions](#11-open-questions-for-the-lead-design-level-non-blocking)

> **Chanasta is a signpost, not a pipe.** Supporters send money inside their own bKash/Nagad/Rocket/bank app, straight to the creator. Chanasta displays the creator's own payment details and carries self-reported messages. No screen may ever imply that Chanasta processes, holds, routes, confirms, refunds or guarantees a payment.
>
> **Implementation contract:** [architecture.md](./architecture.md) is binding for Phase 3. Where it differs from this document (QR amount derivation, route fallbacks, storage keys, module layout), architecture wins for implementation and this document is corrected in the same change — the visual/UX rules in §1–§3 and the trust rules in §5–§6 still bind every screen.

---

## 0. How to use this document

### 0.1 Read order for implementers

1. [`design/tokens.css`](../design/tokens.css) — copy it in verbatim; add no values of your own.
2. §3 primitives (buttons, fields, chips, badges) — build these once and reuse.
3. §4.2 supporter page (`/@:slug`) — the product's front door; build it before the dashboard.
4. §4.1 landing + §4.3 thanks — smallest complete loop.
5. §4.4 onboarding → §4.6–4.9 dashboard → §4.10 embed → §4.11–4.12 legal/404.
6. Run the §10 checklist before calling anything done.

### 0.2 Conventions

- `var(--token)` in prose = a custom property from `tokens.css`. Every value in the tables below exists there.
- `BN` = Bangla (default, ships first). `EN` = English copy from the sibling deck in [brand-copy.md](./brand-copy.md).
- Copy keys like `§7.2 scan instruction` refer to the bank in `brand-copy.md` rather than duplicating it. Strings this document invents are listed once in §9.3 and **must be reviewed by a Bangla speaker** before shipping.
- ✅ required · ❌ forbidden · ⚠️ risk that must be tested.
- "Must not appear" lists in §4 are acceptance criteria, not suggestions.

### 0.3 What this document does not decide

| Area | Owner |
|---|---|
| Database columns, RPCs, visibility | [data-model.md](./data-model.md) |
| Legal text of Terms/Privacy | Lead + counsel ([compliance.md](./compliance.md)) |
| Brand voice and the full copy deck | [brand-copy.md](./brand-copy.md) — this doc references it by key |
| Provider terms, licence boundary | [compliance.md](./compliance.md) — never invent provider facts |
| Business model, launch gates | [blueprint.md](./blueprint.md), [decisions.md](./decisions.md) |

### 0.4 Out of UI scope (binding, from `decisions.md`)

| Not built | Why | What to render instead |
|---|---|---|
| Goal amount / progress bar | Lead decision 5 | nothing — amount ladder + claims only |
| Public `/explore` or discovery | Lead decision 15 | landing + the three demo pages |
| Identity "verified page" badge | Lead decision 3 | no badge; the `verified` flag has no UI |
| Admin / moderation UI | Lead decision 9 | SQL runbook; owners see only their own states |
| Donation / charity / campaign mechanics | Lead decision 4, compliance §7 | "সমর্থন / support" vocabulary only |
| Any payment confirmation or "paid" status | Product invariant | "স্ব-ঘোষিত / Self-reported" and "ক্রিয়েটর নিশ্চিত করেছেন / Creator confirmed" only |
| Email/push notifications | Lead decision 10 | dashboard new-claims badge |
| Provider logos | compliance §6 | plain provider names, nominatively |

---

## 1. Design direction

### 1.1 The direction in one paragraph

Chanasta should feel like the **tea stall at 4 p.m.** — warm paper, clay cups, a hand-written khata, steam curling off a glass — and then, without breaking that warmth, it tells you the truth about money: *this site never touches it.* The design is a **public noticeboard for a private gesture**: the creator's identity and their own QR are the hero, the honesty strip is part of the composition (not a legal afterthought), and there is never a checkout. Bangla leads the eye; English sits beside it as a sibling. Everything is one thumb away, loads on a ৳12,000 Android over 3G, and screenshots beautifully, because the page *is* the share card. No fintech blue, no card fields, no padlocks, no progress bars toward money.

**Mood keywords:** `cha-stall warmth` · `clay & cream` · `khata paper` · `steam line` · `honest by design` · `quiet confidence` · `one thumb` · `good screenshot` · `not a checkout`.

### 1.2 Principles that drive every decision

| # | Principle | How it shows up |
|---|---|---|
| 1 | **Honesty is the first visual layer** | Disclosure strip sits between the creator's story and the money information; decode-status badge on *every* method; footer strip on every creator page; claims always wear a badge. |
| 2 | **The QR is the hero, not a form** | The creator's own QR is a framed white "print on the shop wall", never overlaid, never inverted in dark mode, always accompanied by the decoded merchant name and a copyable number. |
| 3 | **One primary action per screen** | Supporter page → *চা খাওয়ান* (scroll-to-QR, never a payment action). Landing → *পেজ খুলুন*. Dashboard → the claim action in context. |
| 4 | **Bangla carries the brand, English rides alongside** | Bangla is the base language and the base typography; English is a visible toggle with equal polish, not a translation fallback. |
| 5 | **Warmth through material, not decoration** | Cream paper, clay accent, 16–24 px radii, 1 px warm rules, one hand-drawn steam motif (inline SVG, ≤1.2 KB). No gradients-as-screens, no stock photos, no raster avatars. |
| 6 | **The page must survive a bad phone** | Mobile-first at 360 px, 44 px targets, inline SVG QR, two font files, no tracking, no layout shift. |
| 7 | **A claim is a message, not a receipt** | Claim cards read like guestbook notes; badges are icon + text; the thanks page thanks you for the *message*, then repeats that the money is not verified. |

### 1.3 Visual signatures (the things that make it Chanasta)

- **Paper & clay palette.** Page background is warm paper (`--bg #FBF6EC`); cards are white; the accent is a fired-clay terracotta (`--accent #B5431F`), not fintech blue. Success is a deep jade; warning/self-reported is brass; danger is a dark lacquer red. Colour is *never* the only signal — every status has an icon and a text label.
- **The QR plate.** A white plate (`--qr-plate-bg #FFFFFF`) inside the card, 12 px padding, 12 px radius, 1 px warm line, `--shadow-sm`. The QR SVG already carries a 4-module quiet zone. Nothing is ever overlaid on the QR.
- **The disclosure strip.** `--accent-soft` background, 3 px clay left rule, info icon, `--text-sm`, Bangla first and English second in the same component. It reads as a helpful note from the tea-stall owner, not as a red legal wall.
- **Badges as stamp marks.** Pill badges, 24 px tall, 12 px icon + 12 px text, e.g. amber **স্ব-ঘোষিত / Self-reported**, jade **ক্রিয়েটর নিশ্চিত করেছেন / Creator confirmed**, neutral **শুধু ছবি, যাচাই করা যায়নি / Image only, not verified**.
- **The steam line.** One decorative inline SVG (a single curling line + small cup silhouette) used at 24–32 px next to the wordmark, in empty states, and on the A4 poster. `aria-hidden="true"`, opacity-only animation, hidden under `prefers-reduced-motion`.
- **Emoji identity.** The creator avatar is a single emoji on `--accent-soft`, 40/56/72/96 px circles. No raster images anywhere in the product.
- **No uppercase.** Bangla has no case; Latin UI never uses `text-transform: uppercase` either. Labels are 600 weight, not caps (brand rule, §4 tone).

### 1.4 What it must never look like

| ❌ Never | Because |
|---|---|
| A checkout: card fields, "Pay now", padlock icons, "secure checkout", progress steps labelled *payment* | We do not process payments. |
| A donation platform: campaign thermometer, "raised ৳X of ৳Y", hearts, "donate" | Charity/fundraising is excluded (compliance §7). |
| A wallet/fintech app: balance cards, transaction ledger, blue gradients, graphs of money | No ledger exists; nothing is "in" Chanasta. |
| A government form: dense grey fields, ALL-CAPS labels, tiny targets | Supporter pages are warm and thumb-sized. |
| Provider-branded: bKash/Nagad/Rocket logos, brand colours, "official/partner" | Trademark/partnership risk (compliance §6). |
| Penalising unverified pages with a scarlet badge | Absence of an identity badge is the honest default (brand-copy §7.4). |

### 1.5 Typography direction (rationale)

- **Bangla: Noto Sans Bengali** (variable 100–900, Google Fonts). Chosen over decorative Bangla display faces because it is the best-hinted, most complete Bengali UI face: full conjunct shaping (`akhn`, `blwf`, `cjct`, `rphf`, …), Bengali digits, and **৳ (U+09F3)**. One variable file covers every weight we need — important on 3G.
- **Latin: Figtree** (variable 300–900, Google Fonts) — the same family used in the deshiQR family of products, so Chanasta feels related without cloning it. Verified in this design pass: Figtree's latin file **contains the `tnum` OpenType feature**, which is what makes the amount ladder and dashboard numbers align. Figtree has **no Bengali glyphs and no ৳**, so those fall through to Noto Sans Bengali by design.
- **Why not Bricolage Grotesque?** It is the deshiQR display face, but a third family for one wordmark costs 20 KB+ on the page that must stay under budget. Chanasta's wordmark is drawn with Figtree 700 + `--tracking-display` and the steam line instead.
- **Numbers are Latin digits, always.** Supporters compare ৳50 against their bKash/Nagad app. Every amount uses `--font-num`, `--amount-feature-settings: "tnum" 1, "lnum" 1`, `font-variant-numeric: tabular-nums lining-nums`.
- **Bangla needs more leading.** Body Bangla uses `--leading-body-bn: 1.8`; Latin uses 1.55. The token layer switches leading by `:lang()` so components do not have to branch.

---

## 2. Design tokens

`design/tokens.css` has three layers. Use them in this order of preference:

1. **Component tokens** (`--button-*`, `--chip-*`, `--field-*`, …) inside components.
2. **Language-aware aliases** (`--leading-body`, `--leading-heading`) instead of raw en/bn values.
3. **Core tokens** (`--ink`, `--bg`, `--accent`, …) only when a component token genuinely does not exist. Never write a raw hex value in app CSS.

> **Rule:** if this document and `tokens.css` disagree, `tokens.css` wins and the doc gets fixed in the same PR.

### 2.1 Colour

The palette is warm paper + fired clay. Dark mode is warm charcoal (never `#000`). The **QR plate is always white with near-black modules**, in both themes — a QR that does not scan is not a design.

#### 2.1.1 Light (`:root`)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#fbf6ec` | Page background (warm paper) |
| `--surface` | `#ffffff` | Cards, panels, fields, dialogs |
| `--raised` | `#f3e9d8` | Secondary buttons, copy fields, skeletons, quiet badges |
| `--ink` | `#241e17` | Primary text |
| `--muted` | `#6b5f4f` | Secondary text, meta, placeholders |
| `--line` | `#e3d5bf` | Decorative hairlines, card borders |
| `--line-strong` | `#9b8a6f` | Interactive borders (inputs, secondary buttons) — 3:1 |
| `--accent` | `#b5431f` | Primary button, selected chip border, active step |
| `--accent-hover` | `#9e3817` | Primary button hover |
| `--accent-active` | `#8a2f12` | Primary button pressed |
| `--accent-soft` | `#f8e6dc` | Disclosure strip, selected chip fill, avatar fill |
| `--accent-ink` | `#8e3315` | Links and text on `--accent-soft` |
| `--on-accent` | `#ffffff` | Text on `--accent` |
| `--success` | `#1e6b4c` | Creator-confirmed badge, "verified QR" badge, success text |
| `--success-soft` | `#ddefe5` | Verified/confirmed badge fill |
| `--warn` | `#7a4b00` | Self-reported badge, demo badge, caution text |
| `--warn-soft` | `#fbedd1` | Self-reported/demo badge fill |
| `--danger` | `#a51c2c` | Error text, destructive text |
| `--danger-strong` | `#a51c2c` | Solid danger button background |
| `--danger-hover` | `#8c1625` | Danger hover |
| `--danger-soft` | `#fbe3e5` | Error surfaces, rejected/hidden badge fill |
| `--focus` | `#0b5f73` | Focus ring (2 px, 2 px offset) |
| `--qr-fg` | `#0b0b0b` | QR modules (never themed) |
| `--qr-bg` | `#ffffff` | QR plate (never themed) |
| `--overlay` | `rgba(36,30,23,.55)` | Dialog backdrop |
| `--selection-bg` / `--selection-ink` | `#f8e6dc` / `#241e17` | Text selection |
| `--badge-neutral-ink` | `#5f5344` | Image-only / manual / hidden badges on `--raised` |

#### 2.1.2 Dark (`[data-theme="dark"]`, and OS preference when not pinned)

| Token | Value | Notes |
|---|---|---|
| `--bg` | `#12100d` | Warm charcoal, not black |
| `--surface` | `#1d1813` | Cards |
| `--raised` | `#29221b` | Raised fills |
| `--ink` | `#f7efe3` | Warm off-white |
| `--muted` | `#c0b2a0` | |
| `--line` | `#453b31` | |
| `--line-strong` | `#7b6e5c` | 3.55:1 against surface — interactive borders stay visible |
| `--accent` | `#f0a46b` | Amber; buttons use **dark text** on it (`--on-accent #1a1009`) |
| `--accent-hover` / `--accent-active` | `#f7b87e` / `#ffc79a` | Hover/active go *lighter* in dark |
| `--accent-soft` | `#3b2a1e` | |
| `--accent-ink` | `#f6b98c` | Links |
| `--on-accent` | `#1a1009` | Text on amber |
| `--success` / `--success-soft` | `#7cd6a8` / `#16301f` | |
| `--warn` / `--warn-soft` | `#f2c879` / `#33260f` | |
| `--danger` / `--danger-soft` | `#ff9aa2` / `#3a1a1e` | |
| `--danger-strong` / `--danger-hover` | `#c9404c` / `#b33540` | Solid danger button; white label (4.86:1 — tightest text pair in the system) |
| `--focus` | `#8fd8e8` | |
| `--overlay` | `rgba(0,0,0,.65)` | |
| `--qr-fg` / `--qr-bg` | `#0b0b0b` / `#ffffff` | **Unchanged** — never invert the QR |

**Status → colour mapping (both themes).** Colour is always paired with an icon and a text label.

| Meaning | Fill / text | Icon |
|---|---|---|
| Verified data (QR decode, creator-confirmed claim) | `--success-soft` / `--success` | ✓ in circle (check) |
| Self-reported / caution / demo / unverified decode | `--warn-soft` / `--warn` | ⓘ or outlined dot |
| Neutral / image-only / manual / hidden | `--raised` / `--badge-neutral-ink` | dot or image glyph |
| Error / rejected | `--danger-soft` / `--danger` | ⚠ triangle (12 px) |
| Selected amount chip | `--accent-soft` + 2 px `--accent` border / `--accent-ink` | check mark before the amount |

### 2.2 Typography

#### 2.2.1 Families, loading and fallbacks

| Token | Stack | Use |
|---|---|---|
| `--font-sans` | `"Figtree", "Noto Sans Bengali", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | Everything by default. Latin resolves to Figtree; Bengali + ৳ fall through to Noto Sans Bengali. |
| `--font-bn` / `--font-en` | `var(--font-sans)` | Semantic aliases for locale-specific components; do not re-order the stack. |
| `--font-num` | `"Figtree", "Noto Sans Bengali", …` | Amounts, account numbers, counts, dates |
| `--font-display` | `"Figtree", "Noto Sans Bengali", …` | Latin wordmark/hero only (same families, display tracking) |
| `--font-mono` | `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace` | Embed snippet, TxID display |
| `--font-emoji` | `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif` | Emoji avatars only |

**Google Fonts** (load in `<head>`; `display=swap`; preconnect first):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400..700&family=Noto+Sans+Bengali:wght@400..700&display=swap">
```

| File (woff2, Google unicode-range subset) | Size | Cached |
|---|---|---|
| Figtree latin variable 400–700 | **20.2 KB** | 1 year, immutable |
| Noto Sans Bengali bengali variable 400–700 (includes ৳ + Bengali digits) | **107.7 KB** | 1 year, immutable |
| **Total font transfer** | **≈ 128 KB** | Browser caches across routes |
| Noto Sans Bengali *latin* subset | 0 KB in practice | Never requested: Figtree wins every Latin codepoint in the shared stack |
| Fallback before swap | system-ui / platform Bangla | Text is readable at first paint; `swap` prevents invisible text |

**Measured metrics used to pick leading** (inspected with fontTools against the exact Google woff2 files):

| Face | unitsPerEm | ascent | descent | default line-height | Features verified |
|---|---|---|---|---|---|
| Noto Sans Bengali (variable) | 1000 | 917 | −408 | 1.325 | Bengali shaping: `akhn blwf cjct rphf pres psts haln`…; has `৳` U+09F3, ০–৯, ₹ |
| Figtree (variable) | 1000 | 950 | −250 | 1.2 | `tnum`, `pnum`, `kern`, `frac`, `numr`, `dnom`; no ৳, no Bengali |

**Rule:** Bangla needs extra leading because of matras and stacked conjuncts — `--leading-body-bn: 1.8` (≈ +0.47 em over the font default). Never reduce it below 1.65. Nothing in the UI uses `letter-spacing` on Bangla text (it disrupts shaping); `--tracking-*` applies to Latin runs and numerals only.

#### 2.2.2 Type scale

| Token | Size (rem / px) | Leading EN / BN | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `--text-2xs` | .6875 / 11 | 1.3 / 1.45 | 500 | .01em | dense dashboard meta only (never body) |
| `--text-xs` | .75 / 12 | 1.3 / 1.45 | 500–600 | .01em | badges, timestamps, footer |
| `--text-sm` | .875 / 14 | 1.55 / 1.8 | 400–600 | 0 | helper text, disclosure strip, table cells |
| `--text-base` | 1 / 16 | 1.55 / 1.8 | 400 | 0 | body, inputs, buttons |
| `--text-lg` | 1.125 / 18 | 1.45 / 1.65 | 500 | 0 | section lead |
| `--text-xl` | 1.25 / 20 | 1.35 / 1.5 | 600 | 0 | card titles, claim amount |
| `--text-2xl` | 1.5 / 24 | 1.3 / 1.45 | 600 | −.01em | section headings |
| `--text-3xl` | 1.875 / 30 | 1.25 / 1.4 | 700 | −.01em | desktop page heading |
| `--text-4xl` | 2.25 / 36 | 1.15 / 1.35 | 700 | −.02em | hero (Latin-leaning surfaces) |
| `--text-5xl` | 3 / 48 | 1.1 / 1.3 | 700 | −.02em | landing hero English only |
| `--text-h1` | clamp(27.2 → 40 px) | role leading | 700 | −.01em | page H1 (Bangla-safe fluid size) |
| `--text-h2` | clamp(22 → 30 px) | role leading | 600 | 0 | section H2 |
| `--text-h3` | 18 px | role leading | 600 | 0 | card/step H3 |
| `--text-display` | clamp(32 → 52 px) | 1.15 / 1.35 | 700 | −.02em | landing display (use Bangla hero at ≤40 px) |

**Language-aware aliases** (what components actually reference): `--leading-heading`, `--leading-body`, `--leading-ui`, `--leading-badge`. They switch between the EN and BN pairs via `:lang(bn)` / `:lang(en)` in `tokens.css`. Set `<html lang="bn">` as the default; the language toggle flips it to `en`.

#### 2.2.3 Amount typography (numbers are a trust surface)

| Token | Value |
|---|---|
| `--amount-font` | `var(--font-num)` |
| `--amount-weight` | 700 |
| `--amount-tracking` | −.01em |
| `--amount-feature-settings` | `"tnum" 1, "lnum" 1` |
| `--amount-size-xl` | 2.25 rem (36 px) — thanks-page claim amount, dialog totals |
| `--amount-size-lg` | 1.5 rem (24 px) — public claim card amount |
| `--amount-size-md` | 1.125 rem (18 px) — dashboard list amounts, claim form value |
| `--amount-size-sm` | .9375 rem (15 px) — inline amounts in table cells and helpers |
| `--amount-taka-gap` | .02em — optional space after ৳ if the cross-font join looks tight |

Rules:

- Amount strings are `৳` + Latin digits + optional `.50`: `৳20`, `৳1,250.50`, `৳100,000`. Format through the engine's `formatTaka()`; never hand-format.
- Wrap every amount span: `dir="ltr"` + `unicode-bidi: isolate` so `৳50` cannot reorder inside an English sentence.
- The ৳ glyph comes from Noto Sans Bengali (Figtree lacks it). Test ৳20, ৳100, ৳1,000 and ৳100,000 in both themes; if the symbol's weight looks heavier than the digits, set the symbol in a `<span class="amount__taka">` with `font-weight: 500` and `margin-inline-end: var(--amount-taka-gap)` — this is the only sanctioned exception to `--amount-weight`.
- Percentages/totals of claims are allowed only as *counts of messages*, never as money: "12টি স্ব-ঘোষিত বার্তা / 12 self-reported messages".

#### 2.2.4 Measured Bangla line lengths (real brand-copy strings, real font)

Measured with the Noto Sans Bengali variable file at 16 px / 14 px against a 328 px content width (360 px viewport − 2×16 px gutters). Use these to decide wrapping and to avoid fixed-height containers.

| String (brand-copy key) | chars | width @14 px | width @16 px | lines @328 px (@14 / @16) |
|---|---|---|---|---|
| Default H1 `ডেমো শিক্ষক-কে এক কাপ চা খাওয়ান` (§7.1; tagline replaces it) | 32 | 280 @18 px | 312 @20 px | 1 / 1 (@20 px) — 2 lines at 24 px, 2 lines at the 27 px mobile H1 |
| Sub-line §7.1 | 85 | 548 | 627 | 2 / 2 |
| Footer strip A §7.5 | 149 | 863 | 987 | 3 / 3 |
| Decode helper C §7.2 | 55 | 361 | 413 | 2 / 2 |
| Claim intro D §7.3 | 89 | 518 | 592 | 2 / 2 |
| Claim success §7.3 | 108 | 632 | 722 | 2 / 3 |
| Empty claim list §7.6 | 59 | 377 | 431 | 2 / 2 |
| QR unverified helper §7.2 | 57 | 359 | 410 | 2 / 2 |
| No methods §7.6 | 44 | 281 | 321 | 1 / 1 |

**Rules that follow from the measurements:** no fixed heights on Bangla text blocks; disclosure strip and footer allow 3 lines of Bangla at 360 px; the mobile H1 is capped at 27 px so a long display name wraps to 2–3 lines, not 5; buttons grow (min-height, not height) when Bangla wraps; chips stack amount over label so the metaphor never truncates.

#### 2.2.5 Wordmark

- Bangla contexts: **চানাস্তা** in `--font-sans` 700 (Noto Sans Bengali renders it), `--tracking-body`.
- Latin contexts: **Chanasta** in `--font-display` 700, `--tracking-display`.
- Optional 24–32 px steam-line SVG to the left, `aria-hidden`.
- Never "Cha Nasta", "চা-নাস্তা", never inside a provider-coloured shape, never with a padlock/coin/QR icon.

### 2.3 Spacing

| Token | Value | Typical use |
|---|---|---|
| `--space-0` | 0 | reset |
| `--space-1` | 4 px | icon-text gap inside badges |
| `--space-2` | 8 px | inline gaps, chip internal gaps |
| `--space-3` | 12 px | field padding-x, compact card padding |
| `--space-4` | 16 px | page gutter, card padding (mobile) |
| `--space-5` | 20 px | form group gap, button padding-x |
| `--space-6` | 24 px | card padding (desktop), dialog padding |
| `--space-7` | 32 px | section gaps (mobile) |
| `--space-8` | 40 px | section gaps (desktop) |
| `--space-9` | 48 px | major section separation |
| `--space-10` | 64 px | landing section rhythm (desktop) |
| `--space-11` | 80 px | hero top/bottom (desktop) |
| `--space-12` | 96 px | rare, landing only |

`--tap-min: 44px`, `--tap-comfortable: 48px`. Every interactive element must be ≥ 44×44 CSS px (icon-only buttons are exactly 44×44; text inputs 48 px tall).

### 2.4 Radii, borders, shadows

| Group | Tokens | Use |
|---|---|---|
| Radii | `--radius-xs 6` · `--radius-sm 10` · `--radius-md 12` · `--radius-lg 16` · `--radius-xl 20` · `--radius-2xl 24` · `--radius-pill 999` · `--radius-circle 50%` | badges/checkmarks/inputs=md; cards=lg; QR panel/dialog/embed=xl; hero panels=2xl; buttons/badges/toast=pill |
| Borders | `--hairline 1px`, `--border-width 1px`, `--border-width-strong 2px`, `--border`, `--border-strong` | warm rules; selected chip uses 2 px accent border |
| Shadows | `--shadow-xs`, `--shadow-sm` (QR plate, cards), `--shadow-md` (toast, dropdown), `--shadow-lg` (dialog) | light, warm-tinted; dark mode relies on borders more than shadow |
| Focus | `--focus-width 2px`, `--focus-offset 2px`, `--focus-ring` | apply with `:focus-visible` only; never remove outlines |

### 2.5 Motion

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 80 ms | colour/opacity changes on press |
| `--duration-fast` | 140 ms | hover in/out, chip select |
| `--duration-base` | 200 ms | accordion, inline errors, sheet |
| `--duration-slow` | 320 ms | dialog enter, toast enter |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | entrances |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | expand/collapse |
| `--ease-entrance` | `cubic-bezier(.22,1,.36,1)` | dialogs/sheets |
| `--motion-distance` | 8 px | translate on entrance (0 under reduced motion) |
| `--motion-scale-press` | 0.985 | button/chip press |

Motion rules: animate `transform`/`opacity` only; never animate the QR; never bounce or overshoot; no autoplay; under `prefers-reduced-motion: reduce` all durations collapse to 0.01 ms, `--motion-distance` becomes 0, skeleton shimmer stops, and scroll behaviour is instant. The toast is the only thing that auto-dismisses (3.2 s) and it does not steal focus.

### 2.6 Z-index

| Token | Value | Layer |
|---|---|---|
| `--z-below` | −1 | decorative underlays |
| `--z-base` | 0 | content |
| `--z-raised` | 1 | sticky in-card bits |
| `--z-sticky` | 20 | supporter desktop sticky support card, dashboard save bar |
| `--z-header` | 30 | app header |
| `--z-dropdown` | 40 | menus |
| `--z-overlay` | 60 | dialog backdrop |
| `--z-dialog` | 70 | modal/sheet |
| `--z-toast` | 90 | toasts |
| `--z-skip-link` | 100 | skip link |

### 2.7 Layout, breakpoints and responsive grid

| Token | Value | Notes |
|---|---|---|
| `--bp-sm` | 30 rem / 480 px | large phones |
| `--bp-md` | 48 rem / 768 px | tablets, 2-col forms |
| `--bp-lg` | 64 rem / 1024 px | desktop dashboard sidebar, 2-col supporter page |
| `--bp-xl` | 80 rem / 1280 px | wide marketing layout |
| `--layout-page-max` | 75 rem / 1200 px | header, footer, landing |
| `--layout-supporter-max` | 68 rem / 1088 px | supporter desktop grid |
| `--layout-dashboard-max` | 72 rem / 1152 px | dashboard shell |
| `--layout-form-max` | 34 rem / 544 px | single-column forms |
| `--layout-prose-max` | 40 rem / 640 px | legal pages |
| `--layout-measure` | 62 ch | body measure |
| `--layout-gutter` / `--layout-gutter-lg` | 16 px / 24 px | mobile / desktop |
| `--header-height` / `--header-height-lg` | 56 px / 68 px | mobile / desktop |
| `--sticky-action-height` | 72 px | dashboard save bar incl. safe area |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | iOS |

**Breakpoint behaviour** (literals are repeated in CSS media queries because custom properties cannot be used inside `@media`; keep them in sync with `--bp-*`):

| Range | Grid | Supporter page | Dashboard | Embed |
|---|---|---|---|---|
| 320–479 px (baseline **360**) | 1 col, 16 px gutter | single column, QR 76vw ≤264 px | list/cards only, top segmented nav | fluid 100% (min 300 px) |
| 480–559 px | 1 col, 20 px gutter | chips 2×2, QR 280 px | cards, filters wrap | 380 px max |
| 560–767 px | 1 col, 20 px gutter | chips 4-across, QR 280 px | cards, filters wrap | 380 px max |
| 768–1023 px | 2-col form layouts | still 1-col centred 680 px | sidebar 232 px + content | fixed 380 px |
| 1024–1279 px | 2-col supporter: identity + sticky support card | support card `--z-sticky`, gap 48 px | sidebar + content max 1152 px | — |
| ≥1280 px | same, centred page max 1200 px | hero/landing gets more air | wider table columns | — |

Safe area: sticky bars and toasts use `padding-bottom: calc(var(--space-3) + var(--safe-bottom))`. No horizontal scroll at 320 px, 200% zoom or 400% reflow.

### 2.8 Component token index (authoritative values live in `tokens.css`)

| Group | Key tokens | Values / notes |
|---|---|---|
| Buttons | `--button-height`, `-height-sm`, `-radius`, `-padding-x`, `-font-weight`, `-primary-bg`, `-primary-ink`, `-secondary-bg`, `-secondary-border`, `-ghost-bg`, `-danger-bg`, `-disabled-bg/ink` | 48 / 44 px, pill, 600, clay primary / white surface secondary / transparent ghost / lacquer danger |
| Links | `--link-ink`, `--link-ink-hover`, `--link-underline-offset` | `--accent-ink`, underlined, 0.18em offset |
| Amount chips | `--chip-height`, `-radius`, `-bg`, `-border-color`, `-selected-bg`, `-selected-border-color`, `-selected-ink`, `-amount-font-size`, `-label-font-size` | 56 px, 12 px radius, 17 px amount, 12 px metaphor |
| Copy field | `--copy-field-bg`, `-ink`, `-border-color`, `-radius`, `--copy-button-size` | raised fill, 44 px copy/reveal buttons |
| QR panel | `--qr-size`, `-size-lg`, `-panel-bg`, `-panel-radius`, `-panel-padding`, `-plate-bg`, `-plate-radius`, `-plate-padding`, `-quiet-zone`, `--qr-fg`, `--qr-bg` | 264 px mobile, 280 px desktop; plate always white |
| Badges | `--badge-height`, `-padding-x`, `-radius`, `-font-size`, `-icon-size`, `-*-bg/ink` for neutral/selfreported/confirmed/danger/demo | 24 px pill, 12 px semibold |
| Claim card | `--claim-card-bg/border-color/radius/padding/gap`, `--claim-amount-size`, `--claim-meta-ink` | white card, 16 px radius, 24 px amount |
| Disclosure strip | `--disclosure-bg/ink/border-color/border-width/radius/padding/font-size/icon-size` | accent-soft, 3 px clay rule, 14 px text |
| Payment method card | `--method-card-bg/border-color/radius/padding/gap`, `--method-account-font/size/weight` | white card, 16 px radius, numeric account |
| Language toggle | `--lang-toggle-height/padding-x/radius/bg/bg-hover/ink/border-color/font-size` | 44 px tall, pill, shows the *other* language |
| Header/footer | `--header-height`, `-bg`, `-border`, `--brand-mark-size`, `--nav-link-ink`, `--footer-ink`, `--footer-font-size` | 56/68 px header; muted footer |
| Toast | `--toast-bg/ink/radius/padding/font-size/shadow/duration` | ink on paper inverted, pill, 3.2 s |
| Dialog | `--dialog-bg/radius/padding/max-width/shadow`, `--overlay-bg` | 480 px max, 20 px radius |
| Skeleton | `--skeleton-bg/shine/radius/duration` | subtle shimmer, static under reduced motion |
| Avatar | `--avatar-size-sm/md/lg/xl`, `-bg`, `-radius`, `-font-size-*` | 40/56/72/96 px, emoji only |
| Dashboard | `--sidebar-width`, `--table-*`, `--stat-card-*` | 232 px sidebar, 56 px rows |
| Embed | `--embed-min-width/max-width/padding/radius/bg/border-color/qr-size` | 300–380 px, 176 px QR |
| Poster | `--poster-width/height/margin/qr-size`, `--poster-*-size`, `--poster-gap` | A4 210×297 mm, 62 mm QR, black on white |
| Demo mode | `--demo-banner-bg/ink/height` | brass strip, 36 px |
| Skip link | `--skip-link-bg/ink/radius/padding` | appears on first Tab |

---

## 3. Component inventory

### 3.0 Global component rules

Build order: tokens (`tokens.css`) → button/link/field → badges + chips → QR panel + copy field → disclosure strip → claim card/form → header/footer → dashboard pieces → embed + poster.

**Every interactive component ships these states** (the tables below only list the deltas):

| State | Rule |
|---|---|
| default | Token values as defined; no colour is the only signal. |
| hover | Only inside `@media (hover: hover) and (pointer: fine)`; never required to reveal function. |
| focus-visible | `outline: var(--focus-ring); outline-offset: var(--focus-offset)`. Never `outline: none` without a replacement. Keyboard-only (not on mouse click). |
| active/pressed | `transform: scale(var(--motion-scale-press))` + darker/lighter token; no layout shift. |
| disabled | `disabled` attribute (real) + `--button-disabled-*`; keep ≥44 px; if disabling needs explanation, render helper text next to it. |
| loading | `aria-busy="true"`, 16 px spinner, label changes to the brand-copy loading string (e.g. **পাঠানো হচ্ছে… / Sending…**), double-submit prevented. |
| error | Rendered as inline text linked with `aria-describedby`; the component itself keeps its normal fill (error colour only on border/message, never a red button). |
| dark | Uses dark tokens only; never hand-pick a colour; QR never inverted. |
| reduced motion | No transform/shimmer; colour changes still allowed. |
| 44 px | Every target ≥ 44×44 CSS px, including icon-only buttons and badge-adjacent toggles. |

**Never**: `div` with `onClick` as a control; `aria-label` on a visible-text control (use visible text); placeholder-as-label; colour-only status; `text-transform: uppercase`; letter-spacing on Bangla; provider logos; "payment", "checkout", "paid", "verified payment" in any state label.

---

### 3.1 Button

**Anatomy:** `[leading icon 18px?] label [trailing icon 18px?]` inside a pill, optional 16 px spinner replacing the leading icon while loading. Icons are inline SVG, `aria-hidden="true"`, stroke 1.75 px, currentColor.

**Variants**

| Variant | Fill / ink | Border | Use |
|---|---|---|---|
| `primary` | `--button-primary-bg` / `--button-primary-ink` | none | One per screen: **চা খাওয়ান**, **পেজ খুলুন**, **জানিয়ে দিন**, **পেজ প্রকাশ করুন** |
| `secondary` | `--button-secondary-bg` / `--button-secondary-ink` | `--button-secondary-border` | **QR সেভ করুন**, **প্রিভিউ দেখুন**, **দেখাবেন না**, dialog cancel |
| `ghost` | transparent / `--button-ghost-ink` | none | Tertiary actions in dense areas (footer links, filter reset) |
| `danger` | `--button-danger-bg` / `--button-danger-ink` | none | Delete page, remove method (always inside a confirm dialog) |

**Sizes:** `md` 48 px tall (`--button-height`), `sm` 44 px (`--button-height-sm`, for dashboard rows). Full-width is the default for supporter primary CTAs on screens < 480 px (the full-width button modifier). Icon-only = exactly `--tap-min` square with required `aria-label`.

**States**

| State | primary | secondary | ghost | danger |
|---|---|---|---|---|
| default | clay fill, white label | white fill, warm border | transparent, ink | lacquer fill, white label |
| hover | `--accent-hover` | `--raised` fill | `--raised` fill | `--danger-hover` |
| focus-visible | 2 px teal ring, 2 px offset (outside the pill) | same | same | same |
| active | `--accent-active` + 0.985 scale | `--raised` + scale | `--raised` + scale | `--danger-hover` + scale |
| disabled | `--button-disabled-bg` + `--button-disabled-ink`, no shadow | same | same | same (never hide a disabled delete behind native styling only) |
| loading | label becomes the loading string; spinner; `aria-busy` | same | rare | same |

**A11y:** native `<button type="button">` (form submit uses `type="submit"`); visible text is the accessible name; loading change is announced via the button's `aria-live="polite"` label wrapper *or* a form-level status region (pick one, not both); destructive buttons never receive initial focus in a dialog; no hover-only content.

---

### 3.2 Link

- Inline prose links: `--link-ink`, always underlined, `--link-underline-offset`, hover `--link-ink-hover`; visited state uses the same colour (no purple).
- Navigation links (header/footer): muted ink, underline on hover/focus-visible; `aria-current="page"` where applicable.
- External links (deshiQR GitHub, provider terms) get a 12 px arrow icon and `rel="noopener noreferrer"` + `target="_blank"`; add sr-only "(নতুন ট্যাবে খুলবে / opens in a new tab)".
- Report link is a `mailto:` with the page URL prefilled (see §6.2) — never a fake form.
- Focus ring identical to buttons. Never style a link as a button unless it navigates; never use a button for navigation.

---

### 3.3 Form field primitives (label, input, textarea, select, checkbox)

**Shared anatomy:** label (visible, `--field-label-size`, 600) → field → helper (muted, `--field-helper-size`) → error (danger, icon + text, `--field-error-ink`). Optional fields are marked **(ঐচ্ছিক) / (optional)** in the label, per brand-copy naming; required fields carry no asterisk (asterisk-only required marking is hard to read).

| Element | Spec |
|---|---|
| Input | height `--field-height` (48 px), radius `--field-radius`, `--field-bg`, 1 px `--field-border-color`, padding-x `--field-padding-x`, font 16 px (never < 16 px on mobile — prevents iOS zoom), placeholder `--field-placeholder` (hint only, never the label) |
| Textarea | `--field-textarea-min-height` (96 px), `resize: vertical`, max 280 chars with counter |
| Select | native `<select>` with `appearance: none` + inline chevron SVG (12 px) on the inline-end; 48 px tall; option labels from brand-copy §7.3 |
| Checkbox | 20 px box inside a 44 px label row; `accent-color: var(--accent)`; used for the 18+ acknowledgment and export options |
| Amount input | `inputmode="numeric"`, `autocomplete="off"`, prefix ৳ rendered inside the field (aria-hidden) + `<label>` "কত টাকা পাঠিয়েছেন?"; accepts whole taka only (digits, max 6), formats with `formatTaka()` on blur; validation min ৳1 / max ৳100,000 |
| Error | `aria-invalid="true"` + `aria-describedby="<helper id> <error id>"`; border `--danger`; error text prefixed with a 14 px ⚠ icon and the word **ভুল হয়েছে / There's a problem** is *not* used — the message itself is enough |
| Disabled | `--field-bg-disabled`, muted ink, `cursor: not-allowed`, still labelled |
| Focus | field ring: `outline: var(--focus-ring); outline-offset: 0` for inputs (ring hugs the field) — never remove it |

**Validation behaviour:** validate on blur and on submit, never on every keystroke; on submit failure, render an error summary above the form (`role="alert"`, focus moved to it) listing each field error as an in-page link; the first invalid field receives focus after the summary is announced. Character counters use `aria-live="polite"` and update at most every 3 keystrokes.

**A11y:** every field has a `<label for>`; helper/error ids are stable; error text is never colour-only; no custom combobox (native select for method); age checkbox has a visible label and its own error; autocomplete tokens on login email (`autocomplete="email"`, `type="email"`).

---

### 3.4 Amount chips (`.amount-chip`)

The amount ladder is the emotional core of the page: four easy decisions, no price tag.

**Anatomy (56 px tall, `--chip-radius`, white card, 1 px `--chip-border-color`):**

```
┌─────────────────────────┐
│ ৳50            [✓]      │  ← amount: 17 px / 700 / tabular
│ এক প্লেট নাস্তা           │  ← metaphor: 12 px / 500 / muted
└─────────────────────────┘
```

- **Variants:** default presets (৳20 **এক কাপ চা**, ৳50 **এক প্লেট নাস্তা**, ৳100 **খাবার**) + a fourth **ইচ্ছেমতো / Any amount** chip (no amount shown, 16 px 600 text, plus a small "+" glyph).
- **Layout:** mobile 2×2 grid (gap `--space-2`); 4-across from **560 px** (measured: the metaphor needs ≥ 120 px per chip); custom-amount input appears directly below the grid when **ইচ্ছেমতো** is selected.
- **States:** unselected (white, warm border) → hover raised → focus-visible teal ring → selected (`--chip-selected-bg`, 2 px `--accent` border, `--chip-selected-ink`, check mark) → disabled (raised, muted — used only while the claim form is submitting) → error (custom amount invalid: input border danger + error text under the grid; chip keeps selected styling).
- **Default:** ৳20 selected on load (brand-copy §6). Selection persists to `sessionStorage` for the return-from-bKash trip; it never goes in the URL. Selecting a chip also re-renders the QR with the lossless amount payload (§3.6, architecture §5) — synchronous, no network, and announced through a polite live region ("QR-এ ৳50 যোগ করা হয়েছে") so screen-reader users know the image changed.
- **Honesty:** the helper **দাম নয় — যতটা ইচ্ছা। / Not a price — send what you like.** sits under the section label, always.
- **Locked amount links** (creator-chosen): one preselected chip with a **নির্ধারিত / Suggested** line under it; the other chips are hidden and the custom input is hidden. A muted helper reads **যতটা ইচ্ছা পাঠাতে পারেন / You can still send any amount** — the "lock" is a convenience, not enforcement, and must never be labelled "fixed" or "required".

**A11y:** container `role="radiogroup" aria-label="কতটা পাঠাতে চান?"`; each chip `role="radio" aria-checked`; `tabindex="0"` only on the selected chip (roving tabindex), arrows/Home/End move selection, Space/Enter select; each chip's accessible name includes the amount spoken in Bangla words: `aria-label="৳20 — বিশ টাকা, এক কাপ চা"`; custom input has its visible label; errors tied with `aria-describedby`.

| Preset | Accessible amount wording |
|---|---|
| ৳20 | বিশ টাকা |
| ৳50 | পঞ্চাশ টাকা |
| ৳100 | একশ টাকা |
| ৳500 | পাঁচশ টাকা |
| ৳1,000 | এক হাজার টাকা |
| arbitrary | `টাকার পরিমাণ: {formatted}` (digits are read by the SR; do not invent words) |

---

### 3.5 Copy field + reveal (`.copy-field`)

**Anatomy:** masked account value (numeric, `--method-account-font`, 600) + inline-end **কপি** icon-button (44 px) + **দেখান/লুকান** eye icon-button (44 px). Helper below: **পাঠানোর আগে নাম ও নম্বর মিলিয়ে নিন। / Check the name and number before sending.**

- Values are masked by default: `01000•••000` (engine mask helper). Masking is a visual convenience, **not** a security claim — the number is public by design (brand-copy §7.2, blueprint §9). Do not describe the mask as hiding/protecting anything.
- **Copy** copies the full value, then: icon → check, label → sr-only **কপি হয়েছে / Copied**, toast **কপি হয়েছে / Copied** (3.2 s), announced by an `aria-live="polite"` region. Clipboard failure → inline toast/error with the manual-select instruction **নম্বরটি সিলেক্ট করে কপি করুন / Select the number to copy**.
- **Reveal** toggles the visible value; button is `aria-pressed` with label **নম্বর দেখান / Show number** → **নম্বর লুকান / Hide number**; reveal state is not persisted.
- Used for: bKash/Nagad/Rocket numbers, bank account + routing, TxID in the creator dashboard (`--font-mono`), share link in the share kit.
- Never used for: public display of a TxID (never public), or as an excuse to hide payment details behind a reveal (the primary method is visible; the copy field is the display).

**A11y:** value is readable text, not an input, with `user-select: all`; both buttons have `aria-label` and 44 px targets; toast is a polite status; the masked value's accessible name is the **full** value only in the copy button's label context (SR users get "কপি করুন: ০১০০০০০০০০০" when focused) — while the visible text stays masked.

---

### 3.6 QR panel (`.qr-panel`)

**Anatomy:** card → white plate (`--qr-plate-bg`, 12 px padding, radius) → inline `<svg role="img">` (margin = 4 modules, `shape-rendering: crispEdges`, square modules) → decode badge + provider name row → decoded merchant name (e.g. `DEMO STORE`) → helper text (brand-copy §7.2 verified/unverified helper). Panel is never overlaid, never rotated, never filtered, never dark-inverted. No logo inside the QR.

**Sizes:** supporter mobile `--qr-size` (min(76vw, 264 px)), supporter desktop `--qr-size-lg` (280 px), dashboard method-row preview `--qr-size-sm` (200 px), embed `--embed-qr-size` (176 px), poster `--poster-qr-size` (62 mm). Panel: `--qr-panel-shadow`. Rendering floor: each module ≥ 4 CSS px; if a payload forces version > 10, use `--qr-size-lg` and warn the creator in the dashboard.

**States**

| State | Visual | Copy |
|---|---|---|
| verified | QR + jade badge + merchant name | **যাচাই করা বাংলা QR · বিকাশ / Verified Bangla QR · bKash** + helper §7.2 |
| unverified | QR + amber badge + merchant name (if decoded) | **অযাচাইকৃত বাংলা QR — পাঠানোর আগে মিলিয়ে দেখুন / Unverified Bangla QR — double-check before sending** + helper §7.2 |
| image-only | static uploaded image (no inline SVG), neutral badge + "ছবি" icon | **শুধু ছবি, যাচাই করা যায়নি / Image only, not verified** + helper |
| no QR (manual) | no panel; copy field only | manual method label + copy instruction |
| encode error | plate with warning icon + fallback text, never a broken image | *QR তৈরি করা যায়নি। নম্বর কপি করে পাঠান। / Couldn't build the QR. Copy the number instead.* |
| amount variant | QR regenerated for the selected preset/locked amount; panel unchanged otherwise | small helper **QR-এ নির্বাচিত ৳{amount} বসানো আছে / The QR includes the selected ৳{amount}**; ইচ্ছেমতো shows the static payload with no helper |
| loading | 264×264 skeleton plate, `aria-busy` | **একটু অপেক্ষা করুন… / One moment…** (sr-only) |

**A11y:** `role="img"` + `aria-label="ডেমো শিক্ষক-এর বিকাশ QR — যাচাই করা বাংলা QR, DEMO STORE। QR-এ ৳50 বসানো আছে। স্ক্যান করে নিজের অ্যাপে টাকা পাঠান।"` (build from real fields; the amount clause is present only when an amount is embedded — template in §7.4); the account number is always also available as text/copy for people who cannot use a QR; decode status is visible text, not just the icon; panel has no focusable children except the save button; when an amount chip changes the QR, announce it politely (§9.3) so non-visual users know the image updated.

---

### 3.7 Payment method card (`.method-card`)

**Anatomy (verified bKash QR example):**

```
┌──────────────────────────────────────────┐
│ বিকাশ            [✓ যাচাই করা বাংলা QR]   │ ← provider + decode badge
│ ┌──────────────┐                          │
│ │   QR plate   │  DEMO STORE              │ ← decoded merchant name
│ │  264 × 264   │  যাচাই করা মানে QR-এর     │
│ └──────────────┘  তথ্য ঠিক আছে…           │ ← helper C (mandatory)
│ [QR সেভ করুন]                             │
│ 01000•••000                 [কপি] [👁]    │
│ সর্বশেষ হালনাগাদ: 1 নভেম্বর 2026           │
└──────────────────────────────────────────┘
```

**Variants:** `verified-qr` · `unverified-qr` · `image-only-qr` · `manual-mfs` (number only) · `bank` (account name, number, bank, branch, routing) · `other`. The first enabled method is expanded and rendered first (the creator can reorder; the UI respects `sort_order`). Remaining methods are inside **অন্য উপায়ে পাঠাতে চান? / Prefer to send another way?** — an accordion listing compact rows (provider + method type + masked account + badge) that expand into a full card. If only one method exists, the accordion is not rendered.

**Rules**
- The decode badge and its helper (compliance C) are mandatory on **every** method group: *যাচাই করা মানে QR-এর তথ্য ঠিক আছে — টাকা এসেছে এমন নয়। / "Verified" means the QR data checks out — not that the money arrived.*
- Manual and bank methods always show **পাঠানোর আগে নাম ও নম্বর মিলিয়ে নিন। / Check the name and number before sending.**
- **Last updated** date is shown for every method (honesty about staleness).
- Empty state (no enabled methods) is specified in §3.16.
- Never: substitute a Chanasta account or QR; add a "Pay" button; hide the account number behind an accordion; show a provider logo.

**A11y:** each card is a `<section aria-labelledby>`; accordion trigger is a real `<button aria-expanded aria-controls>`; expanded content is a labelled region; QR labelled as §3.6; bank fields rendered as a `<dl>`; no focusable elements inside decorative SVGs.

---

### 3.8 Decode-status badge (4 variants, mandatory on every method)

| Variant | Bangla label | English label | Fill / ink | Icon |
|---|---|---|---|---|
| verified | **যাচাই করা বাংলা QR · বিকাশ** | Verified Bangla QR · bKash | `--badge-confirmed-*` (jade) | check in circle |
| unverified | **অযাচাইকৃত বাংলা QR — পাঠানোর আগে মিলিয়ে দেখুন** | Unverified Bangla QR — double-check before sending | `--badge-selfreported-*` (amber) | info |
| image-only | **শুধু ছবি, যাচাই করা যায়নি** | Image only, not verified | `--badge-neutral-*` | image |
| manual (MFS) | **শুধু নম্বর / Number only** | Number only | `--badge-neutral-*` | number/hash |
| bank | **ব্যাংক অ্যাকাউন্ট / Bank account** | Bank account | `--badge-neutral-*` | bank/number |

- Wording maps 1:1 to the `qr_status` enum in [data-model.md §4](./data-model.md); `verified` can only be set by the server after a real decode + checksum. UI must not upgrade a badge optimistically — show a loading shimmer until the server answer.
- "Verified" always refers to **data**, never money. The phrase "verified payment" appears nowhere.
- Badges are not buttons and have no tooltips: the full label is visible and wraps (max 2 lines on 360 px).
- SR: the badge text is part of the method card's name; the icon is `aria-hidden`.

---

### 3.9 Claim status badges (public + dashboard)

| Context | Badge | Bangla | English | Fill / ink |
|---|---|---|---|---|
| Public, `unverified` | self-reported | **স্ব-ঘোষিত** | Self-reported | `--badge-selfreported-*` |
| Public, `confirmed` | creator-confirmed | **ক্রিয়েটর নিশ্চিত করেছেন** | Creator confirmed | `--badge-confirmed-*` |
| Dashboard, `unverified` + unseen | new | **নতুন** | New | amber dot + label, 12 px |
| Dashboard, `hidden` | hidden | **লুকানো** | Hidden | `--badge-neutral-*` |
| Dashboard, `rejected` | rejected | **মডারেশনে সরানো হয়েছে** | Removed by moderation | `--badge-danger-*`, read-only |
| Page, demo | demo | **ডেমো / DEMO** | Demo | `--badge-demo-*` |

- **Every public claim card shows the self-reported badge or the creator-confirmed badge.** No unbadged claim, ever. The badge is never truncated or icon-only.
- "Creator confirmed" is attributed to the **creator** in both languages; it must never read "Chanasta verified" or "verified payment".
- The dashboard "new" state is a dot + label combination; it clears when the claim is confirmed/hidden or the row is opened (local, no server write in MVP).
- SR: badge text is read as normal text; do not use `aria-label` to shorten it.

---

### 3.10 Claim card (`.claim-card`)

**Public variant anatomy:**

```
┌────────────────────────────────────────────┐
│ ৳50     [স্ব-ঘোষিত]                         │ ← amount 24/700 + badge
│ একজন শুভানুধ্যায়ী                            │ ← name or well-wisher
│ "ভিডিওটা পরীক্ষার আগে কাজে লেগেছে, ধন্যবাদ!"   │ ← message (optional, ≤280)
│ বিকাশ · 2 দিন আগে                            │ ← method + relative date
└────────────────────────────────────────────┘
```

**Dashboard variant:** same card, plus a meta row with full timestamp and an expandable **বিস্তারিত / Details** region containing TxID (copy field, mono), method, "only you can see this" note, duplicate-TxID warning if flagged, and the action row: **নিশ্চিত করেছি / I've confirmed** (primary sm), **দেখাবেন না / Hide** (secondary sm), **আবার দেখান / Show again** (hidden), **বিস্তারিত / Details** (ghost). No "mark as paid", no money status.

**States:** self-reported · confirmed · hidden (dashboard only) · rejected (dashboard only, read-only) · new dot · skeleton (`--skeleton-bg`, 88 px) · message empty (card shrinks to amount + name + meta) · long message (clamped to 6 lines + **আরও পড়ুন / Read more** button with `aria-expanded`) · long name (truncate at 2 lines, full name in `title`/sr-only).

**A11y:** `<article aria-labelledby>`; the article's accessible name is a summary sentence, e.g. *"স্ব-ঘোষিত ৫০ টাকা, একজন শুভানুধ্যায়ী, 2 দিন আগে, বিকাশ"*; card actions are labelled with context (`aria-label="৫০ টাকার বার্তা নিশ্চিত করুন"`); relative dates are `<time datetime="ISO">`; the confirm/hide result is announced via a toast (polite) and the card updates without moving focus away from the now-changed action (focus the next action or the card heading).

---

### 3.11 Claim form (`/@:slug` — "পাঠিয়েছেন? জানিয়ে দিন")

**Where:** inline, directly after the payment methods and before the public claim list. On desktop it is a card in the right support column (below the QR). It is **not** a modal — no focus trap, no lost context, works with the back button.

**Anatomy / order**

1. Section heading **পাঠিয়েছেন? জানিয়ে দিন / Sent it? Let them know** (h2).
2. Mandatory honesty intro (brand-copy §7.3 form intro, compliance D).
3. Amount — prefilled from the selected chip; label **কত টাকা পাঠিয়েছেন?**; ৳ prefix; helper **৳1 থেকে ৳100,000**.
4. Method — native select: only the creator's enabled methods + **অন্য কিছু / Something else**; label **কোন মাধ্যমে পাঠিয়েছেন?**
5. Name (optional) — label **আপনার নাম (ঐচ্ছিক)**; placeholder **আপনার নাম, বা "একজন শুভানুধ্যায়ী"**; helper §7.3.
6. Message (optional) — label **একটি ছোট বার্তা (ঐচ্ছিক)**; textarea, 280 max, counter.
7. TxID (optional) — label **লেনদেনের আইডি / TxID (ঐচ্ছিক)**; helper **শুধু ক্রিয়েটর দেখতে পাবেন। কখনো পেজে দেখানো হয় না। / Only the creator can see this. It is never shown on the page.**
8. Age acknowledgment checkbox (required) — brand-copy §7.3; error if untouched.
9. Privacy line: **আপনার নাম ও বার্তা পেজে দেখা যেতে পারে। নাম না দিলে "একজন শুভানুধ্যায়ী" লেখা থাকবে। / Your name and message may appear on the page. If you leave the name blank we'll show "A well-wisher".**
10. Submit primary block button **জানিয়ে দিন / Send**; sr-only honeypot field; no account, no email, no cookies.

**States**

| State | Behaviour |
|---|---|
| default | ৳20/last-selected chip value prefilled; method = first enabled; no error text |
| invalid | per-field errors + error summary at the top (focused, `role="alert"`); submit re-enabled |
| submitting | button loading **পাঠানো হচ্ছে… / Sending…**, `aria-busy`, fields readable but not editable; double submit blocked |
| success | navigate to `/@:slug/thanks` with the claim summary in `sessionStorage`; if navigation fails, swap the form for an inline success card with the same copy and a **পেজটি শেয়ার করুন** button |
| rate-limited | inline banner **একটু বেশি বার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন। / Too many attempts. Please try again a little later.** (amber, not red — it is not the supporter's crime) + submit re-enabled after a delay; no countdown invented |
| duplicate (soft, server flag) | amber inline notice **এই ধরনের একটি বার্তা আগেই দেওয়া হয়েছে। / A message like this was already sent.** — submission still succeeds; never accuse |
| network error | inline error **সংযোগ পাওয়া যাচ্ছে না… / Can't connect…** + retry button; form values preserved |
| missing methods | if the creator has no enabled method, the whole form area shows the no-methods empty state instead (nothing to claim against) |
| disabled | never disabled as a whole; individual fields may disable during submit only |

**A11y:** `<form novalidate>` with the error summary pattern from §3.3; age checkbox required and labelled; honeypot `aria-hidden` + `tabindex="-1"`; success is announced by moving focus to the thanks H1 (navigation) or the inline success heading; no time limit on the form besides server rate limits.

---

### 3.12 Disclosure strip (honesty surface)

**Variants and placement** (strings come from `brand-copy.md`; do not retype them here):

| Variant | Placement | String | Emphasis |
|---|---|---|---|
| `method-strip` | Above payment methods on `/@:slug` | compliance B | accent-soft strip, 3 px left rule, info icon, always expanded |
| `decode-helper` | Inside every method card | compliance C | plain 14 px inside card, not a second strip |
| `claim-intro` | Claim form header | compliance D | accent-soft strip inside form |
| `claim-list-note` | Above public claim list | compliance E | 14 px muted note + "স্ব-ঘোষিত" badge example |
| `footer-strip` | Creator page footer, landing footer | compliance A / F | plain text block, not a card; 14 px; full Bangla then English |
| `dashboard-help` | Payments + onboarding QR screens | compliance G | muted helper under the method editor |
| `tos-line` | Site footer under A/F | compliance H | links to Terms/Privacy |

**Anatomy:** icon (18 px, `aria-hidden`) → text (`--disclosure-font-size`, `--leading-body`) → optional link **কীভাবে কাজ করে / How it works**. Bangla sentence first, English sentence second, both visible (never a collapsed language toggle inside the strip).

**Rules:** never dismissible; never inside an accordion or a scroll container; never truncated; never styled as an error (no red); no exclamation marks; contrast measured (see §7.2). If a surface only has room for one line, use the Bangla first line and link to `/legal/how-it-works` for the full text — never replace the strip with an icon-only ⓘ.

**A11y:** `role="note"`; the icon is decorative; the text is real text (not an image); links underlined; the strip is not focusable unless it contains a link.

---

### 3.13 Language toggle

- **Label shows the other language** (brand rule): in Bangla UI the button reads **English**; in English UI it reads **বাংলা**. No flags, no "BN/EN" codes.
- **Placement:** supporter header right; landing/dashboard/legal header right. Not inside the embed card (the embed reads `?lang=` from its URL instead).
- **Behaviour:** switches `<html lang>` (`bn` ↔ `en`), persists in `localStorage` key `chanasta.lang`, and updates `?lang=en` with `history.replaceState` so a link can be shared in either language. Default is always **Bangla**, regardless of `navigator.language`. First paint reads the stored preference from a tiny inline script before CSS paints to avoid a flash.
- **Size:** `--lang-toggle-height` 44 px, pill, 1 px `--lang-toggle-border-color`, text `বাংলা`/`English` 14 px 600 (Bangla label is only 31 px wide at 13 px — never pad it into a tiny target; the pill keeps 44 px height and ≥ 44 px width via horizontal padding).
- **A11y:** `aria-label="ভাষা বদলান / Change language"` on the button while visible text stays the target language; after switching, keep focus on the toggle and announce the new language via `aria-live="polite"` (the page content re-renders; do not reload); update `<html lang>` and the document title; all `aria-label`s re-render in the new language (no mixed-language accessibility names).

---

### 3.14 App header

| Context | Contents (left → right) |
|---|---|
| Supporter page | wordmark (home link) · … · language toggle (no other nav — the page is the task) |
| Landing (≥768 px) | wordmark · **কীভাবে কাজ করে** · **ডেমো পেজ** · **লগইন** · primary button **পেজ খুলুন** |
| Landing (<768 px) | wordmark · language toggle · **পেজ খুলুন** (sm secondary) |
| Dashboard | sidebar/brand + page status pill + **পেজ দেখুন** link + avatar menu (language, theme, log out) |
| Legal | wordmark · back link · language toggle |

- Height 56 px mobile / 68 px desktop, background `--header-bg` (opaque — no blur), 1 px bottom border, sticky (`--z-header`) only on dashboard and legal; the supporter page header scrolls away (keeps the creator's name as the anchor).
- **A11y:** `<header>` + `<nav aria-label="প্রধান / Primary">`; skip-link is the first focusable element (targets `#main`); brand link `aria-label="চানাস্তা — হোম / Chanasta — home"`; `aria-current="page"` on the active nav item; no hamburger menu on supporter pages (nothing to hide).

---

### 3.15 Footer

**Supporter footer (every creator page):**

1. Compliance A footer strip (Bangla paragraph then English paragraph, 14 px).
2. **টাকার ওপর কোনো ফি নেই — এখন এবং ভবিষ্যতে। / No fees on money — now or ever.** (brand-copy §7.5).
3. Link row: **কীভাবে কাজ করে** · **শর্তাবলি** · **গোপনীয়তা** · **রিপোর্ট করুন** (mailto prefilled with the current page URL).
4. Engine credit: **Powered by deshiQR** → <https://github.com/hello2himel/deshiQR>, with the sr-only note **বাংলা QR ইঞ্জিন / Bangla QR engine**. Opens in a new tab.
5. Demo line (demo mode only): **এটি একটি ডেমো — এখানে কোনো আসল টাকা যায় না। / This is a demo — no real money moves here.**

**Landing footer:** compliance F block, H line (**চানাস্তা পেমেন্ট প্রসেসর নয় — শর্তাবলি ও গোপনীয়তা দেখুন। / Chanasta is not a payment processor — see Terms and Privacy.**), report link, deshiQR credit.

**Dashboard footer:** only **শর্তাবলি · গোপনীয়তা · রিপোর্ট করুন** + version marker (muted, 12 px). No marketing.

- Layout: stacked on mobile (links wrap to 2 columns ≥ 400 px), 3 columns ≥ 768 px; 14 px Bangla leading 1.8; max width `--layout-page-max`; top border `--line`.
- **A11y:** `<footer>`; link list is a `<ul>`; mailto link announces it opens an email app (sr-only); external links marked; no tiny 11 px link rows on mobile (44 px tap height for each link row); no newsletter, no social icons without links, no tracking pixels.

---

### 3.16 Empty states

Every empty state is designed, warm, and offers the next action (brand-copy §9). There are no blank areas and no dead ends.

| Surface | Visual | Copy source | Action |
|---|---|---|---|
| Public claims list (published page, no claims) | small steam-line SVG / ☕ at 40 px, card-less centred, 14 px body | §7.6 claim list empty | primary **পাঠিয়েছেন? জানিয়ে দিন** scrolls to form |
| Creator page — no enabled methods | method card shell with dashed 1px `--line-strong` border, no QR skeleton | §7.6 no methods (public) | none public; footer report link remains |
| Dashboard — no claims | card with steam line, heading **সমর্থনের বার্তা** | §7.6 claims empty (dashboard) | **শেয়ার করুন** → copy link; **পেজ দেখুন** |
| Dashboard — filter returns nothing | compact inline empty under the filter (no repeat hero) | §7.6 + filter label | **সব বার্তা দেখুন / Show all messages** |
| Dashboard — no methods | method manager empty state | §7.6 no methods (owner) | **পেমেন্ট পদ্ধতি যোগ করুন / Add a payment method** (opens add sheet) |
| Embed — no methods | compact card message | §7.6 no methods (public) | link **পেজ দেখুন / View page** |
| Onboarding — no methods yet | step-2 empty form with QR drop zone | §7.7 step 1 | **QR পেস্ট করুন** / **ছবি আপলোড করুন** / **নম্বর দিন** |
| 404 | see §4.12 | §7.6 404 | **হোমে ফিরুন / Go home** + demo links |

**A11y:** empty state container has `role="status"` (polite) only when it replaces async content; otherwise plain text with a real heading hierarchy; illustrations `aria-hidden`; the action is a real link/button.

---

### 3.17 Loading states and skeletons

| Region | Skeleton | Behaviour |
|---|---|---|
| Creator page shell | none — identity, honesty strip, footer render immediately from cached/static data | never block the whole page on a spinner |
| Claims list | 3 × claim-card skeletons (88 px) with `--skeleton-bg`/`--skeleton-shine` | `aria-busy="true"` on the list region + sr-only **বার্তাগুলো আনা হচ্ছে… / Loading messages…** |
| Payment methods | 1 × method card skeleton (QR plate 264 + 3 lines) | reserved height = no layout shift |
| Dashboard lists/tables | 5 × 56 px row skeletons | page header renders instantly |
| Profile form | field skeletons are not used — render empty inputs with values once loaded (forms should not reflow) | focused field never moves |
| Embed | QR plate + 2 line skeletons | fixed container height |

Rules: skeletons use the real component dimensions (no generic bars of random widths); shimmer is a single 1.4 s linear sweep of `--skeleton-shine`; `prefers-reduced-motion` → static `--skeleton-bg`; after **10 s** swap the skeleton for the error state with a **আবার চেষ্টা করুন / Try again** button (offline copy from §7.6) — never an infinite shimmer. No full-page spinner, no Lottie, no GIFs.

---

### 3.18 Error states

| Kind | Placement | Copy (brand-copy §7.6) | Recovery |
|---|---|---|---|
| Field error | Under the field, icon + text, `aria-describedby` | specific message from §9.3 | fix and resubmit |
| Form summary | Top of form, `role="alert"`, links to fields | generic + field lines | focused on submit |
| Page fetch error | In place of the content region, card with ⚠ + calm copy | offline / generic | **আবার চেষ্টা করুন / Try again** + report link |
| Rate-limited claim | Inline amber banner in claim form | rate-limited string | submit re-enabled after delay; no countdown invented |
| QR decode failed (creator) | Under the upload/paste field, danger text | QR decode failed string | retry or add number manually (never blocks manual methods) |
| File too large | Under upload field | file too large string | smaller image |
| Save failed (dashboard) | Sticky save bar turns danger + inline message, values preserved | save failed string | retry; unsaved-changes guard |
| Publish blocked | Next to publish button + helper | publish blocked (no method) | link to payments |
| Suspended page | Full-page state, no payment details rendered | suspended string | report/contact link |
| 404 / unknown slug | Full-page state | 404 string | home + demo links |
| Network offline | Sticky bottom banner above footer, amber | offline string | retry; auto-clear on `online` |

Tone: calm, factual, no blame, no exclamation marks, never a raw error code or provider name for an unknown failure. The report/contact route is always reachable from a page-level error.

---

### 3.19 Toast (`.toast`)

- **Purpose only:** confirm something the user just did — copy, save, link copied, claim confirmed/hidden, QR saved, page published. **Never** error notification (errors are inline), never marketing, never "payment".
- **Anatomy:** 14 px text + optional text action button; single line on mobile (wrap to 2), max-width 360 px; pill radius; `--toast-bg`/`--toast-ink` (inverted paper/ink); shadow md.
- **Position:** mobile bottom-centre above `--safe-bottom` and any sticky bar; desktop bottom-right at 24 px. `--z-toast`.
- **Timing:** 3.2 s (`--toast-duration`); toasts with an action (undo) stay 5 s; pause on hover/focus; only one visible at a time (new replaces old, queue length 1). Escape dismisses.
- **Copy:** **কপি হয়েছে / Copied**, **লিংক কপি হয়েছে / Link copied**, **QR সেভ হয়েছে / QR saved**, **নিশ্চিত করা হয়েছে / Confirmed** + action **ফিরিয়ে নিন / Undo**, **লুকানো হয়েছে / Hidden** + **ফেরত আনুন / Undo**, **আপনার পেজ লাইভ! / Your page is live!**.
- **A11y:** `role="status"` + `aria-live="polite"` for confirmations; undo action is a real 44 px button and reachable by keyboard; focus is **not** moved to the toast; no aria-live="assertive".

---

### 3.20 Dialog / sheet + confirmation

- **Implementation:** native `<dialog>` with `showModal()`; `::backdrop { background: var(--overlay-bg) }`; no custom focus trap. If a browser lacks `<dialog>`, fall back to an inline section (do not ship a broken modal).
- **Desktop:** centred, `--dialog-max-width` 480 px, `--dialog-radius`, `--dialog-padding` 24 px, shadow lg, entrance 200 ms `--ease-entrance` translate-y `--motion-distance` + fade.
- **Mobile (<768 px):** bottom sheet — full width, top corners radius xl, max-height 90vh, body scroll locked, drag handle decorative only (close is always a 44 px button; swipe-to-dismiss may be added but never required).
- **Anatomy:** title (h2, 20 px 700) · description (14 px) · content · footer actions (cancel secondary + confirm primary/danger). `aria-labelledby`/`aria-describedby`; initial focus on the heading or the least destructive control; focus restored to the trigger on close; Escape + backdrop click close (destructive confirm ignores backdrop click).
- **Uses and confirmation rules:**

| Dialog | Trigger | Confirmation requirement |
|---|---|---|
| Delete page | Settings danger zone | typed slug (exact, case-sensitive) + danger button **পেজ মুছুন / Delete page**; explains link closes immediately, purge ≤30 days, slug quarantined 90 days |
| Change slug | Profile slug section | plain confirm (rate limit helper: max 1 change per 30 days + old link stops working) |
| Remove payment method | Payments row delete | plain confirm; warns public page may lose its only method (publish state unaffected) |
| Export claims | Settings | options: include TxID (off by default, helper "TxID শুধু আপনি দেখতে পাবেন"), then generate |
| Add payment method / emoji picker | Payments / Profile | sheet, not confirm |
| Add method: discard unsaved | closing sheet with changes | small confirm **পরিবর্তন মুছবেন? / Discard changes?** |

- **A11y:** no nested dialogs; title is the dialog's accessible name; destructive dialog's initial focus is **cancel**, not delete; body scroll locked; dialog content is the only tabbable region.

---

### 3.21 Embed card (`/embed/@:slug`)

**Purpose:** a small, honest "support me" card for a blog/portfolio. It is a **preview that links to the full page**, not a second claim flow.

```
┌──────────────────────────────┐ 300–380 px wide
│ চানাস্তা            [ডেমো]   │ ← brand row (link) + demo badge if demo
│ ☕ ডেমো শিক্ষক                │ ← avatar 40 + name 16/700
│ ফ্রি ম্যাথ ক্লাস — ভালো লাগলে… │ ← tagline 2 lines max
│ ┌──────────┐                  │
│ │ QR 176px │  যাচাই করা QR     │ ← plate + small badge
│ └──────────┘                  │
│ [৳20] [৳50] [৳100] [ইচ্ছেমতো] │ ← compact chips (44 px tall)
│ [     চা খাওয়ান  →     ]     │ ← opens full page in new tab
│ টাকা সোজা ক্রিয়েটরের কাছে যায়; │ ← honesty micro-line (new string §9.3)
│ চানাস্তা টাকা নেয় না।          │
│ রিপোর্ট · Powered by deshiQR   │
└──────────────────────────────┘
```

- Sizes: 100% width, `--embed-min-width` 300 / `--embed-max-width` 380; QR 176 px (`--embed-qr-size`); chips 44 px tall, 2×2 at < 340 px, 4-across ≥ 340 px; selecting a chip re-renders the amount-bearing QR exactly like the full supporter page (§3.6); page scroll allowed (iframe height ~ 430–480 px; document `height: 100%`, no `scrollIntoView`).
- **States:** default · demo · no methods (copy §7.6 + link) · loading skeleton · dark (OS preference; embedders may force with `?theme=dark|light`) · `?lang=en` · no-JS `<noscript>` (name + tagline + link to the full page; QR cannot render without JS in the static build).
- **Must not appear:** claim form, txid, full bio, social links, modal, sticky bars, provider logos, analytics.
- **A11y:** minimal landmarks (`main`, one `h1` = creator name); iframe embed code documented with a required `title` ("ডেমো শিক্ষক-কে এক কাপ চা খাওয়ান — চানাস্তা"); open-in-new-tab links carry sr-only "(নতুন ট্যাবে খুলবে)"; focus ring visible; contrast identical to the main product (it loads `tokens.css`).

---

### 3.22 Poster / print card (A4)

**Purpose:** the creator's printable sign — the same information as the page, designed as an artifact (shop-wall honesty).

**Anatomy (portrait A4, `--poster-*` tokens):**

```
┌──────────────────────────────┐ 210 × 297 mm, 15 mm margin
│  ╭ steam line ╮    চানাস্তা    │ ← brand row + "এক কাপ চা, অনেক ভালোবাসা।"
│                              │
│  ☕  ডেমো শিক্ষক               │ ← avatar (emoji, 72 px print ≈ 19 mm)
│  ফ্রি ম্যাথ ক্লাস — ভালো লাগলে… │ ← tagline
│                              │
│  ┌────────────────────────┐  │
│  │      QR 62 mm          │  │ ← QR black on white, quiet zone ≥ 4 modules
│  └────────────────────────┘  │
│  DEMO STORE                  │ ← decoded merchant name
│  01000000000 (ডেমো)          │ ← full account number for manual entry
│                              │
│  বিকাশ বা যেকোনো বাংলা QR অ্যাপ  │
│  দিয়ে স্ক্যান করুন              │
│  পাঠানোর আগে নাম ও নম্বর মিলিয়ে │
│  নিন।                         │
│                              │
│  চানাস্তা.xyz/@demo-teacher   │ ← URL, 12 pt, rules below
│  চানাস্তা কোনো পেমেন্ট প্রসেস    │
│  করে না। টাকা সরাসরি আপনার      │
│  অ্যাকাউন্টে যায়।              │
└──────────────────────────────┘
```

- **Rules:** black on white only; QR ≥ 62 mm and never stretched; real Bangla text at ≥ 9 pt; the demo version carries a visible **ডেমো / DEMO** mark and the fake account; the creator URL is the canonical `/@slug`; privacy note for screenshot QRs is printed on the dashboard page that generates it, not on the poster.
- The poster shows the **full account number** (it is public data by design and manual entry may need it even though the screen UI masks it by default); the on-screen preview still uses the mask with a **প্রিন্টে পুরো নম্বর থাকবে / The print will show the full number** helper.
- **Print:** `@page { size: A4; margin: 0 }`, `.poster { width: 210mm; height: 297mm; padding: 15mm; }`, print chrome hidden, `print-color-adjust: exact` (only for the QR and rules; the rest is black/white), no page break inside the card, fonts must already be loaded (print from the dashboard, not a print-first route). Supports "Save as PDF" via the browser; no PDF library.
- **A11y/alt:** the on-screen poster preview has a full text description and a **QR সেভ করুন / Save QR** / **পোস্টার প্রিন্ট করুন / Print poster** button pair; poster is never the only way to get the QR.

---

### 3.23 Dashboard shell and navigation

| Breakpoint | Navigation |
|---|---|
| <768 px | sticky header (brand + page status pill + new-claims badge + avatar menu) and a 4-item horizontal nav below it: **বার্তা · প্রোফাইল · পেমেন্ট · সেটিংস** (icon 20 px + label 12 px, 48 px tall rows, `aria-current`) |
| ≥1024 px | left sidebar `--sidebar-width` 232 px: brand, page status pill, nav list, spacer, **পেজ দেখুন** link, language toggle, log out (theme lives in Settings; the mobile avatar menu links there); content max `--layout-dashboard-max` |

- Active item: `--accent-soft` fill, `--accent-ink` text, 3 px accent left rule, 600 weight.
- The **new-claims badge** appears on **বার্তা** only, as a count pill (e.g. **3**) with sr-only **3টি নতুন বার্তা / 3 new messages**; clears per §3.24.
- "পেজ দেখুন" opens the public page in a new tab with sr-only new-tab note.
- Dashboard pages each have `h1` + one-line description and a max of two actions in the page header; everything else lives in the content.
- **A11y:** navigation is route links (not JS tabs) with `aria-current="page"`; skip link targets `#main`; sidebar is a `<nav aria-label="ড্যাশবোর্ড / Dashboard">`; focus order follows DOM (header → nav → main → footer); no keyboard traps.

---

### 3.24 Claims inbox (dashboard) — list, filters, actions

**Header:** h1 **সমর্থনের বার্তা / Support messages**, one-line description **স্ব-ঘোষিত বার্তা — ক্রিয়েটর নিশ্চিত না করা পর্যন্ত যাচাই করা নয়। / Self-reported messages — unverified unless you confirm them.**, actions: **শেয়ার করুন / Share** (secondary, opens share kit) and **পেজ দেখুন / View page** (ghost/link).

**Filters:** segmented row of route links: **সব (12) · স্ব-ঘোষিত (9) · নিশ্চিত (2) · লুকানো (1)**; counts are computed from the owner's claims; `aria-current` on the active filter; counts are also part of the link's accessible name; empty filter state per §3.16. Rejected claims appear only under **সব** with the read-only danger badge.

**Desktop (≥1024 px) table** with caption **স্ব-ঘোষিত বার্তা / Self-reported messages**:

| Amount | Supporter | Message | Method | Date | Status | Actions |
|---|---|---|---|---|---|---|
| ৳50 | একজন শুভানুধ্যায়ী | "ভিডিওটা…" (2-line clamp) | বিকাশ | 2 দিন আগে | [স্ব-ঘোষিত] | নিশ্চিত করেছি · দেখাবেন না · বিস্তারিত |
| ৳100 | রাফসান | — | ডেমো ব্যাংক | 5 দিন আগে | [ক্রিয়েটর নিশ্চিত করেছেন] | দেখাবেন না · বিস্তারিত |

**Mobile (<1024 px):** the same rows as claim cards (§3.10) with a two-button action row (44 px) and a **বিস্তারিত** disclosure holding TxID (copy field, mono), full timestamp, duplicate warning, method.

**Actions and feedback:**

- **নিশ্চিত করেছি / I've confirmed** — one tap; helper under the actions: **নিজের অ্যাপে মিলিয়ে নিশ্চিত করুন। / Check your app, then confirm.** Reversible (can hide later; restore resets to self-reported). On success: badge changes to **ক্রিয়েটর নিশ্চিত করেছেন**, toast **নিশ্চিত করা হয়েছে / Confirmed** + **ফিরিয়ে নিন / Undo** (5 s). No dialog — a needless confirm step on a reversible action is friction.
- **দেখাবেন না / Hide** — immediate; toast **লুকানো হয়েছে / Hidden** + **ফেরত আনুন / Undo** (5 s). Copy **এটি পেজ থেকে সরে যাবে, তবে রেকর্ডে থাকবে। / This will be removed from your page but kept in your records.** shown in the details region before the action, not in a dialog.
- **আবার দেখান / Show again** (hidden only) — restores to self-reported.
- **Duplicate-TxID warning** — inline amber note **এই TxID আগেও এসেছে। মিলিয়ে দেখুন। / This TxID has appeared before. Double-check.** Only when the server flags it; never blocks confirmation.
- **No actions** for rejected rows (read-only); support email link in the description: **আপত্তি থাকলে রিপোর্ট করুন / Report a problem**.
- **New-claims badge** clears when the inbox is opened (count reflects unseen by local timestamp in MVP — no server read receipts).

**A11y:** table has `<caption>`, `<th scope="col">`, amounts in `--font-num` with `tabular-nums` and right-aligned numeric column; row action accessible names include the amount and supporter ("৫০ টাকার বার্তা নিশ্চিত করুন"); status cells include the badge text; details disclosure is a real button with `aria-expanded`; focus stays on the action after a state change (the button label/visibility updates, then focus moves to the next remaining action or the card heading if the row disappeared); toast announces politely.

---

### 3.25 Payment methods manager (`/dashboard/payments`)

**Header:** h1 **পেমেন্ট তথ্য / Payment details**, description **আপনার QR/অ্যাকাউন্ট আপনার নিজের। চানাস্তা কখনো নিজের অ্যাকাউন্ট দেখায় না। / Your QR/account is your own. Chanasta never shows its own account.** (compliance G), primary **পদ্ধতি যোগ করুন / Add method**.

**Method row anatomy:** drag-handle → *no*; instead up/down 44 px buttons (accessible reorder) | provider + label | type + decode badge | masked account | enabled switch | **সম্পাদনা / Edit** | **মুছুন / Delete** (danger text button). Disabled rows are dimmed with a **নিষ্ক্রিয় / Disabled** neutral badge and stay visible for history. Max 8 rows; at the limit the add button is disabled with helper **সর্বোচ্চ ৮টি পদ্ধতি / Up to 8 methods**.

**Add/edit sheet content by kind**

| Field | QR method | Manual MFS | Bank | Other |
|---|---|---|---|---|
| Method kind | bKash / Nagad / Rocket / other QR | bKash / Nagad / Rocket | Bank | Other |
| Label (1–40) | ✓ e.g. **ব্যক্তিগত বিকাশ** | ✓ | ✓ e.g. **ডেমো ব্যাংক** | ✓ |
| QR payload paste (≤1024) | ✓ | — | — | ✓ optional |
| QR image upload | ✓ (decode with lazy-loaded jsqr; ≤2 MB; PNG/JPG/WebP) | — | — | ✓ optional |
| Account number | optional | ✓ | ✓ | ✓ optional |
| Account holder | optional | optional | ✓ | optional |
| Bank name / branch / routing (6–9 digits) | — | — | ✓ required | — |
| Enabled / sort order | ✓ | ✓ | ✓ | ✓ |

**Decode feedback (upload/paste):** idle → reading spinner → **QR পড়া হয়েছে — তথ্য যাচাই করা হয়েছে।** (if verified) / **QR সংরক্ষণ হয়েছে (অযাচাইকৃত)** / **QR-টি পড়া গেল না…** / **ছবিটি বড় হয়ে গেছে…** (§7.6) / **QR তৈরি করা যায়নি…**. The badge and next-step helper follow §3.8; never say the QR belongs to the creator — the decoded merchant name is shown so the creator can confirm it is theirs.

**Save flow:** sticky bottom action bar (**বাতিল / Cancel** + **সেভ করুন / Save**) `--z-sticky`, 72 px + safe area; unsaved-changes guard on navigation; success toast; failure inline in the bar; validation per §3.3.

**A11y:** enabled control is `role="switch"` with an accessible name including the method label; reorder buttons labelled **উপরে নিন / Move up** / **নিচে নামান / Move down** (disabled at ends); decode status is a polite live region; the sheet is a dialog (§3.20); file input has a visible label **QR ছবি আপলোড করুন / Upload QR image** and shows the accepted types.

---

### 3.26 Profile editor (`/dashboard/profile`)

**Header:** h1 **প্রোফাইল / Profile**, description **একটি নাম, এক লাইনের পরিচয়, আর একটি ইমোজি — এটুকুই যথেষ্ট। / A name, a one-line intro and an emoji — that's enough.** (brand-copy §7.7), actions: **প্রিভিউ দেখুন / Preview**, publish/unpublish control.

**Sections**

1. **Page link (slug):** read-only display `চানাস্তা.xyz/@demo-teacher` + **লিংক বদলান / Change link** (opens dialog; helper: lowercase English letters, numbers, hyphens, 3–30 chars; one change per 30 days; old link stops working). Availability feedback: checking / **এই লিংকটি ব্যবহার করা যাবে।** / **এই লিংকটি নেওয়া হয়ে গেছে।** / **এই লিংকটি ব্যবহার করা যায় না।** (§7.7).
2. **Identity:** avatar emoji picker (72 px preview) → display name (60) → tagline (80, single line) → bio (600, textarea with counter).
3. **Social links:** up to 6 from the allowlist (YouTube, Facebook, Instagram, TikTok, X, Threads, Telegram, LinkedIn, Website); dynamic rows with platform select + https URL; add/remove buttons; no email/phone fields (never collected publicly).
4. **Publish state:** draft/published status pill + explanation of what publishing does; unpublish opens a confirm dialog explaining the public link will 404 and can be re-published anytime. Publishing without an enabled method is blocked with §7.6 copy + link to payments.
5. **Preview:** desktop right column (sticky, Bangla/English toggle applies to preview only); mobile full-width preview card below the form.

**No goal fields are rendered** (Lead decision 5): no amount target, no progress, no "raised".

**States:** loading (inputs render disabled? no — render skeleton for values only), saved toast, unsaved sticky bar, validation errors, slug errors, publish blocked, save failure. Character counters use Latin digits (e.g. **42/60**).

**A11y:** sticky actions reachable; preview is `aria-hidden`? No — it is real content; duplicate ids avoided by prefixing preview ids (`preview-`); counters polite; publish/unpublish is a button with `aria-pressed` only if it toggles immediately — prefer an explicit label (**প্রকাশ করুন / Publish** ↔ **আনপাবলিশ করুন / Unpublish**).

---

### 3.27 Settings (`/dashboard/settings`)

| Section | Content | Notes |
|---|---|---|
| Appearance | Theme radio: **সিস্টেম / System · হালকা / Light · গাঢ় / Dark** (persists in `localStorage`; sets `data-theme`) | Language toggle stays in the header |
| Language | Same language control as the header (persists in `chanasta.lang`); a muted note explains that creator pages always open in Bangla by default and supporters can switch (Lead decision 11) | No per-creator default-language setting in MVP (the `default_locale` column is not surfaced) |
| Export | **বার্তা এক্সপোর্ট / Export messages** → dialog: date range (all / last 30 days / last 90 days), checkbox **TxID অন্তর্ভুক্ত করুন / Include TxID** (off by default) + helper **TxID শুধু আপনি দেখতে পাবেন। / TxID is only for you.**; generates CSV (no IP hash, no auth data) | CSV column warning: this file contains supporter names/messages |
| Session | Masked email of the logged-in account + **লগ আউট / Log out** | no password change (magic link only) |
| Legal | Terms, Privacy, How it works links | |
| Danger zone | **পেজ মুছুন / Delete page** (danger), §3.20 typed-slug confirm | copy: link closes immediately; content purged within 30 days; slug quarantined 90 days |
| Demo note | In demo/local mode: banner that nothing is saved to a server | |

**States:** export preparing (button loading + status), export success (toast + download), export error, delete confirmation, deleted (redirect to `/` with toast **পেজ মুছে ফেলা হয়েছে / Page deleted**). Suspended owner sees the suspension banner at the top of every dashboard page (read-only actions where relevant): **আপনার পেজটি আপাতত বন্ধ আছে। বিস্তারিত জানতে যোগাযোগ করুন। / Your page is currently unavailable. Contact us for details.** (§7.6).

**A11y:** danger zone is a labelled `<section>`; destructive button not first in tab order; dialog confirmation; theme radio is a native radio group with fieldset/legend; no "are you sure" inline buttons that look identical to safe ones.

---

### 3.28 Avatar (emoji only) + picker

- **Avatar:** one emoji on `--avatar-bg` circle; sizes 40 (embed/header), 56 (creator page mobile/desktop identity), 72 (profile editor), 96 (landing demo cards/poster print ~19 mm). Rendered as text with `--font-emoji`, `aria-hidden` when the name is adjacent, otherwise `role="img"` + sr-only name.
- **Constraint:** single grapheme cluster; no uploads, no URL avatars in MVP (data-model keeps `avatar_url` for later); no initials fallback needed because emoji is stored.
- **Picker:** sheet with a 6-column grid of 24 curated emojis (☕ 🍵 🫖 📚 ✍️ 🎨 🎧 🎬 🧑‍🏫 🌿 🪷 🐈 🎸 📷 🧑‍💻 🎙️ 🍰 🥟 🌙 ⭐ 🌻 🦋 🎓 💡), 44×44 cells, current selection ringed with 2 px accent, `role="radiogroup"` + arrow keys, each cell `aria-label` in Bangla (e.g. **চায়ের কাপ**, **বই**, **শিক্ষক**), live preview at 72 px, **সেভ করুন / Save** applies. No free-text emoji input in MVP (validation is hard to explain); the default ☕ is always safe.

---

### 3.29 Status pills, dividers, icons and decorative primitives

- **Page status pill** (dashboard header, not interactive): Published = jade soft **প্রকাশিত / Published**; Draft = neutral **খসড়া / Draft**; Suspended = danger soft **বন্ধ / Unavailable**. Never colour-only.
- **New dot:** 8 px amber dot + sr-only **নতুন / New** (dashboard rows), never the only indicator.
- **Divider:** 1 px `--line`; 3 px `--accent` for the disclosure strip; no heavy `<hr>` styling.
- **Icons:** one inline SVG sprite (≤ 6 KB) with ~16 icons: copy, eye, eye-off, download, share, check-circle, check, info, warning-triangle, x, plus, arrow-up/down/right, chevron-down, globe, trash, edit, image, spinner. 20 px default / 24 px in nav / 18 px in buttons. Stroke 1.75 px, `stroke-linecap: round`, currentColor, `aria-hidden="true"` unless the icon is the only content (then the control carries an aria-label).
- **Steam line:** decorative inline SVG ≤ 1.2 KB, `aria-hidden="true"`, used at 24–32 px next to the wordmark, in empty states, landing hero and poster; opacity-only animation ≤ 320 ms; hidden under `prefers-reduced-motion`; never load-bearing for meaning.
- **Skip link:** first focusable element on every page; visually hidden until focus; `--skip-link-*` tokens; text **মূল অংশে যান / Skip to content**; targets `#main`; Escape/activate moves focus.

---

## 4. Page-by-page specifications

### 4.0 Route and state matrix

Canonical creator URL is **`/@:slug`** (Lead decision 2). Static hosts without path rewrites fall back to `#/@slug` (and `?c=slug`, per [architecture.md §2](./architecture.md)); the design is identical. Every page is Bangla by default with a visible English toggle; every page ships a skip link, a focus-visible system, and the global footer links except the embed.

| Route | Who | Data | JS budget (gz) | States that must exist |
|---|---|---|---|---|
| `/` | everyone | static + demo fixtures | ≤ 120 KB (engine lazy after interaction) | default, demo mode banner, landing performance fallback (no JS) |
| `/@:slug` | supporter | `public_*` views or demo fixtures | 80 KB target / 150 KB decision cap (**≤ 96 KB cold** to meet the 250 KB total — §8.1) | loading, published, draft (owner preview), suspended, not-found, no methods, no claims, offline/error, rate-limited claim |
| `/@:slug/thanks` | supporter | claim summary from sessionStorage | ≤ 70 KB | success, missing/expired context, reduced-motion |
| `/onboarding` | creator | Supabase (or local demo) | ≤ 160 KB (includes lazy jsqr on upload) | auth required, 4 steps, slug checking/taken/reserved, decode states, save failed, publish blocked, demo mode |
| `/login` | creator | Supabase auth | ≤ 40 KB | default, submitting, sent, expired, rate-limited, demo mode (auth disabled notice) |
| `/dashboard` | owner | own claims | ≤ 160 KB (Supabase client lazy) | loading, empty, filters, new badge, error, suspended notice |
| `/dashboard/profile` | owner | own creator row | ≤ 150 KB | loading, saved, unsaved, validation, slug errors, publish blocked, suspended |
| `/dashboard/payments` | owner | own methods | ≤ 170 KB (jsqr lazy) | empty, limit, add/edit sheet, decode states, save error, suspended |
| `/dashboard/settings` | owner | own account | ≤ 120 KB | default, export, delete confirm, deleted, suspended |
| `/embed/@:slug` | site owner | public creator | ≤ 45 KB | default, demo, no methods, loading, dark, `?lang=`, no-JS fallback |
| `/legal/how-it-works` · `/legal/terms` · `/legal/privacy` | everyone | static text | ≤ 35 KB | default, draft-review banner, `lang=en` |
| `*` (404) | everyone | — | ≤ 30 KB | default |
| `/dashboard/*` while signed out | — | — | — | redirect to `/login?next=…` with a toast (§7.6 generic) |

All routes: `<title>` / meta description in the active language; `lang` attribute switched; no tracking scripts; no third-party embeds; no client-side analytics library. Dynamic routes render a **shared page shell instantly** (header, skip link, footer) and only skeleton the data regions, so perceived load is immediate on 3G.

---

### 4.1 `/` — landing

**Goal:** in one screen, explain *what Chanasta is and what it never does*, then let the visitor try a real demo page or start creating theirs. Social proof is the **demo pages themselves**, not invented numbers.

**Above the fold (mobile 360 px):**

```
┌────────────────────────────────────┐
│ ⓘ ডেমো মোড — সব পেজ, টাকা আর বার্তা  │ ← demo mode only, 36px brass strip
│   নমুনা। এখানে কোনো আসল টাকা যায় না। │
├────────────────────────────────────┤
│ চানাস্তা                    [English]│ ← header 56px
├────────────────────────────────────┤
│ এক কাপ চা, অনেক ভালোবাসা।            │ ← display 32–40px, 700
│ আপনার টাকা, সোজা তাঁর কাছে।          │ ← tagline #2, 20–24px, 600
│ এক লিংকেই নিজের বিকাশ QR আর           │
│ পেমেন্ট তথ্য দিন — টাকা সোজা          │
│ আপনার অ্যাকাউন্টে যাবে।               │
│ [     পেজ খুলুন     ]                │ ← primary, full-width
│ [   ডেমো পেজ দেখুন   ]               │ ← secondary, full-width
│ চানাস্তা কোনো পেমেন্ট প্রসেস করে না।  │ ← 14px honesty micro-line
│                                     │
│ ┌ ডেমো কার্ড (live) ─────────────┐   │
│ │ ☕ ডেমো শিক্ষক   [ডেমো]          │   │
│ │ ফ্রি ম্যাথ ক্লাস — ভালো লাগলে…    │   │
│ │ ┌─────────┐   [৳20][৳50]        │   │
│ │ │  QR     │   [৳100][ইচ্ছেমতো]  │   │
│ │ └─────────┘                     │   │
│ │ [চা খাওয়ান →]  টাকা সোজা …       │   │
│ └────────────────────────────────┘   │
└────────────────────────────────────┘
```

**Sections in order** (mobile then desktop; desktop uses a 2-col hero with the demo card right):

1. Demo-mode banner (only when running without Supabase or on demo fixtures). Dismiss is **not** allowed — it is honesty, not a cookie notice.
2. Header (§3.14).
3. Hero: tagline #1 + positioning #2 + one plain-language paragraph + primary **পেজ খুলুন** (link styled as primary) + secondary **ডেমো পেজ দেখুন** (→ `/@demo-teacher`) + honesty micro-line (compliance A shortened to one line: **টাকা সোজা ক্রিয়েটরের অ্যাকাউন্টে যায়; চানাস্তা টাকা রাখে না। / Money goes straight to the creator; Chanasta holds none.**). Visual: the live demo card (§4.1.1), not a stock illustration.
4. **কীভাবে কাজ করে / How it works** — three steps with the money-path diagram: *১. ক্রিয়েটরের পেজ খুলুন · ২. নিজের bKash বা বাংলা QR অ্যাপে স্ক্যান করুন · ৩. টাকা সোজা ক্রিয়েটরের অ্যাকাউন্টে যায়* and the line **চানাস্তা মাঝখানে নেই। / Chanasta is not in between.** The diagram is three labelled boxes with the provider→creator arrow; Chanasta sits *outside* the arrow with a dashed "no connection" line (same idea as compliance §2, text alternative provided).
5. **ক্রিয়েটরদের জন্য / For creators** — one link, your own account, no cut, Bangla-first, embeddable; feature bullets are 14–16 px with 20 px icons, not cards-on-cards. CTA repeated **পেজ খুলুন**.
6. **কোন উপায়ে পাঠানো যায়? / Ways to send** — honest provider matrix (no logos):

| Method row | Public label | Detail |
|---|---|---|
| bKash Bangla QR | **যাচাই করা বাংলা QR · বিকাশ / Verified Bangla QR · bKash** | "QR data + checksum checked by our engine. Not a payment confirmation." |
| Nagad / Rocket / bank Bangla QR | **অযাচাইকৃত / Unverified** | "Planned; double-check the name and number." |
| bKash / Nagad / Rocket number, bank account | **শুধু নম্বর / Number only** | "Formatted check only; creator confirms nothing automatically." |

   Under the matrix: **ব্যক্তিগত ও ব্যবসায়িক ব্যবহারের নিয়ম আপনার প্রোভাইডারের বর্তমান শর্তে দেখুন। / Check your provider's current terms for personal vs business use.**
7. **ডেমো পেজ / Demo pages** — three cards: `@demo-teacher`, `@demo-artist`, `@demo-writer`, each with emoji, name, tagline, **ডেমো / DEMO** badge, and "পেজ দেখুন". Synthetic data only (§9.4).
8. **আপনার সাইটে বসান / Embed it** — 2-col: iframe snippet (mono, copy button) + a live embed preview. **কোড কপি করুন / Copy code**.
9. **সাধারণ প্রশ্ন / Common questions** — exactly five, honest:
   - **চানাস্তা কি আমার টাকা নেয়? / Does Chanasta take my money?** → No; money goes straight to the creator; no fees on money, ever.
   - **তাহলে টাকা যায় কীভাবে? / How does the money move?** → Inside your own provider app to the creator's own account.
   - **পেমেন্ট সফল হয়েছে কীভাবে জানব? / How do I know the payment succeeded?** → Your provider app shows it; Chanasta cannot verify it. Claims are self-reported.
   - **কোন কোন মাধ্যমে পাঠানো যায়? / Which methods work?** → bKash Bangla QR is the verified decode today; Nagad/Rocket/bank are manual for now; check provider terms.
   - **আমার QR কীভাবে যোগ করব? / How do I add my QR?** → Create a page, paste the payload or upload a photo; the engine verifies the data.
10. Footer F block + H line + report + **Powered by deshiQR**.

**Primary CTA:** **পেজ খুলুন** (`/onboarding`; if signed out → `/login?next=/onboarding`). Secondary: **ডেমো পেজ দেখুন**.

**States:** default; demo mode (banner + demo fixtures); signed-in (header shows **ড্যাশবোর্ড** instead of login); offline (hero and copy still render; demo card shows retry); no-JS (hero copy + CTAs + links render server-side; the live demo card is replaced by a static screenshot-like `<svg>` QR for `@demo-teacher` with a link to the real demo page; embed snippet remains copyable via a `<textarea>` fallback).

**Must NOT appear:** provider logos, "10,000 creators", GMV/transfer counters, testimonials with invented names/amounts, "start earning", "instant payouts", "verified payment", "donate", card fields, checkout language, "secure", progress bars, `/explore` links, cookie banners, newsletter forms, chat widgets.

**SEO/meta:** title **চানাস্তা — এক কাপ চা, অনেক ভালোবাসা | Buy me a cha in Bangladesh**; description with the positioning line; OG image is a generated static card (creator-style, Bangla, honest line) — no raster screenshots of real data; canonical `/`; `hreflang` bn/en paired via `?lang=`.

#### 4.1.1 The live demo card (landing)

- It is a real, working mini version of the supporter card (same components, same tokens, demo data), **not** a screenshot: emoji avatar, name, tagline, amount chips, QR (pre-rendered inline SVG for the default synthetic demo payload at build time — no JS needed for first paint; the engine chunk loads lazily on the first chip interaction and re-renders the amount-bearing payload), decode badge, one-line honesty, CTA **চা খাওয়ান**.
- Tapping a chip re-renders the QR with a **lossless amount-bearing payload** derived from the creator's own payload (`withAmount(base, amount)` per [architecture.md §5](./architecture.md)) — account, name and tokens stay verbatim; only the amount field is added. **ইচ্ছেমতো** shows the creator's original static payload. This is still the creator's own QR, never a substituted account; a small helper states which amount is embedded (§9.3) and never claims the supporter's provider app will prefill it (that is unverified provider behavior).
- Tapping **চা খাওয়ান** opens `/@demo-teacher` (the full experience), never a fake success state.
- Performance: the default QR SVG is inlined at build time and is the LCP element — it must have explicit width/height/aspect-ratio and no animation; the post-interaction re-render is synchronous and never triggers a network request.

---

### 4.2 `/@:slug` — creator page (the product)

**Goal:** in one glance the supporter understands *who this is*, *how to send money in their own app to this person*, *that Chanasta is not holding it*, and *that they can leave a self-reported message afterwards*.

**Above the fold (mobile 360 px) — published, demo data:**

```
┌────────────────────────────────────┐
│ চানাস্তা                    [English]│
├────────────────────────────────────┤
│ ☕  ডেমো শিক্ষক  [ডেমো]              │ ← avatar 56 + identity line (16/600)
│     ফ্রি ম্যাথ ক্লাস — ভালো লাগলে এক  │ ← H1 27px/700 = creator tagline (2 lines)
│     কাপ চা খাওয়ান।                  │
│     ভালো লাগলে এক কাপ চা খাওয়াতে     │ ← brand-copy sub-line (14px)
│     পারেন। টাকা সোজা ডেমো শিক্ষক-এর   │
│     নিজের অ্যাকাউন্টে যায়।           │
│     সর্বশেষ হালনাগাদ: 1 নভেম্বর 2026 │ ← 12px muted
│                                    │
│ ┌ ⓘ নিজের অ্যাপ থেকে সরাসরি পাঠান।  ┐│ ← disclosure strip B
│ │ পাঠানোর আগে নাম ও নম্বর মিলিয়ে নিন।││
│ └──────────────────────────────────┘│
│                                    │
│ কতটা পাঠাতে চান?                    │ ← h2 20px
│ দাম নয় — যতটা ইচ্ছা।                │
│ ┌──────────────┐ ┌──────────────┐  │
│ │ ৳20       ✓  │ │ ৳50          │  │ ← 2×2 chips, ৳20 selected
│ │ এক কাপ চা     │ │ এক প্লেট নাস্তা│  │
│ └──────────────┘ └──────────────┘  │
│ ┌──────────────┐ ┌──────────────┐  │
│ │ ৳100         │ │ ইচ্ছেমতো      │  │
│ │ খাবার         │ │              │  │
│ └──────────────┘ └──────────────┘  │
│                                    │
│ [        চা খাওয়ান  ↓        ]     │ ← scrolls + focuses QR panel
│                                    │
│ কীভাবে পাঠাবেন                      │
│ ১. বিকাশ বা আপনার বাংলা QR অ্যাপ…    │
│ ২. নিচের QR স্ক্যান করুন — অথবা…     │
│ ৩. যতটা ইচ্ছা পাঠান — টাকা সোজা…     │
│ ┌────────────────────────────────┐ │
│ │  ┌──────────────────────────┐  │ │
│ │  │      QR 264×264          │  │ │
│ │  └──────────────────────────┘  │ │
│ │  [✓ যাচাই করা বাংলা QR · বিকাশ] │ │
│ │  DEMO STORE                    │ │
│ │  যাচাই করা মানে QR-এর তথ্য ঠিক  │ │
│ │  আছে — টাকা এসেছে এমন নয়।       │ │
│ │  [QR সেভ করুন]                  │ │
│ └────────────────────────────────┘ │
│ 01000•••000            [কপি] [👁]  │
│ পাঠানোর আগে নাম ও নম্বর মিলিয়ে নিন। │
│ ▸ অন্য উপায়ে পাঠাতে চান?           │ ← only if >1 method
│                                    │
│ ┌ ⓘ পাঠিয়েছেন? জানিয়ে দিন         ┐│
│ │ এই বার্তা স্ব-ঘোষিত; চানাস্তা টাকা… ││
│ │ [    পাঠিয়েছেন? জানিয়ে দিন    ]  ││
│ └──────────────────────────────────┘│
│                                    │
│ স্ব-ঘোষিত সমর্থন                    │ ← h2 + E note
│ ক্রিয়েটর নিশ্চিত না করা পর্যন্ত…    │
│ ┌ ৳50 [স্ব-ঘোষিত]                 ┐ │
│ │ একজন শুভানুধ্যায়ী                 │ │
│ │ "ভিডিওটা পরীক্ষার আগে কাজে লেগেছে"│ │
│ │ বিকাশ · 2 দিন আগে                 │ │
│ └──────────────────────────────────┘ │
│ ┌ ৳100 [ক্রিয়েটর নিশ্চিত করেছেন]   ┐ │
│ │ রাফসান                           │ │
│ │ ডেমো ব্যাংক · 5 দিন আগে           │ │
│ └──────────────────────────────────┘ │
│ [ আরও বার্তা দেখুন ]                │ ← only if more than 12
├────────────────────────────────────┤
│ চানাস্তা কোনো পেমেন্ট প্রসেস করে না… │ ← footer A + fees + links
│ টাকার ওপর কোনো ফি নেই।               │
│ কীভাবে কাজ করে · শর্তাবলি · গোপনীয়তা│
│ রিপোর্ট করুন · Powered by deshiQR    │
└────────────────────────────────────┘
```

**Desktop ≥1024 px:** two columns inside `--layout-supporter-max` (1088 px):

```
┌────────────────────────────────────────────────────────────────────┐
│ header                                                             │
├────────────────────────────────────────────────────────────────────┤
│  ┌ identity + bio + strip ────────────┐  ┌ sticky support card ────┐│
│  │ ☕ ডেমো শিক্ষক                     │  │ কতটা পাঠাতে চান?         ││
│  │ tagline · sub-line · last updated  │  │ [৳20][৳50][৳100][ইচ্ছেমতো]││
│  │ [disclosure strip B]               │  │ [চা খাওয়ান ↓]           ││
│  │                                     │  │ কীভাবে পাঠাবেন           ││
│  │ স্ব-ঘোষিত সমর্থন                    │  │ QR + steps + copy   ││
│  │ [claim cards — 2-col grid]          │  │ [পাঠিয়েছেন? জানিয়ে দিন] ││
│  └─────────────────────────────────────┘  └─────────────────────────┘│
│        left column 600px                         right 400px (sticky)│
├────────────────────────────────────────────────────────────────────┤
│ footer                                                             │
└────────────────────────────────────────────────────────────────────┘
```

The right support card is `position: sticky; top: 88px; --z-sticky`; it never exceeds the viewport, and if its content is taller than the viewport it scrolls internally **without** hiding the QR at rest. The claim form opens inline inside the sticky column (scrolls the page there); the public claim list stays in the left column.

**States**

| State | What renders |
|---|---|
| loading | page shell + identity skeleton (avatar, 2 text lines) + QR plate skeleton + claim card skeletons; honesty strip renders immediately (never skeletoned) |
| published | full page above |
| draft — owner preview | a brass banner above the identity: **খসড়া প্রিভিউ — পেজটি এখনো পাবলিক নয়। / Draft preview — this page is not public yet.** + **প্রকাশ করুন / Publish** link to dashboard; the public URL returns 404 to everyone else |
| suspended | full-page state, no QR/account/claims rendered: **এই পেজটি আপাতত বন্ধ আছে। / This page is currently unavailable.** + **হোমে ফিরুন** + **রিপোর্ট করুন**; HTTP status 410 (or 404 on static hosts), `<meta name="robots" content="noindex">` |
| not-found | 404 state (§4.12) — no partial data ever flashes |
| no enabled methods | identity + strip + amount section **without a QR**: method card shell with §7.6 copy **ক্রিয়েটর এখনো কোনো পেমেন্ট তথ্য যোগ করেননি। / The creator hasn't added payment details yet.** + first-claim CTA short-circuits to the same message; no disabled buttons |
| no claims | empty claim state (§3.16) with **পাঠিয়েছেন? জানিয়ে দিন** |
| error / offline | identity still renders if cached; data region shows §7.6 error + **আবার চেষ্টা করুন**; no fake content |
| claim rate-limited | inline amber banner in the claim form; page intact |
| language = en | every string switches sibling-style; layout must be re-tested at 360 px (English is shorter here except buttons) |
| dark | all surfaces dark; QR plate stays white; strip uses dark accent-soft |

**Content order (fixed):** identity line (avatar + display name + demo badge) → H1 (creator tagline if set, otherwise the brand-copy H1 `{name}-কে এক কাপ চা খাওয়ান`) → sub-line → last-updated → disclosure strip B → amount ladder → primary **চা খাওয়ান** (scroll/focus) → **কীভাবে পাঠাবেন** steps → primary method card (QR + copy) → other methods accordion → claim CTA/form → claim list (E note) → footer A. On desktop the order inside the sticky column is: amount ladder → CTA → payment methods → claim form.

**Primary CTA:** **চা খাওয়ান** — an in-page action that scrolls to and focuses the payment panel (`href="#pay"` for no-JS, JS enhances with focus management). It never opens a payment app, never claims to send money, and is never labelled "Pay".

**Rules**

- The amount chips drive the claim-form prefill **and** a lossless amount-bearing QR re-render (§4.1.1, architecture §5): `withAmount(base, amount)` keeps the creator's account/name/tokens verbatim and adds only the amount; **ইচ্ছেমতো** shows the original static payload. Never substitute an account, never claim the provider app will prefill the amount, and keep the decoded merchant name beside the QR so the supporter can compare it.
- One public claim list shows at most 12 cards, then **আরও বার্তা দেখুন / See more messages** (loads the next page; no infinite scroll; `aria-live` on the appended region).
- The page has exactly **one H1**: the creator's tagline if set, otherwise the brand-copy H1 pattern `{name}-কে এক কাপ চা খাওয়ান` / `Buy {name} a cup of cha`. The display name is an identity line (`<p>`, 16 px/600) next to the avatar — never a second heading.
- The page is a complete, honest screenshot: identity + one QR + honesty line + `/@slug` fits in one phone screen with the QR just below the fold.

**Must NOT appear:** any provider logo or brand colour; a "verified creator" badge (no identity program); "verified payment"/"payment successful"/"paid" states; a goal/progress bar; totals of money ("raised ৳X"); a countdown; "limited time"; a modal on load; a language selector inside the identity block; a share bar covering the QR; a chat bubble; "secure checkout"; automatic redirect to a payment app; any input that asks for the supporter's bKash PIN/OTP/bank credentials (never collected anywhere).

---

### 4.3 `/@:slug/thanks` — claim confirmation

**Goal:** thank the supporter for the *message*, show exactly what was submitted with the self-reported badge, and set expectations honestly: the creator will see the message; Chanasta does not verify the money. Then invite a share.

**Wireframe (mobile):**

```
┌────────────────────────────────────┐
│ চানাস্তা                    [English]│
├────────────────────────────────────┤
│              ☕                     │ ← 48px emoji/steam
│         ধন্যবাদ!                    │ ← H1 28px 700
│ আপনার বার্তা ক্রিয়েটর দেখতে পাবেন।   │ ← brand-copy success body (2–3 lines)
│ টাকার বিষয়টি চানাস্তা যাচাই করে না —  │
│ ক্রিয়েটর নিজে দেখে নিশ্চিত করবেন।     │
│                                    │
│ ┌ আপনার বার্তা ───────────────────┐ │
│ │ ৳50           [স্ব-ঘোষিত]        │ │ ← the claim as submitted, badge
│ │ ডেমো শিক্ষককে                   │ │
│ │ "ভিডিওটা পরীক্ষার আগে কাজে..."    │ │
│ │ বিকাশ                            │ │
│ └─────────────────────────────────┘ │
│                                    │
│ [     পেজটি শেয়ার করুন     ]        │ ← primary (copy link)
│ [     পেজে ফিরুন          ]         │ ← secondary
│                                    │
│ এটি কোনো রসিদ বা পেমেন্ট নিশ্চিতকরণ  │ ← new honesty line §9.3
│ নয়।                                 │
├────────────────────────────────────┤
│ footer strip A · links              │
└────────────────────────────────────┘
```

**States**

- **success** — claim summary exists in `sessionStorage` (id, amount, name, method, message, status `unverified`, created_at); render as above. The badge is always **স্ব-ঘোষিত / Self-reported**; never "pending confirmation".
- **missing/expired context** (direct visit, refresh with cleared storage, link shared) — render a neutral state: **আপনার বার্তা দেখানো যাচ্ছে না, তবে ধন্যবাদ। / We can't show your message here, but thank you.** + **পেজে ফিরুন** + the same honesty paragraph. Never invent a claim; never 404 the route.
- **reduced motion** — no confetti/celebration animation at all (it would also imply success of money). The only motion is the standard entrance.
- **share** — copies the creator page link (toast **লিংক কপি হয়েছে / Link copied**); no third-party share SDK, no logos; optionally plain `wa.me`/Facebook URL links labelled in text (no SDKs, no pixels).
- **no navigation auto-redirect**; the page is shareable and refresh-safe by design (it never leaks another supporter's claim).

**Must NOT appear:** "payment successful", "we'll inform the creator", "verified", "receipt", "refund", "your support was received", confetti implying money arrived, a claim edit form (claims are immutable in MVP), a checkmark that reads as payment confirmation.

---

### 4.4 `/onboarding` — first page in under 5 minutes

**Goal:** signed-in creator publishes a page with at least one payment method in four short steps, without a payment-method approval queue and without needing to understand the system.

**Shell:** dashboard-style header (no public nav) + 4-checkpoint progress indicator (**লিংক → পেমেন্ট → প্রোফাইল → প্রকাশ**; [architecture.md §2](./architecture.md) calls it a 3-step wizard — the progress indicator is not load-bearing, and profile + preview may merge into one screen if implementation needs it) using an ordered list, current step with `aria-current="step"`, 44 px rows; **সংরক্ষণ / Save** persists each step as a draft automatically (debounced) and the creator can leave/resume. Desktop ≥ 1024 px is 2-column: form left (max 544 px), sticky live preview right (the actual supporter-page components at 1:1 scale, with the Bangla/English toggle applying to the preview). Mobile: form only + a **প্রিভিউ / Preview** button that opens the preview as a full-screen sheet.

**Step transitions:** on **পরের ধাপে যান / পিছনে**, move focus to the new step's `<h2>` (or the step heading with `tabindex="-1"`), announce **ধাপ {n} / {total}** through the same polite status region, and keep the progress indicator updated (`aria-current="step"`). Never scroll to the top without moving focus, and never trap focus in a step.

**Step 0 — welcome (optional, only before step 1):** **চানাস্তায় স্বাগতম / Welcome to Chanasta**, intro **মাত্র ৩ মিনিটে আপনার পেজ তৈরি করুন। টাকা সরাসরি আপনার নিজের অ্যাকাউন্টে যাবে। / Set up your page in 3 minutes. Money goes straight to your own account.** + **শুরু করুন / Get started**; compliance G note below; exit to dashboard.

**Step 1 — page link (slug)**

```
ধাপ ১ / ৪ · আপনার পেজের লিংক
চানাস্তা.xyz/@ ┌──────────────────┐
               │ demo-teacher     │  ← input with @ prefix
               └──────────────────┘
ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন — ৩ থেকে ৩০ অক্ষর।
[✓ এই লিংকটি ব্যবহার করা যাবে।]      ← or taken/reserved/checking
[      পরের ধাপে যান  →      ]
```

- Availability check debounced 400 ms with a polite status (**দেখা হচ্ছে… / Checking…** → available/taken/reserved). Never reveal *why* a slug is unavailable beyond the three brand-copy messages. Validate client-side first (format) then server.
- Suggested slug is derived from the display name (transliterated? no — offer `@demo-teacher`-style suggestions only from existing ASCII input; do not invent Bangla transliteration). Show the full URL with the domain.
- **Next** disabled until valid + available; helper explains why.

**Step 2 — payment details** (the trust-critical step)

```
ধাপ ২ / ৪ · আপনার পেমেন্ট তথ্য দিন
আপনার QR আপনার নিজের — চানাস্তা কখনো নিজের অ্যাকাউন্ট দেখায় না। (G)

[ QR পেস্ট করুন ] [ QR ছবি আপলোড করুন ] [ নম্বর দিয়ে যোগ করুন ]

── bKash Bangla QR ─────────────────────
┌ QR ড্রপ জোন (dashed, 44px+ target) ──┐
│ ড্র্যাগ করুন, বা ছবি বেছে নিন           │
│ PNG / JPG / WebP · সর্বোচ্চ 2MB         │
└───────────────────────────────────────┘
[ছবি থেকে QR পড়া হচ্ছে…]
[✓ QR পড়া হয়েছে — তথ্য যাচাই করা হয়েছে।]
      DEMO STORE · যাচাই করা বাংলা QR · বিকাশ
      এই QR-টি আপনার? নাম মিলিয়ে নিন।
[  পেমেন্ট পদ্ধতি সেভ করুন  ]

অথবা — [বিকাশ নম্বর] [নগদ] [রকেট] [ব্যাংক] [অন্য কিছু]
```

- Three entry paths as tabs/segmented control: **QR পেস্ট করুন / QR ছবি আপলোড করুন / নম্বর দিয়ে যোগ করুন**. Default to upload on mobile (screenshot is the common path), paste on desktop.
- Decode states map exactly to §7.6 + §3.8; the preview shows the QR plate and badge live before saving; **the decoded merchant name is always shown so the creator confirms it is theirs**.
- Adding a manual number is always available and never blocked by a failed decode.
- At least one method must be enabled to leave the step (or save draft and continue later — publish is what's gated, not navigation).
- Compliance G note remains visible for the whole step.
- The creator can add up to 8 methods here or later in `/dashboard/payments`; this step requires only one.

**Step 3 — profile**

```
ধাপ ৩ / ৪ · পেজটি সাজান
[emoji 72px preview] [ইমোজি বদলান]
প্রদর্শিত নাম *      [ডেমো শিক্ষক            ]
এক লাইনের পরিচয়     [ফ্রি ম্যাথ ক্লাস — …    ] 80
পরিচিতি              [                     ] 600
সোশ্যাল লিংক (≤6)   [+ লিংক যোগ করুন]
[পিছনে]                          [প্রিভিউ দেখুন →]
```

- Name required (1–60); tagline/bio optional (defaults: tagline falls back to the default H1, bio hidden); emoji picker via sheet; socials optional (allowlist, https); **no goal UI**; no theme picker (MVP).
- Live preview updates on input (debounced 300 ms), including the honesty strip and footer.

**Step 4 — preview, publish, share kit**

```
ধাপ ৪ / ৪ · প্রকাশ করুন ও শেয়ার করুন
[ live preview — mobile card frame / desktop page frame ]
[✓ আপনার পেজ প্রস্তুত। প্রকাশ করলে লিংকটি সবার জন্য খুলবে।]
[      পেজ প্রকাশ করুন      ]            ← primary

── after publish ──
আপনার পেজ লাইভ!                       ← toast + banner
চানাস্তা.xyz/@demo-teacher             [লিংক কপি করুন]
শেয়ার করুন: WhatsApp · Facebook        ← plain text links, no logos
এমবেড: <iframe src="…/embed/@demo-teacher" title="…"></iframe>
       [কোড কপি করুন]
[ পোস্টার ডাউনলোড করুন ]  [ আমার পেজ দেখুন ]
```

- **পেজ প্রকাশ করুন** is enabled only if ≥1 enabled method (else §7.6 publish-blocked copy + link back to step 2). On success: **আপনার পেজ লাইভ! / Your page is live!** toast (§3.19), the share kit replaces the CTA area; the creator can go to the dashboard.
- Share kit: copy link (toast), creator share text (brand-copy §7.8) copied as a whole message (not just URL) for WhatsApp/Facebook, embed snippet with copy, poster download, "open my page".
- **Draft behaviour:** leaving before publish keeps the page as `draft`; the dashboard shows **খসড়া / Draft** and the preview banner; unpublishing later uses the same publish control.

**States:** signed-out → redirect to `/login?next=/onboarding`; loading (skeleton form values); step validation; slug checking/available/taken/reserved; decode idle/reading/verified/unverified/image-only/failed/too-large; save failed (inline retry, values preserved); publish blocked; auth expired; demo/local mode — a banner at the top: **ডেমো মোড — পেজ শুধু এই ব্রাউজারে থাকবে, সার্ভারে সেভ হবে না। / Demo mode — your page stays in this browser and is not saved to a server.** + the publish step still works locally and produces a shareable self-contained demo link.

**Primary CTA:** **পরের ধাপে যান** per step; final **পেজ প্রকাশ করুন**. Secondary: **প্রিভিউ দেখুন**, **পরে চালিয়ে যাব / Continue later** (saves draft, exits to dashboard).

**Must NOT appear:** a payment-method "approval" state, "verified creator", goal fields, theme/plan upsells, steps labelled payment/checkout, provider logos, a KYC/identity form, a required bio/socials, an email-verification wall beyond the magic link, "publish now or lose your page" pressure.

---

### 4.5 `/login` — magic link

**Goal:** one email field, one link, no password, no social login (Lead decisions / blueprint §8.3), and an honest explanation if something goes wrong.

**Wireframe (mobile):**

```
┌────────────────────────────────────┐
│ চানাস্তা                    [English]│
├────────────────────────────────────┤
│              ☕                     │
│         লগইন করুন                   │ ← H1 28px
│ ইমেইল দিন — আমরা একটি লগইন লিংক      │ ← intro §9.3
│ পাঠাব। পাসওয়ার্ড লাগবে না।           │
│                                    │
│ ইমেইল                              │
│ [you@example.com                ]   │
│ [        লগইন লিংক পাঠান        ]   │ ← primary, full-width
│                                    │
│ লিংক না পেলে স্প্যাম ফোল্ডার দেখুন।  │ ← §9.3, 14px muted
│                                    │
│ [পেজ তৈরি করতে ফিরে যান]            │ ← link to /
├────────────────────────────────────┤
│ footer legal links                  │
└────────────────────────────────────┘
```

**States**

| State | UI |
|---|---|
| default | email field (`type=email`, `autocomplete=email`, `inputmode=email`, required) + primary |
| submitting | button loading **পাঠানো হচ্ছে… / Sending…**, field read-only |
| sent | form replaced by a card: **ইমেইল পাঠানো হয়েছে / Check your email** + masked email + **আবার পাঠান / Resend** (60 s cooldown with an accessible countdown) + **অন্য ইমেইল দিন / Use a different email**; **লিংকটি কিছুক্ষণের জন্য কাজ করবে / The link works for a short while** (§9.3) |
| expired / invalid link | **এই লিংকটির মেয়াদ শেষ। আবার লিংক পাঠান। / This link has expired. Send a new one.** + return to form |
| rate-limited | §7.6 rate-limited copy, amber inline; no lockout countdown invented |
| offline | error with retry, email value preserved |
| demo / local mode | a note: **ডেমো মোডে লগইন ছাড়াই ড্যাশবোর্ড দেখা যায়। / In demo mode the dashboard opens without login.** + direct link; never fake a magic link |
| expired session on a dashboard route | redirect here with the generic error toast; `next` preserved in the query (validated allowlist: `/onboarding`, `/dashboard*`) |

**Primary CTA:** **লগইন লিংক পাঠান / Send login link**. **Must NOT appear:** password fields, "Sign in with Google/Facebook", a claim that an account was created, marketing, provider logos, CAPTCHA (rate limits are server-side), "we'll email you payment updates".

---

### 4.6 `/dashboard` — support messages inbox

**Goal:** the creator sees the newest self-reported messages, confirms the ones they can find in their own app, hides noise, and gets the share kit — in under 30 seconds on a phone.

**Mobile wireframe:**

```
┌────────────────────────────────────┐
│ চানাস্তা  [প্রকাশিত]       [3]  [👤]│ ← header: status pill + new badge
├────────────────────────────────────┤
│ বার্তা  প্রোফাইল  পেমেন্ট  সেটিংস     │ ← 4 route tabs, aria-current
├────────────────────────────────────┤
│ সমর্থনের বার্তা                     │ ← H1 22px
│ স্ব-ঘোষিত বার্তা — ক্রিয়েটর নিশ্চিত  │ ← E note
│ না করা পর্যন্ত যাচাই করা নয়।         │
│ [শেয়ার করুন]        [পেজ দেখুন]     │
│                                    │
│ [সব (12)] [স্ব-ঘোষিত (9)] [নিশ্চিত (2)] [লুকানো (1)] │ ← scrolls
│                                    │
│ ┌ ৳50  [স্ব-ঘোষিত]  ● নতুন          ┐│
│ │ একজন শুভানুধ্যায়ী                  ││
│ │ "ভিডিওটা পরীক্ষার আগে কাজে লেগেছে" ││
│ │ বিকাশ · 2 দিন আগে                  ││
│ │ [নিশ্চিত করেছি] [দেখাবেন না] [⋯]   ││
│ └────────────────────────────────────┘│
│ ┌ ৳100 [ক্রিয়েটর নিশ্চিত করেছেন]     ┐│
│ │ রাফসান · ডেমো ব্যাংক · 5 দিন আগে   ││
│ │ [দেখাবেন না] [⋯]                   ││
│ └────────────────────────────────────┘│
│ …                                   │
└────────────────────────────────────┘
```

**Desktop:** left sidebar (§3.23) + content: page header with title, description, and actions (**শেয়ার করুন**, **পেজ দেখুন**); filter row; table (§3.24) instead of cards; details disclosure expands into a row-attached panel (not a modal); content max `--layout-dashboard-max`.

**States:** loading (table/card skeletons, header instantly), empty (first-run state with share kit CTA — §3.16), empty filter, new badge, error + retry, suspended banner (page unavailable + contact), offline banner, rate-limited? (no), demo mode (local claims; a banner that data is local), no page yet (should not happen — onboarding creates it; fall back to **পেজ তৈরি করুন**).

**Primary CTA:** context-dependent — **নিশ্চিত করেছি** on the newest claim, or **শেয়ার করুন** when empty. **Must NOT appear:** money totals ("রিসিভড ৳X"), charts of support volume as money, "payments", "paid", any automatic confirmation, an admin link, a "reject" action (moderation only), a goal card.

**A11y:** page `h1`; filters are links with counts; new-claims badge count announced once on page load via a polite status region; table caption; row actions have contextual labels; toast announcements for confirm/hide/undo.

---

### 4.7 `/dashboard/profile`

**Goal:** edit identity safely, see the public page consequence live, publish/unpublish without surprises.

Layout per §3.26. Mobile: sections stacked, sticky save bar appears only when dirty (**বাতিল / Cancel** + **সেভ করুন / Save**); desktop: two columns with a live preview card.

**States:** loading values (skeleton over the fields is forbidden — render disabled fields until loaded, then enable, to avoid form reflow), dirty/saving/saved (**সেভ হয়েছে / Saved** toast), validation errors (per field + summary), slug check states, publish/unpublish confirmation, publish blocked (no method), suspended notice, save failure (bar turns danger, values kept), demo mode banner.

**Primary CTA:** **সেভ করুন** when dirty; publish/unpublish is a secondary but clearly labelled control with a confirmation. **Must NOT appear:** goal amount/note fields, "verified" toggle, theme/plan upsells, multi-page management, team members, danger zone (lives in settings), a live public URL until published (show the URL but mark **খসড়া** while draft).

---

### 4.8 `/dashboard/payments`

**Goal:** add, decode, verify-by-looking, reorder, enable/disable and delete payment methods with honest decode status; never let the creator think a method is "approved".

Layout per §3.25. Mobile: rows as cards with a full-width **সম্পাদনা** button; add button fixed at the end of the list; sheet for add/edit. Desktop: rows in a 2-line table-like list, actions right-aligned.

**States:** empty (add CTA — §3.16), at-limit (8) with disabled add + helper, add sheet open, edit sheet with existing QR, decode states (§7.6), save loading/success/error, delete confirm, suspended notice, publish-blocked hint when the last enabled method is disabled (§7.6 publish blocked copy), demo banner.

**Primary CTA:** **পদ্ধতি যোগ করুন** (empty) / **সম্পাদনা** per row (filled). **Must NOT appear:** provider logos, "connected account", "verify with bKash", an approval queue, per-transaction settings, a fee field, "merchant account" onboarding, QR status that the client can set.

**A11y:** enabled switch labelled with the method; reorder buttons included; decode status live region; unsaved-changes dialog; form errors summary.

---

### 4.9 `/dashboard/settings`

**Goal:** export claims, change appearance, sign out, and delete the page with full understanding of the consequences.

Layout per §3.27: stacked sections with `h2`s, max `--layout-form-max`; danger zone separated by a full-width 1px rule and a 14 px warning paragraph (not red-filled).

**States:** default, export dialog, export preparing/success/error, theme saved, delete confirm (typed slug), deleted (redirect `/` + toast **পেজ মুছে ফেলা হয়েছে / Page deleted**), suspended notice, demo mode (delete disabled with helper **ডেমো মোডে পেজ মুছবেন না / Page deletion is disabled in demo mode**).

**Must NOT appear:** notification preferences (no emails in MVP), plan/billing, API keys, data-sale settings, a "verify identity" upsell, a second account.

---

### 4.10 `/embed/@:slug`

Layout per §3.21. **States:** default, demo badge, no methods, loading skeleton (fixed height), dark (OS), `?theme=dark|light`, `?lang=en`, no-JS fallback (`<noscript>`: name + tagline + link).

**Performance:** this is the smallest surface (≤ 45 KB JS gzip): load no router, no dashboard code, no claim form, no i18n beyond the embed string set; pre-rendered inline SVG QR for the three demo creators, client-side encode for real creators; container queries (`@container` on the card) rather than media queries so the embed responds to the **iframe width**, not the browser width.

**Must NOT appear:** full bio, claim form, socials, provider logos, tracking, "Powered by" beyond the small deshiQR credit link, scroll-jacking, auto-height postMessage loops.

---

### 4.11 Legal pages — `/legal/how-it-works`, `/legal/terms`, `/legal/privacy`

**Goal:** the plain-language truth of the money path, and the documents a cautious supporter/creator needs to see exist.

**Shared layout:** prose column `--layout-prose-max` 640 px, `--leading-body` 1.8, h2 anchors with ids, a small in-page table of contents on desktop (sticky, 232 px) and a `<details>`-less plain list on mobile; last-updated line; back-to-home link; language toggle in the header; footer F block. On staging/demo, every legal page carries a visible brass **খসড়া — আইনি পর্যালোচনার অপেক্ষায় / Draft — pending legal review** banner (Lead decision 12; keep until counsel sign-off — see compliance §9 note about the production banner).

**`/legal/how-it-works` content order:**

1. H1 **টাকা কীভাবে যায় / How the money moves**.
2. The money-path diagram (three boxes: supporter's own app → provider network → creator's own account; Chanasta drawn outside the arrow with a dashed "not connected" line), with a full text alternative and an ordered-list version.
3. **চানাস্তা যা করে / What Chanasta does:** publishes the creator's page and payment info; carries self-reported messages.
4. **চানাস্তা যা করে না / What Chanasta does not do:** no holding, routing, confirming, refunding, no fees on money, no accounts, no card data (bullets from compliance §3, plain language).
5. **"যাচাই" মানে কী / What "verified" means:** data-level QR verification only; claims are self-reported; creator confirmation is manual.
6. **কেন QR স্ক্যানের আগে নাম মিলিয়ে নিতে হবে / Why check the name before scanning:** QR substitution and wrong-account risks, what to do.
7. Safety card: **অপরিচিত QR স্ক্যান করবেন না। নাম ও নম্বর মিলিয়ে নিন। / Don't scan unfamiliar QR codes. Verify the name and number.**
8. Links: Terms, Privacy, Report.

**`/legal/terms` and `/legal/privacy`:** layout only at this phase — section skeleton from compliance §11 with draft banner; **no invented legal claims**, no entity name/address invented; the Lead/counsel supply final text. Placeholder sections render as short plain-language summaries marked **খসড়া / Draft** — never lorem ipsum.

**States:** default, draft banner, `lang=en`, print (clean prose, no chrome), offline (static HTML so it still renders). **Must NOT appear:** fake legal entity details, jurisdiction claims, "we are a licensed PSP", refund policy language (we cannot refund), cookie wall.

---

### 4.12 404 and unknown routes

```
┌────────────────────────────────────┐
│ চানাস্তা                    [English]│
├────────────────────────────────────┤
│              🫖                     │ ← steam line / cup, aria-hidden
│ এই পেজটি খুঁজে পাওয়া যায়নি।         │ ← H1, brand-copy 7.6
│ লিংকটি ঠিক আছে কিনা দেখুন।           │
│                                    │
│ [ হোমে ফিরুন ]   [ ডেমো পেজ দেখুন ]  │
│                                    │
│ আপনি ক্রিয়েটর? [নিজের পেজ খুলুন]     │
├────────────────────────────────────┤
│ footer legal links                  │
└────────────────────────────────────┘
```

- Unknown slug, deleted page, quarantined slug and malformed route all render this state (deleted pages may use the suspended copy **এই পেজটি আপাতত বন্ধ আছে।** instead, to avoid implying a typo).
- Copy is brand-copy §7.6 404; English sibling.
- HTTP status on static hosts cannot be 404 for client routes — the Netlify/GH Pages fallback serves the app with 200; the document must still set `<meta name="robots" content="noindex">` on 404 states and update the title to **পেজ পাওয়া যায়নি — চানাস্তা / Page not found — Chanasta**.
- **Must NOT appear:** auto-redirect, search box (no search in MVP), suggested creators list (no discovery), a dead end.

---

## 5. Supporter flow UX

### 5.1 The flow and its tap budget

```
  [opens /@slug from bio / video / WhatsApp / embed]
        │
        │ 0 taps · honesty + identity visible; QR within one short scroll
        ▼
  selects amount (1 tap, pre-selected ৳20)
        │
        ▼
  leaves Chanasta ──► opens own bKash/Nagad/Rocket/bank app
        │              scans creator QR / copies number, sends money
        │              (this is the provider's app, not ours)
        ▼
  returns to the page
        │ 1 tap · "পাঠিয়েছেন? জানিয়ে দিন"
        ▼
  claim form (amount prefilled · optional name/message/txid · age ack · submit)
        │ 2 taps + typing
        ▼
  /@:slug/thanks  ──► optional share (1 tap)
```

| Action | Taps (mobile) | Notes |
|---|---|---|
| See the QR | **0** | selected amount + payment panel rendered on load; CTA only scrolls/focuses it. Never hide the QR behind a modal. |
| Change amount | 1 | four 56 px chips; custom amount opens a field below the grid |
| Copy the account number | 1 | copy button copies directly; reveal is optional |
| Open the claim form | 1 | inline section, no modal |
| Submit a claim | 2 (age checkbox + submit) + typing | amount prefilled, method preselected |
| Return to viewing the page | 0 | back button restores scroll position (no `scrollRestoration` hacks) |
| Claim after the money step | ≤ 3 taps + typing | this is the whole funnel |

**Rules:** no scroll-jacking; no interstitial; no modal on load; no forced share; no autoplay; no "are you still there" prompts. The amount choice is the only required decision before the provider app.

### 5.2 State machine (page + claim form)

| From | Event | To | UI/announcement |
|---|---|---|---|
| page loading | data ready | published / suspended / not-found / error | shell already visible; regions swap |
| published | amount chip selected | published (selected) | chip selected style + check; QR re-renders with the amount-bearing payload (ইচ্ছেমতো = static); claim amount prefilled; polite announcement |
| published | **ইচ্ছেমতো** selected | custom amount open | input focused, `aria-expanded` on chip group |
| published | **চা খাওয়ান** | payment panel focused | smooth scroll (instant under reduced motion), heading focus + sr-only "কীভাবে পাঠাবেন" |
| published | **রিপোর্ট করুন** | mailto opens | no in-page navigation |
| claim form closed | claim CTA | claim form open (inline) | heading focused, scroll into view; no dialog |
| claim form | submit (invalid) | form error state | error summary focused, `role="alert"` |
| claim form | submit (valid) | submitting | button `পাঠানো হচ্ছে…`, `aria-busy`; double submit blocked |
| submitting | success | `/@:slug/thanks` | H1 focused after navigation; success announced |
| submitting | rate limited | form + amber banner | banner announced via `role="alert"`; submit stays focusable |
| submitting | network error | form + error | values preserved; retry button focused on error region |
| submitting | duplicate soft flag | form + amber note | note announced; submission still succeeds |
| thank-you | direct visit / storage cleared | thank-you neutral state | no invented claim |
| page suspended mid-session | API returns suspended | full-page suspended state | no payment details left in the DOM |

### 5.3 Microcopy placement (reference, not duplication)

| Beat | Component | Copy key (`brand-copy.md`) | Language order |
|---|---|---|---|
| Creator identity | H1 / tagline | §7.1 H1 (creator tagline replaces it if set) | BN then EN (sibling) |
| Reassurance before money | sub-line under identity | §7.1 Sub-line | BN / EN |
| Honesty before the ladder | disclosure strip B | compliance B | BN / EN |
| Amount section | h2 + helper | §7.1 amount label + amount metaphor helper | BN / EN |
| Primary CTA | button | §7.1 primary CTA **চা খাওয়ান** | localized |
| How to send | steps 1–3 | §7.2 steps | BN / EN |
| QR context | badge + helper | §7.2 QR labels/helpers + compliance C | BN / EN |
| Copy number | copy field + toast | §7.2 copy + copy toast | localized |
| Other methods | accordion | §7.1 other-ways toggle | BN / EN |
| Claim invitation | disclosure strip | compliance D + §7.3 form title | BN / EN |
| Claim form | fields/labels/errors | §7.3 statuses + §7.6 errors | BN / EN |
| Claim success | thanks page | §7.3 success title/body/secondary | BN / EN |
| Claim list | h2 + E note + cards | §7.5 claim list header | BN / EN |
| Footer | strip/fees/legal/report | §7.5 trust lines + §7.9 legal | BN / EN |
| Any error | inline | §7.6 | BN / EN |

**Honesty beat checklist for the supporter page (all five must be visible without interacting):**
1. Sub-line: money goes straight to the creator's own account (§7.1).
2. Strip B: send directly from your own app; check name and number (compliance B).
3. Decode badge + C helper on every method (compliance C).
4. Claim intro D: self-reported message; Chanasta does not verify money (compliance D).
5. Footer A: Chanasta is not a payment processor — never holds, routes, refunds or confirms (compliance A).

Plus the no-fees line (§7.5) and the report link (§6.2). None of these may be collapsed, dismissed, or hidden behind a tap.

### 5.4 Return-from-provider UX

- The page keeps the selected amount in `sessionStorage` (never the URL) so the claim form is still prefilled after the supporter returns from bKash.
- When the document becomes visible again **and** an amount was selected, the claim CTA gets a one-time visual emphasis (secondary button becomes primary on next paint) — **no modal, no toast claiming we noticed anything**. We cannot know whether money moved; the UI must not pretend to.
- The claim CTA remains **পাঠিয়েছেন? জানিয়ে দিন / Sent it? Let them know** — a question, never an assertion.
- If the supporter never leaves the browser (in-app browser or desktop), the QR copy field and **QR সেভ করুন** are the fallbacks; helper text explains the QR can be saved and scanned from the gallery (§9.3).
- No forced app-deep-links: we never construct `bkash://` style links or prefill provider details; the supporter scans/copies in their own app.

### 5.5 Error handling matrix

| Failure | Where it shows | Copy (brand-copy §7.6 unless noted) | Recovery |
|---|---|---|---|
| Amount empty / 0 / non-numeric | under amount field | **৳1 থেকে শুরু / Starts at ৳1** + a clear range error (§9.3) | inline fix |
| Amount above cap | under amount field | **সর্বোচ্চ ৳100,000 পর্যন্ত / Up to ৳100,000** (§9.3) | inline fix |
| Method not selected | under select | native required | choose one |
| Age acknowledgment unchecked | under checkbox, `role="alert"` | §7.3 age line + §9.3 error | checkbox focused |
| Rate limited (server) | amber banner in form | §7.3 rate-limited | wait, retry; no lockout copy invented |
| Duplicate soft flag | amber note | §7.3 duplicate warning | submit anyway |
| Network/offline | inline error + sticky offline banner | §7.6 offline | retry; values preserved |
| Page suspended while open | full-page state | §7.4 suspended | home/report |
| Page deleted while open | 404 state | §7.6 404 | home |
| Creator removed all methods while open | payment area → no-methods state | §7.6 no methods | claim form also closes (nothing to claim against) |
| Claim form opened but creator has no methods | not shown at all | — | claim CTA absent; no dead button |
| QR cannot be displayed (engine error) | QR panel error state | §3.6 copy | number copy + save QR still available |
| Supporter cannot scan (no app / camera) | inline helper under QR | §9.3 **QR সেভ করে গ্যালারি থেকে স্ক্যান করুন…** | copy number path |
| JavaScript disabled | `<noscript>` block | §9.3 **QR দেখাতে জাভাস্ক্রিপ্ট দরকার…** + creator link | static account info where available |
| 3G timeout (> 10 s) | error state | §7.6 generic | **আবার চেষ্টা করুন** |

All errors: calm voice, no blame, no technical codes in the UI, always an action; errors never reference "your payment" (there is no payment on our side).

### 5.6 Entry points and variants

| Entry | Difference in UX |
|---|---|
| Bio/video link | default experience above |
| Embed card | compact; CTA opens the full page in a new tab; no claim form in the embed |
| Locked-amount link | one preselected chip + **নির্ধারিত / Suggested** helper; helper states that any amount can be sent (not enforcement); custom input hidden |
| `?lang=en` link | page starts in English; toggle shows **বাংলা**; default stays Bangla for everyone else |
| Self-contained demo link (`#p=…`) in demo mode | renders from the payload in the URL with a **ডেমো / DEMO** badge; claim form works locally and claims are stored in `localStorage` (`chanasta.local.claims`) only, with the demo banner visible |
| Returning supporter (same browser) | same page; no account, no "welcome back" tracking; only the amount preference may persist in `sessionStorage` for the session |

---

## 6. Trust & safety UX

### 6.1 The trust hierarchy (what we show instead of a badge)

MVP has **no identity verification program**, so the page must earn trust through what is actually true and checkable:

1. **The creator's own QR/account** displayed verbatim, with the decoded merchant name beside it.
2. **Decode status** (`verified` data / unverified / image-only / number only) — a data claim, labelled as such.
3. **Last updated** timestamp on methods.
4. **Disclosure strip + footer strip** on every creator page, in Bangla and English.
5. **Report link** on every page (footer, claim list context, error states, embed micro footer).
6. **Absence of invented signals**: no "official", no "partner", no "verified payment", no fake counts.

Unverified pages get **no scarlet badge** — absence of an identity badge is the honest default (brand-copy §7.4). Only if a future identity program ships would a **পরিচয় যাচাইকৃত / Identity-checked by Chanasta** badge appear, and it would never mean "payment verified".

### 6.2 Report route (the only abuse channel in MVP)

- **Target:** `mailto:hello2himel@proton.me` with a prefilled subject and body (Lead decision 13).
- **Prefilled subject:** `রিপোর্ট: /@[slug] — [BN page name]` (English variant `Report: /@[slug]`).
- **Prefilled body:** page URL, current language, a short prompt — **কী সমস্যা? (অনুগ্রহ করে সংক্ষেপে লিখুন): / What's wrong? (please describe briefly):** — and, on claim-context reports, the claim amount/date (never the TxID, which is private to the creator).
- **Placement:** creator-page footer (always), claim-list header area (when there are claims), claim card overflow menu (**রিপোর্ট করুন / Report** with claim context), suspended page, error states, embed micro footer, legal pages.
- **Wording:** **রিপোর্ট করুন / Report**; helper: **আমরা যত দ্রুত সম্ভব দেখব। সাধারণত 72 ঘণ্টার মধ্যে চেষ্টা করি, তবে এটি কোনো নিশ্চয়তা নয়। / We'll look as soon as we can. We aim for 72 hours but can't guarantee it.** Best-effort only — never promise a resolution.
- **No in-app report form, no ticket ID, no status page** (no admin tooling in MVP). The email is the honest statement of what exists.
- Reports never disclose the reporter to the creator.

### 6.3 Impersonation response

- **Detection/removal** happens via the service-role moderation runbook (no admin UI): the page status becomes `suspended`.
- **Public UX:** the creator page renders the suspended state — no identity, no QR, no account, no claims. Copy: **এই পেজটি আপাতত বন্ধ আছে। / This page is currently unavailable.** + **রিপোর্ট করুন** + home link.
- **Owner UX:** every dashboard page shows the suspended banner **আপনার পেজটি আপাতত বন্ধ আছে। বিস্তারিত জানতে যোগাযোগ করুন। / Your page is currently unavailable. Contact us for details.** Editing is read-only except settings contact/legal links.
- **No public accusation UI:** suspended pages do not say "this page was reported for impersonation" (unproven claims + defamation risk). The reason lives in the moderation runbook and the email thread.
- **Creator claiming a page/slug:** handled by the report email (human review), never by an in-app claim flow in MVP.
- The design never shows "this creator is unverified" as a warning; the report link is always available.

### 6.4 Suspended, deleted and quarantined pages

| State | Supporter sees | Owner sees | SEO |
|---|---|---|---|
| `suspended` | suspended page copy + report + home | read-only dashboard + banner | noindex |
| soft-deleted (`deleted_at`) | suspended copy (page is "currently unavailable") | dashboard hidden, redirect `/` with toast **পেজ মুছে ফেলা হয়েছে / Page deleted** | noindex; 404/410 semantics where possible |
| slug quarantined (90 days) | 404 copy | — | noindex |
| slug taken by another creator | normal page for the new owner | on change: error at slug change | — |
| draft (never published) | 404 copy (no partial render) | draft preview banner + publish action | noindex |

### 6.5 Claims: moderation states and suspicious claims

| State | Public card | Dashboard card | Actions available |
|---|---|---|---|
| `unverified` | visible, amber **স্ব-ঘোষিত** badge | normal + new dot | confirm, hide, details |
| `confirmed` | visible, jade **ক্রিয়েটর নিশ্চিত করেছেন** badge | confirmed, no new dot | hide (restore later resets to self-reported), details |
| `hidden` | not rendered at all | neutral **লুকানো** badge, muted | show again, details |
| `rejected` | not rendered at all | danger **মডারেশনে সরানো হয়েছে** badge, read-only | none; report link for appeals |

**Suspicious claim handling (creator):** details panel shows the duplicate-TxID warning (soft, never blocking) and the full timestamp; the creator decides. The UI never says a claim is "fake" or "fraud"; the creator hides and reports to the human inbox. **No automatic rejection, no automated confirmation, no reputation score, no supporter account to ban.**

**Supporter side:** a hidden claim silently disappears from the public list (no notification in MVP — decision 10). The claim list note **স্ব-ঘোষিত সমর্থন — ক্রিয়েটর নিশ্চিত না করা পর্যন্ত যাচাই করা নয়। / Self-reported support — unverified unless the creator confirms it.** stays visible with the list, so the list never implies a payment register.

**Abusive messages:** owner hides; report email for moderation; message max 280 chars; no DMs, no replies, no threading. Never render user text as HTML (plain text only, escaped); no link auto-linking in claims (avoid spam vectors); no images in claims.

### 6.6 TxID privacy UX

- **Never public**, never in the public view/API, never rendered on `/@slug`, in the embed, or on the thanks page.
- **Claim form:** optional field + helper **শুধু ক্রিয়েটর দেখতে পাবেন। কখনো পেজে দেখানো হয় না। / Only the creator can see this. It is never shown on the page.**
- **Dashboard:** TxID only inside the **বিস্তারিত / Details** disclosure as a copy field (mono, 14 px), with the same helper; duplicate warning near it.
- **Export:** TxID checkbox **off by default**; when included, the dialog and the toast warn **এই ফাইলে ব্যক্তিগত তথ্য আছে / This file contains private information**.
- **Retention copy:** in settings/privacy: TxID is deleted with the claim; no tax/receipt framing.

### 6.7 Charity/fundraising and prohibited content (no UI vocabulary)

- **No UI terms** for donations, funds, campaigns, causes, goals, progress-to-target, relief; the vocabulary is **সমর্থন / support**, **এক কাপ চা / a cup of cha** (brand-copy §5).
- If a page is reported for soliciting for a cause, moderation suspends it via the runbook (no category tag shown publicly).
- The report link is the entry point; the report email body includes a **কী ধরনের সমস্যা? / What kind of problem?** hint list: impersonation, spam/fake claims, charity/fundraising, harassment, wrong account/QR, other. This list exists only in the email template — not as an in-app taxonomy.
- Bio/tagline validation blocks the obvious banned terms and surfaces **এই শব্দটি এখানে ব্যবহার করা যাবে না। / This word can't be used here.** (§9.3) without lecturing; the longer policy lives in Terms/how-it-works.

### 6.8 Minors and safeguarding

- Creator ToS is 18+ (compliance §9); there is no age UI for creators beyond the Terms acceptance at signup (if the auth flow includes it — otherwise ToS link only; no invented checkbox).
- Supporter claims require the age acknowledgment line (§7.3) — visible, required, with a field-level error if unchecked.
- If a page is reported as a minor's, moderation removes it; no in-app age verification, no ID upload, no "report a minor" dedicated UI — the generic report email covers it.

### 6.9 Scam guidance (designed, not buried)

- **Inline:** every manual/unverified method carries **পাঠানোর আগে নাম ও নম্বর মিলিয়ে নিন। / Check the name and number before sending.**; every method group carries compliance C.
- **`/legal/how-it-works` safety card:** **অপরিচিত QR স্ক্যান করবেন না। নাম ও নম্বর মিলিয়ে নিন। / Don't scan unfamiliar QR codes. Verify the name and number.** plus "QR বদলে দেওয়া যেতে পারে / a QR can be swapped" explanation and what to do (stop, report, verify via the creator's own channels).
- **Suspended pages** never keep a QR/account visible.
- **No "secure"/"protected" language anywhere** — it would imply a guarantee we cannot make.
- **Provider apps are the source of truth:** copy tells supporters to check the recipient name in their own app before confirming; Chanasta's page cannot do that for them.

### 6.10 Rate limiting and spam UX

- Copy is calm (§7.3), never "you are blocked", no countdown invented, no CAPTCHA, no account requirement.
- The submit button re-enables after a delay; the form keeps values.
- Duplicate submissions are flagged softly; the UI never accuses the supporter.
- Server limits (5/hour, 20/day per IP hash; 100/day per creator) are documented in the privacy page in plain language: **বার্তা স্প্যাম ঠেকাতে সীমা আছে। / There are limits to prevent message spam.**

### 6.11 Trust copy audit (run before shipping any surface)

1. Grep every rendered string for the banned list in brand-copy §9 (donate/দান, tip/টিপ, guaranteed, verified payment, fund, campaign, wallet, balance, escrow, refund, payout, official, partner, secure, instant).
2. Every creator page has strip B + footer A + at least one decode-status label + the claim badge.
3. Every method has a last-updated date + the name/number check helper where applicable.
4. Every page with claims has the E note and no money totals.
5. Every page has a report link; every error has an action.
6. No UI string implies we know whether money moved.

---

## 7. Accessibility specification

### 7.1 Targets

- **WCAG 2.1 AA** is the floor for every surface (contrast, keyboard, focus, labels, errors, motion, reflow). WCAG 2.2 AA points that are cheap are also adopted (target size 44 px exceeds 2.5.8; focus not obscured; dragging movements avoided — reorder uses buttons, not drag).
- Touch targets ≥ **44×44 CSS px** (`--tap-min`); text inputs and primary buttons 48 px.
- Works at **320 px width**, **200% zoom**, **400% reflow**, with **text spacing overridden** (line-height 1.5×, letter-spacing 0.12em, word-spacing 0.16em) without clipping or horizontal scroll — except that Bangla letter-spacing overrides are explicitly not supported by shaping; the layout must still not break.
- Keyboard-only, screen-reader (NVDA + Firefox/Chrome, TalkBack + Chrome on Android, VoiceOver + Safari on iOS), voice control (labels match visible text), and Windows High Contrast must all complete the supporter flow.

### 7.2 Measured contrast (computed from the exact token values, WCAG relative-luminance formula)

**Light theme**

| Pair | Ratio | Requirement | Use |
|---|---|---|---|
| `--ink` on `--bg` | **15.31:1** | 4.5 text | body copy |
| `--ink` on `--surface` | **16.50:1** | 4.5 | card text |
| `--ink` on `--raised` | **13.71:1** | 4.5 | raised text |
| `--muted` on `--bg` | **5.78:1** | 4.5 | secondary text |
| `--muted` on `--surface` | **6.22:1** | 4.5 | meta on cards |
| `--muted` on `--raised` | **5.17:1** | 4.5 | meta on raised |
| `--on-accent` on `--accent` | **5.54:1** | 4.5 | primary button label |
| `--on-accent` on `--accent-hover` | **6.93:1** | 4.5 | primary hover |
| `--on-accent` on `--accent-active` | **8.41:1** | 4.5 | primary pressed |
| `--accent-ink` on `--accent-soft` | **6.58:1** | 4.5 | selected chip / link on soft |
| `--accent-ink` on `--bg` | **7.40:1** | 4.5 | links in prose |
| `--accent-ink` on `--surface` | **7.97:1** | 4.5 | links on cards |
| `--ink` on `--accent-soft` | **13.62:1** | 4.5 | disclosure strip text |
| `--muted` on `--accent-soft` | **5.14:1** | 4.5 | strip helper text |
| `--success` on `--success-soft` | **5.38:1** | 4.5 | creator-confirmed badge |
| `--success` on `--surface` | **6.44:1** | 4.5 | success text |
| `--warn` on `--warn-soft` | **6.40:1** | 4.5 | self-reported / demo badge |
| `--warn` on `--surface` | **7.41:1** | 4.5 | caution text |
| `--danger` on `--danger-soft` | **6.15:1** | 4.5 | error bubble |
| `--danger` on `--surface` | **7.49:1** | 4.5 | inline error text |
| `--button-danger-ink` on `--button-danger-bg` | **7.49:1** | 4.5 | delete button |
| `--focus` on `--bg` | **6.73:1** | 3 UI | focus ring, page |
| `--focus` on `--surface` | **7.24:1** | 3 UI | focus ring, cards |
| `--focus` on `--raised` | **6.02:1** | 3 UI | focus ring, raised |
| `--line-strong` on `--surface` | **3.36:1** | 3 UI | input border vs field bg |
| `--line-strong` on `--bg` | **3.11:1** | 3 UI | chip border vs page |
| `--qr-fg` on `--qr-bg` | **19.68:1** | 4.5 (7+ for QR robustness) | QR modules |
| `--badge-neutral-ink` on `--raised` | **6.22:1** | 4.5 | image-only/manual/hidden badge |
| `--line` on `--bg` | 1.34:1 | decorative | hairlines only — never a UI boundary |

**Dark theme**

| Pair | Ratio | Requirement | Use |
|---|---|---|---|
| `--ink` on `--bg` | **16.65:1** | 4.5 | body copy |
| `--ink` on `--surface` | **15.44:1** | 4.5 | card text |
| `--ink` on `--raised` | **13.75:1** | 4.5 | raised text |
| `--muted` on `--bg` | **9.15:1** | 4.5 | secondary text |
| `--muted` on `--surface` | **8.49:1** | 4.5 | meta on cards |
| `--muted` on `--raised` | **7.56:1** | 4.5 | meta on raised |
| `--on-accent` on `--accent` | **9.12:1** | 4.5 | primary button label on amber |
| `--on-accent` on `--accent-hover` | **10.80:1** | 4.5 | primary hover |
| `--on-accent` on `--accent-active` | **12.38:1** | 4.5 | primary pressed |
| `--accent-ink` on `--accent-soft` | **7.97:1** | 4.5 | selected chip / link on soft |
| `--accent-ink` on `--bg` | **11.07:1** | 4.5 | links in prose |
| `--accent-ink` on `--surface` | **10.26:1** | 4.5 | links on cards |
| `--ink` on `--accent-soft` | **11.99:1** | 4.5 | disclosure strip text |
| `--muted` on `--accent-soft` | **6.59:1** | 4.5 | strip helper text |
| `--success` on `--success-soft` | **8.15:1** | 4.5 | creator-confirmed badge |
| `--success` on `--surface` | **10.10:1** | 4.5 | success text |
| `--warn` on `--warn-soft` | **9.34:1** | 4.5 | self-reported / demo badge |
| `--warn` on `--surface` | **11.17:1** | 4.5 | caution text |
| `--danger` on `--danger-soft` | **7.72:1** | 4.5 | error bubble |
| `--danger` on `--surface` | **8.72:1** | 4.5 | inline error text |
| `--button-danger-ink` on `--button-danger-bg` | **4.86:1** | 4.5 | delete button — **tightest text pair; re-measure if `--danger-strong-dark` changes** |
| `--focus` on `--bg` | **11.90:1** | 3 UI | focus ring |
| `--focus` on `--surface` | **11.03:1** | 3 UI | focus ring |
| `--focus` on `--raised` | **9.83:1** | 3 UI | focus ring |
| `--line-strong` on `--surface` | **3.55:1** | 3 UI | input border vs field bg |
| `--line-strong` on `--bg` | **3.82:1** | 3 UI | chip/field boundary |
| `--qr-fg` on `--qr-bg` | **19.68:1** | 4.5+ | QR modules (unchanged in dark) |
| `--badge-neutral-ink` on `--raised` | **7.56:1** | 4.5 | neutral badges |

**Known non-issue:** `--line-strong` on `--raised` is 2.79:1 in light. `--raised` is never used as a *field* background and interactive borders are only drawn against `--surface` (3.36:1) or `--bg` (3.11:1). Do not place an input or chip directly on `--raised`.

Nothing ships with text below 4.5:1. Disabled controls are exempt from contrast (§1.4.3) but must still be distinguishable by more than opacity alone (label + `not-allowed` cursor + helper where useful).

### 7.3 Focus and keyboard

- **Ring:** `outline: var(--focus-ring); outline-offset: var(--focus-offset);` on `:focus-visible`. Never `outline: none`. Never animate the ring. For inputs the ring uses `outline-offset: 0` so it hugs the field. The offset keeps the ring on the page/card background (never on the accent fill), which is why the ring passes 6:1 even around the clay button.
- **Skip link** is the first tab stop on every page → `#main`; visible on focus, `--z-skip-link`.
- **Focus order** = visual order = DOM order: skip link → header (brand, nav, language toggle) → main content top-to-bottom → footer. No positive `tabindex`. No focusable decorative SVGs.
- **Page loads:** focus starts at the document, not auto-moved. After a client-side route change, move focus to the new `h1` (or the `main` container with `tabindex="-1"`) and announce the page title.
- **Creator page:** amount chips use a roving tabindex inside `role="radiogroup"` (←/→/↑/↓, Home/End, Space/Enter select); the CTA moves focus to the **কীভাবে পাঠাবেন** heading (`tabindex="-1"`) after scrolling; the claim CTA moves focus to the form heading; after submit success, focus goes to the thanks `h1`.
- **Dialogs/sheets (§3.20):** native `<dialog>` handles the trap; Esc closes; focus is restored to the invoking control; destructive dialogs focus **Cancel** first; background is inert; body scroll locked; no nested dialogs.
- **Forms:** error summary is `role="alert"`, receives focus on submit, and links to the first invalid field; field errors are linked via `aria-describedby` + `aria-invalid`; validate on blur/submit, not on every keystroke; character counters are polite, not chatty.
- **Toasts** never take focus; undo actions are reachable via Tab after the toast appears (toast inserted before the sticky footer in DOM order); Esc dismisses.
- **Tables:** real `<table>`, caption, `th scope`; sortable columns (none in MVP) would use `aria-sort`. On mobile the table becomes cards — DOM order and headings remain.
- **No keyboard traps**, no drag-only interactions (method reorder uses buttons), no hover-only controls, no double-click.

### 7.4 Screen-reader content

**Landmarks:** every page has one `<main id="main">`, a `<header>`, a `<footer>`; nav landmarks are labelled in the active language (**প্রধান / Primary**, **ড্যাশবোর্ড / Dashboard**). Creator page structure: identity `<section aria-labelledby="creator-name">` → payment `<section aria-labelledby="how-to-send">` → claim form `<section aria-labelledby="claim-form-title">` → claims list `<section aria-labelledby="claims-title">`.

**QR panel (the most important alt text in the product):**

```
role="img"
aria-label="ডেমো শিক্ষক-এর বিকাশ QR — যাচাই করা বাংলা QR, DEMO STORE।
QR-এ ৳50 বসানো আছে। স্ক্যান করে নিজের অ্যাপে টাকা পাঠান।"
```

- Build the label from live fields: `{creator display name}-এর {provider} QR — {decode status}, {decoded merchant name}। {QR-এ {amount} বসানো আছে। | }স্ক্যান করে নিজের অ্যাপে টাকা পাঠান।` — the amount clause is present only when an amount is embedded (ইচ্ছেমতো = omitted). EN sibling when `lang=en`.
- The account number is always present as text below the QR, so a non-visual user never depends on an image.
- Do **not** read the raw QR payload; it is opaque TLV data and unhelpful.

**Badges and statuses:** real text in the DOM, never icon-only. Public claim accessible name pattern: **"{status}: {amount spoken}, {name or 'একজন শুভানুধ্যায়ী'}, {relative date}, {method}"** e.g. `স্ব-ঘোষিত: পঞ্চাশ টাকা, একজন শুভানুধ্যায়ী, 2 দিন আগে, বিকাশ।` Decode badge is read as part of the method section's name.

**Amounts:** amounts are visually ৳ + Latin digits; in accessible names/descriptions, presets use the Bangla word form (§3.4 table) and arbitrary amounts use **টাকার পরিমাণ: {formatted}** (screen readers read the digits). Write ৳ as **টাকা** in spoken labels, never "taka sign". Include `dir="ltr"` + `unicode-bidi: isolate` on every amount so mixed-language sentences don't reorder.

**Mixed-language pronunciation:** mark provider and Latin technical terms that would be mispronounced inside Bangla copy with `lang="en"`: `bKash`, `Nagad`, `Rocket`, `QR`, `TxID`, `WhatsApp`, `Facebook`, `deshiQR`, `Chanasta` (in Bangla sentences the brand wordmark is **চানাস্তা**; use `chanasta` as Latin only in URLs/code). Do not wrap digits in `lang` spans.

**Live regions:** one polite status region per page for save/copy/confirm/undo announcements; `role="alert"` only for form errors and rate limits; the offline banner is `role="status"` (not alert). Never use `aria-live` on the whole page or on fast-changing counters.

**Dates:** `<time datetime="2026-11-01T14:32:00+06:00">1 নভেম্বর 2026</time>`; relative dates also carry the absolute date in the `datetime` attribute; the visible relative text is read normally.

**Tables and lists:** claims are a `<ul>` of `<article>`s on mobile and a real table on desktop — do not render a table with `role` hacks; keep the meaning equivalent.

### 7.5 Forms and errors

- `<label for>` on everything; no placeholder-only labels; required fields are visually and programmatically required; optional fields say **(ঐচ্ছিক)**.
- Errors: `aria-invalid="true"`, `aria-describedby` to helper + error text; error summary `role="alert"` with links; the summary gets focus on submit failure; first invalid field focused after the summary is announced (use a small timeout so both are heard).
- Grouping: amount chips use `role="radiogroup"`; age acknowledgment is a single checkbox with a wrapping label; bank fields grouped in `<fieldset><legend>ব্যাংক অ্যাকাউন্ট</legend>`; method select is a native `<select>`.
- Input modes: amount `inputmode="numeric"`, email `type=email autocomplete=email`, TxID `inputmode="text" autocomplete="off"` + `spellcheck="false"`, slug `inputmode="latin"`-equivalent (`autocapitalize="none" autocorrect="off" spellcheck="false"`).
- Never block paste (TxIDs are pasted); never reformat while typing (format on blur); never submit on Enter in a textarea; Enter submits single-line inputs.
- Success is not only a colour change: text + icon + focus move + polite announcement.

### 7.6 Motion, reflow, colour modes

- `prefers-reduced-motion: reduce` → durations collapse, no shimmer, no entrance translate, instant scroll; the thanks page has no confetti/animation at all.
- **Dark mode** is a full token swap (`[data-theme]` / OS preference) with no inverted QR and no pure black. Text contrast is re-measured above.
- **Forced colours (Windows HC):** focus colour → `Highlight`, borders remain visible via `CanvasText`, QR stays black-on-white (it is inside a white plate with `forced-color-adjust: none` on the QR only). No information is carried by colour alone anywhere.
- **Zoom/reflow:** 320 px at 400% must not scroll horizontally; sticky columns become static; tables become cards; dialogs become full-width sheets; no fixed pixel widths on text containers (except QR plates).
- **Text spacing override:** no fixed heights on text blocks; buttons/chips grow (`min-height` not `height`); Bangla letter-spacing is not applied by us, so override support is limited to line-height/word-spacing — verify no clipping at 1.5× line-height.
- **Audio/video:** none. No autoplay, no sounds, no haptics.

### 7.7 Bangla-specific accessibility

- `<html lang="bn">` by default; the toggle flips to `en`; nested Latin terms carry `lang="en"`; no `dir="rtl"` (Bangla is LTR — setting RTL would break the product).
- Bangla line-height ≥ 1.65 for body (we use 1.8) so matras and conjuncts do not clip; never use `line-height: 1` on Bangla.
- No `letter-spacing` or `text-transform` on Bangla text; no justified text (ragged-right is easier to read and avoids rivers).
- Bangla numerals: account numbers and TxIDs are Latin digits by nature; amounts use Latin digits per brand rule; in **spoken** labels use Bangla words. Do not convert Latin digits to Bangla digits in visible UI (supporters compare with provider apps).
- Font fallback: if Noto Sans Bengali fails, `system-ui` still renders Bangla on Android/iOS/Windows; test the fallback by blocking `fonts.gstatic.com` in DevTools — layout must not break (text may reflow).
- Screen-reader pronunciation sanity list (test with TalkBack Bangla + NVDA): **চানাস্তা**, **স্ব-ঘোষিত**, **ক্রিয়েটর নিশ্চিত করেছেন**, **৳৫০ — পঞ্চাশ টাকা**, **বিকাশ**, **যাচাই**, **টাকা সোজা তাঁর কাছে যায়**; no reading of "৳" as "hash" or "taka sign".

### 7.8 Accessibility acceptance checklist (per page)

- [ ] Keyboard-only completion of the page's primary job.
- [ ] Visible focus at every stop; focus order matches visual order; skip link works.
- [ ] VoiceOver/TalkBack: QR label, decode badge, claim badges, amounts, form errors, toast announcements.
- [ ] 320 px / 200% zoom / 400% reflow: no horizontal scroll, no clipped text.
- [ ] Dark + forced-colours: no invisible text, QR still black-on-white.
- [ ] Reduced motion: no animation-dependent information.
- [ ] Contrast pairs re-measured if any token changes (`design/tokens.css` CI check).
- [ ] Touch targets ≥ 44 px (audit with DevTools element overlay).
- [ ] No live-region spam on typing/scrolling.
- [ ] All images/SVGs either meaningful with a name or decorative with `aria-hidden`.

---

## 8. Performance, responsive and print

### 8.1 Budgets per route (gzip, first load, fonts included)

The binding budget from `decisions.md`: **supporter page ≤ ~150 KB JS / ~250 KB total**. That is the cap, not the target. Fonts are ~126 KB and are cached for a year after the first route; the totals below assume a cold cache.

| Route | JS target | JS cap | CSS | HTML | Fonts | Cold total target / cap | LCP target (3G) |
|---|---|---|---|---|---|---|---|
| `/` landing | 90 KB | 120 KB | 18 KB | 14 KB | 126 KB | 248 / 278 KB | ≤ 2.5 s |
| `/@:slug` supporter | **80 KB** | **150 KB** (decision) | 18 KB | 10 KB | 126 KB | **234 / 250 KB** | ≤ 2.5 s |
| `/@:slug/thanks` | 55 KB | 70 KB | 18 KB | 8 KB | cached | 81 / 96 KB warm | ≤ 2.0 s |
| `/onboarding` | 130 KB | 160 KB | 18 KB | 12 KB | cached | 160 / 190 KB warm | ≤ 2.8 s |
| `/login` | 35 KB | 40 KB | 18 KB | 6 KB | cached | 59 / 64 KB warm | ≤ 1.8 s |
| `/dashboard` | 130 KB | 160 KB | 18 KB | 10 KB | cached | 158 / 188 KB warm | ≤ 2.5 s |
| `/dashboard/profile` | 125 KB | 150 KB | 18 KB | 10 KB | cached | 153 / 178 KB warm | ≤ 2.5 s |
| `/dashboard/payments` | 135 KB | 170 KB | 18 KB | 12 KB | cached | 165 / 200 KB warm | ≤ 2.8 s |
| `/dashboard/settings` | 95 KB | 120 KB | 18 KB | 8 KB | cached | 121 / 146 KB warm | ≤ 2.2 s |
| `/embed/@:slug` | 30 KB | 45 KB | 14 KB | 4 KB | 126 KB cold | 174 / 189 KB cold · 48 / 63 KB warm | ≤ 2.5 s |
| legal pages | 25 KB | 35 KB | 16 KB | 10 KB | cached | 51 / 61 KB warm | ≤ 1.5 s |
| 404 | 22 KB | 30 KB | 16 KB | 4 KB | cached | 42 / 50 KB warm | ≤ 1.5 s |

**The two binding budgets intersect on the supporter page.** 150 KB JS is the decision's ceiling, but with 126 KB of fonts + 18 KB CSS + 10 KB HTML, the 250 KB total budget leaves **≈ 96 KB for JS on a cold first visit**. So: engineering target 80 KB JS / 234 KB cold total; the 150 KB JS ceiling only applies once fonts are cached (warm visit ≈ 108 KB total). If JS cannot fit in 96 KB cold, cut JS before cutting the Bangla font — Bangla legibility is not negotiable (decisions §4).

Rules: no route loads the Supabase client before it is needed; no supporter/landing route loads `jsqr`; no route loads a framework runtime; all chunks are hashed and immutable; fonts are the only large static assets and are limited to **two family files**.

### 8.2 Loading strategy and module map

| Module (gzip estimate) | Loaded on | Notes |
|---|---|---|
| App shell + route parsing + render helpers (~20 KB) | every route | tiny hand-written router; no framework; shared by all pages |
| `deshiqr-qr` encode + SVG render (~16 KB) | `/@:slug`, `/embed`, demo interactions, poster | **not** on legal/404; landing QR is pre-rendered for first paint. On the supporter page it also re-renders the amount-bearing QR synchronously on chip change (≤ 5 ms, no network) |
| i18n dictionary + locale switching (~8–12 KB per route set) | every route | split per route, BN+EN strings for that route only |
| Claim form + validation (~10 KB) | `/@:slug` only | error summary, amount rules, honeypot, fetch to RPC |
| Supabase client (~40 KB) | `/login`, `/dashboard*`, publish actions | dynamic `import()` only when configured; local demo mode never loads it |
| `jsqr` decode (~30 KB) | `/onboarding` + `/dashboard/payments` **after** the user picks a QR image | never on page load, never on supporter pages |
| Poster/CSV/export helpers (~8 KB) | dashboard actions | generated on demand |
| Sharing (copy/clipboard, no SDK) (~2 KB) | supporter + dashboard | `navigator.share` if available, copy fallback; no third-party share SDK |

- JavaScript is `type="module"` (deferred), no inline handlers, no polyfill bundle (evergreen browsers only: Chrome 90+/Android 8+, Safari 15+, Firefox 90+; the page must still render honest static content without JS).
- CSS is one render-blocking stylesheet, ≤ 20 KB gzip (tokens + components). No CSS-in-JS runtime, no utility framework purge risk.
- No third-party scripts of any kind: no analytics, tag manager, fonts JS, chat widget, social embeds, A/B testing. Aggregate privacy-friendly counters, if ever added, must be self-hosted and documented in Privacy.
- Preconnect only to `fonts.googleapis.com` and `fonts.gstatic.com`; no other origins.
- Images: **none** — emoji avatars (text), inline SVG QR, inline SVG icons/steam line. If a raster ever appears (it should not in MVP), it must be `width`/`height` declared and lazy, and the budget must be re-negotiated.
- QR is rendered inline (`<svg>` in DOM) — zero image requests, no `canvas` except the "save PNG" action.

### 8.3 Font loading detail

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400..700&family=Noto+Sans+Bengali:wght@400..700&display=swap">
```

- `display=swap`, no invisible text; fallback is `system-ui` (Android renders Bangla with Noto Sans Bengali system or its Bengali fallback, iOS with Bangla Sangam MN, Windows with Nirmala UI).
- Optional metric-override fallback (only if CLS from font swap exceeds 0.05): declare a `@font-face` local fallback with `size-adjust`, `ascent-override`, `descent-override` matched per platform; do not ship without measuring.
- Cache: `Cache-Control: public, max-age=31536000, immutable` for the gstatic font files (Google already does this); hashed app assets 1 year; HTML `no-cache`; fonts never re-requested across routes.
- Do not self-host, subset, or add a third family in this phase — 126 KB for 2 files is the agreed budget; a third family requires cutting elsewhere.

### 8.4 3G acceptance criteria (must pass before beta)

**Test setup:** Android Chrome, mid-range device class (Moto G4 / Redmi 9A), CPU 4× throttle, **Fast 3G** (1.6 Mbps down / 750 Kbps up / 150 ms RTT), cold cache; repeat on Slow 4G and on a real 3G SIM. Three runs, take the median.

| Metric | Threshold (supporter page) |
|---|---|
| TTFB | ≤ 600 ms (static host, CDN) |
| FCP | ≤ 1.8 s |
| LCP (the creator H1 or the QR plate, whichever is later) | ≤ 2.5 s |
| TBT | ≤ 200 ms |
| CLS | ≤ 0.05 |
| Total transfer | ≤ 250 KB cold, including fonts; JS ≤ 96 KB on a cold visit (80 KB target), 150 KB is the absolute decision ceiling once fonts are cached |
| QR visible and scannable | ≤ 2.5 s |
| Claim submission feedback (tap → loading state) | ≤ 100 ms (never a dead tap) |
| Offline re-visit | static shell + honesty copy render from cache; data region shows the honest error |

If a budget is exceeded: cut in this order — landing demo interactivity → decorative steam animation → transition durations → skeleton shimmer → lazy-import more modules. **Never cut**: honesty strip, decode badges, claim badges, footer trust block, 44 px targets, QR inline rendering, fonts (Bangla legibility), report links.

### 8.5 Responsive behaviour rules

| Element | < 560 px | 560–1023 px | ≥ 1024 px |
|---|---|---|---|
| Amount chips | 2×2 grid (measured: metaphor needs ≥ 120 px per chip; 2 columns at 320 px = 140 px) | 4-across (each ≥ 120 px) | 4-across |
| Supporter page | 1 column, 16 px gutter | 1 column, 24 px gutter, max 680 px | 2 columns: 600 px identity/claims + 400 px sticky support card, 48 px gap |
| QR panel | 76vw ≤ 264 px | 280 px | 280 px |
| Claim form | inline, full width | inline, max 544 px | inline in the sticky column |
| Claim card | full width | 2-up grid in the left column | 2-up grid |
| Dashboard nav | 4-item horizontal route nav under the header | same | 232 px sidebar |
| Claims list | cards | cards | table ≥ 1024 px (cards below) |
| Payment methods | cards | rows | 2-line rows |
| Header | brand + lang + one CTA | + nav links | + login + primary CTA |
| Embed | container query at 300/340/380 px (not viewport) | — | — |
| Sticky things | dashboard save bar, toast, header on dashboard/legal | same | + supporter support card |

Other rules: use `dvh` not `vh` for mobile viewports; respect `--safe-bottom`; no fixed-height sections holding Bangla text; no horizontal scroll at any width; landscape mobile (height < 500 px) limits the QR panel to 55vh and allows the sticky support card to become static; tables → cards must preserve the same information and heading order; images are never cropped (there are none).

### 8.6 Print stylesheet (A4 poster + legal pages)

```css
@media print {
  @page { size: A4 portrait; margin: 0; }
  .app-header, .app-footer, nav, .toast, dialog, .no-print { display: none !important; }
  .poster { width: 210mm; height: 297mm; margin: 0; padding: 15mm;
            background: var(--poster-bg); color: var(--poster-ink);
            page-break-inside: avoid; print-color-adjust: exact; }
  .poster .qr svg { width: 62mm; height: 62mm; }
  .poster .qr { forced-color-adjust: none; }   /* QR stays pure black-on-white */
  a[href]::after { content: " (" attr(href) ")"; font-size: 9pt; } /* legal pages only */
}
```

- **Poster:** exactly 1 page, black on white, QR ≥ 62 mm square with ≥ 4-module quiet zone, creator name ≥ 28 pt, tagline 13 pt, URL 12 pt, honesty line ≥ 9 pt, demo mark and fake account when demo. Test: print to PDF, then scan the printed QR with bKash and verify `DEMO STORE` / `01000000000`. All fonts must already be loaded (print from `/dashboard/profile` after the webfonts settle; wait for `document.fonts.ready` before opening the print dialog).
- **Legal pages:** print as clean prose, hide chrome, show external link URLs, avoid mid-heading page breaks (`break-after: avoid` on h2/h3), body ≥ 11 pt, no background colours.
- Dark mode must not affect print: print always light/black-on-white.
- No `@page` headers/footers with the brand (browser adds page numbers; that is fine).

### 8.7 Privacy-performance hygiene

- No cookies except the Supabase auth session (dashboard only); localStorage keys: `chanasta.lang`, `chanasta.theme`, `chanasta.demo.*`; sessionStorage: `chanasta.amount`, thanks context. No fingerprinting, no IP collection in the client, no fonts with tracking, no CDN other than Google Fonts.
- No source maps shipped to production unless protected; no console logs with claim data.
- `referrerpolicy="no-referrer"` on the deshiQR credit link; external links `rel="noopener noreferrer"`.
- The embed iframe uses `sandbox="allow-scripts allow-same-origin allow-popups"` in the snippet and a fixed height in the documented embed code (no auto-resize postMessage loop).

---

## 9. Content placement map and new strings

### 9.1 Where the brand-copy bank goes (do not duplicate the deck)

| `brand-copy.md` section | Surfaces |
|---|---|
| §1–§5 brand story, name, taglines, tone, vocabulary | `docs/` only; tone governs every string below. Tagline #1 in the landing hero + share/social card; #2 as the landing sub-hero; #3 on the thanks page (secondary); #4 in onboarding/creator help; #5 in the footer/disclosure strip area. Never stack two taglines on one screen. |
| §6 unit ladder | amount chips (labels + `৳` amounts), default ৳20/৳50/৳100/ইচ্ছেমতো, locked-amount helper |
| §7.1 creator page above the fold | supporter page identity, sub-line, amount section, CTAs, share/report/last-updated; subset reused in the embed and the landing demo card |
| §7.2 payment instructions | payment method section: `কীভাবে পাঠাবেন` steps, QR labels/helpers, copy number, copy toast, save QR, bank labels, after-send prompt |
| §7.3 "I sent it" claim flow | claim form labels/placeholders/helpers, submit states, success, duplicate, rate-limited |
| §7.4 badges & status | claim badges, suspended page, QR verified/unverified badges, dashboard new-claims badge, demo badge |
| §7.5 trust & disclosure | creator-page footer strip (A), claim list header (E), landing footer (F), provider-terms line, no-fees line |
| §7.6 empty/loading/error | every empty/loading/error state in §3.16–3.18, QR decode errors, offline, 404, suspended |
| §7.7 dashboard & onboarding | onboarding steps + copy, dashboard headings/actions, verify-QR tour tip |
| §7.8 share & embed | share kit (copy link/text, embed code, preview), email signature line |
| §7.9 utility & legal | footer legal links, language toggle, claim visibility note, no-fees line, draft-review banner (staging) |
| §8 demo content | the three demo creators, their taglines/bios, demo claims, demo payment labels, landing demo cards, embed demo previews |

**Deliberately unused deck strings in MVP:** the identity-verified page badge (`যাচাই করা পেজ` — no identity program), goal-related copy (no goal UI), and any provider/integration claims. If a string is not listed in §9.1/§9.3, do not invent a variant — extend this document first.

### 9.2 New UI strings (designed here; Bangla must be reviewed by a native speaker)

These do not exist in the brand deck. They follow the same rules: **আপনি**, no exclamation marks, no banned words, Latin digits for quantities, Bangla digits only for ordinal step markers carried over from the deck. `{placeholders}` are interpolated, never concatenated.

**Global, navigation and actions**

| Bangla | English | Where |
|---|---|---|
| ড্যাশবোর্ড | Dashboard | header / nav |
| বার্তা | Messages | dashboard nav |
| প্রোফাইল | Profile | dashboard nav |
| পেমেন্ট | Payments | dashboard nav |
| সেটিংস | Settings | dashboard nav |
| পেজ দেখুন | View page | header, dashboard actions, share kit |
| পেজ খুলুন | Create your page | landing/header primary CTA |
| লগইন | Log in | landing header |
| লগ আউট | Log out | dashboard menu |
| ডেমো পেজ | Demo pages | landing nav / section |
| মূল অংশে যান | Skip to content | skip link |
| ভাষা বদলান | Change language | language toggle `aria-label` |
| হোমে ফিরুন | Go home | 404 / suspended |
| আরও পড়ুন | Read more | long claims |
| বিস্তারিত | Details | claim row disclosure |
| বন্ধ করুন | Close | dialog / sheet |
| বাতিল | Cancel | dialogs, save bars |
| সেভ করুন | Save | forms |
| সেভ হয়েছে | Saved | save bar status / toast |
| সম্পাদনা | Edit | method/profile rows |
| মুছুন | Delete | rows / danger zone |
| যোগ করুন | Add | generic |
| আবার চেষ্টা করুন | Try again | every error state |
| আরও দেখুন | See more | generic lists |
| সব | All | claims filter |
| নতুন | New | new-claim badge |
| লুকানো | Hidden | filter, dashboard badge |
| আবার দেখান | Show again | hidden claim action |
| নিশ্চিত করেছি | I've confirmed | claim action (deck) |
| দেখাবেন না | Hide | claim action (deck) |
| ফিরিয়ে নিন | Undo | confirm toast action |
| ফেরত আনুন | Undo | hide toast action |
| নিশ্চিত করা হয়েছে | Confirmed | toast |
| লুকানো হয়েছে | Hidden | toast |
| শেয়ার করুন | Share | dashboard action |
| পেজটি শেয়ার করুন | Share this page | deck |
| লিংক কপি করুন | Copy link | share kit |
| লিংক কপি হয়েছে | Link copied | toast |
| কোড কপি করুন | Copy code | embed snippet |
| QR সেভ করুন | Save QR | QR panel |
| QR সেভ হয়েছে | QR saved | toast |
| পোস্টার প্রিন্ট করুন | Print poster | poster card |
| পোস্টার ডাউনলোড করুন | Download poster | poster card |
| নম্বর কপি করুন | Copy number | deck |
| কপি হয়েছে | Copied | deck toast |
| নম্বর দেখান | Show number | reveal control |
| নম্বর লুকান | Hide number | reveal control |
| নম্বরটি সিলেক্ট করে কপি করুন | Select the number to copy | clipboard failure |
| অ্যাকাউন্ট নম্বর | Account number | bank/copy fields |
| অ্যাকাউন্টের নাম | Account name | bank fields |
| ব্যাংকের নাম | Bank name | bank fields |
| শাখা | Branch | bank fields |
| রাউটিং নম্বর | Routing number | bank fields |
| পদ্ধতি যোগ করুন | Add method | payments |
| পেমেন্ট পদ্ধতি | Payment method | payments |
| সর্বোচ্চ ৮টি পদ্ধতি | Up to 8 methods | payments limit |
| সক্রিয় / নিষ্ক্রিয় | Active / Disabled | enabled switch |
| উপরে নিন / নিচে নামান | Move up / Move down | method reorder |
| QR পেস্ট করুন | Paste QR | onboarding/payments |
| QR ছবি আপলোড করুন | Upload QR image | onboarding/payments |
| নম্বর দিয়ে যোগ করুন | Add manually | onboarding/payments |
| QR পড়া হচ্ছে… | Reading QR… | decode status |
| এই QR-টি আপনার? নাম মিলিয়ে নিন। | Is this your QR? Check the name. | decode result |
| পদ্ধতি সেভ করুন | Save method | method editor |
| ধাপ {n} / {total} | Step {n} of {total} | onboarding progress |
| পরের ধাপে যান | Next step | onboarding |
| পিছনে | Back | onboarding |
| পরে চালিয়ে যাব | Continue later | onboarding |
| শুরু করুন | Get started | onboarding welcome |
| লিংক → পেমেন্ট → প্রোফাইল → প্রকাশ | Link → Payments → Profile → Publish | onboarding step labels |
| পেজ প্রকাশ করুন | Publish my page | deck |
| আনপাবলিশ করুন | Unpublish | profile publish control |
| খসড়া | Draft | deck/status pill |
| প্রকাশিত | Published | status pill |
| বন্ধ | Unavailable | suspended status pill |
| খসড়া প্রিভিউ | Draft preview | owner preview banner |
| পেজটি এখনো পাবলিক নয় | This page is not public yet | draft banner |
| প্রিভিউ | Preview | preview panels |
| প্রিভিউ দেখুন | Preview | deck |
| লিংক বদলান | Change link | profile slug |
| এই লিংকটি ব্যবহার করা যাবে। | This link is available. | slug check |
| দেখা হচ্ছে… | Checking… | slug check |
| পেজ মুছুন | Delete page | settings danger zone |
| পেজ মুছে ফেলা হয়েছে | Page deleted | toast/redirect |
| বার্তা এক্সপোর্ট | Export messages | settings |
| TxID অন্তর্ভুক্ত করুন | Include TxID | export dialog |
| এই ফাইলে ব্যক্তিগত তথ্য আছে | This file contains private information | export warning |
| সিস্টেম / হালকা / গাঢ় | System / Light / Dark | settings appearance |
| প্রদর্শিত নাম | Display name | profile |
| এক লাইনের পরিচয় | Tagline | profile |
| পরিচিতি | Bio | profile |
| ইমোজি বদলান | Change emoji | profile |
| আপনার ইমোজি বেছে নিন | Choose your emoji | emoji picker |
| সোশ্যাল লিংক | Social links | profile |
| লিংক যোগ করুন | Add link | profile |
| ওয়েবসাইট | Website | socials |
| আপনার নাম | Your name | claim form |
| {n}টি বার্তা | {n} messages | filters |
| সব বার্তা দেখুন | Show all messages | empty filter |
| আরও বার্তা দেখুন | See more messages | claim list pagination |
| এই তালিকায় কিছু নেই। | Nothing here yet. | empty filter |
| আপত্তি থাকলে রিপোর্ট করুন | Report a problem | rejected claim |
| মডারেশনে সরানো হয়েছে | Removed by moderation | rejected claim badge |
| নিজের অ্যাপে মিলিয়ে নিশ্চিত করুন। | Check your app, then confirm. | confirm helper |
| এই TxID আগেও এসেছে। মিলিয়ে দেখুন। | This TxID has appeared before. Double-check. | duplicate warning |
| আজ / গতকাল / {n} দিন আগে | Today / Yesterday / {n} days ago | claim meta |
| {n} ঘণ্টা আগে | {n} hours ago | claim meta |

**Auth, demo mode and legal/trust surfaces**

| Bangla | English | Where |
|---|---|---|
| লগইন করুন | Log in | login H1 |
| ইমেইল দিন — আমরা একটি লগইন লিংক পাঠাব। পাসওয়ার্ড লাগবে না। | Enter your email — we'll send a login link. No password needed. | login intro |
| লগইন লিংক পাঠান | Send login link | login CTA |
| লিংক না পেলে স্প্যাম ফোল্ডার দেখুন। | If it doesn't arrive, check your spam folder. | login helper |
| ইমেইল পাঠানো হয়েছে | Check your email | sent state |
| আবার পাঠান | Resend | sent state |
| অন্য ইমেইল দিন | Use a different email | sent state |
| এই লিংকটির মেয়াদ শেষ। আবার লিংক পাঠান। | This link has expired. Send a new one. | expired link |
| লিংকটি কিছুক্ষণের জন্য কাজ করবে | The link works for a short while | sent state |
| ডেমো মোডে লগইন ছাড়াই ড্যাশবোর্ড দেখা যায়। | In demo mode the dashboard opens without login. | demo login |
| ডেমো মোড — সব পেজ, টাকা আর বার্তা নমুনা। এখানে কোনো আসল টাকা যায় না। | Demo mode — every page, amount and message is a sample. No real money moves here. | demo banner |
| ডেমো মোড — পেজ শুধু এই ব্রাউজারে থাকবে, সার্ভারে সেভ হবে না। | Demo mode — your page stays in this browser and is not saved to a server. | demo onboarding |
| এটি একটি ডেমো — এখানে কোনো আসল টাকা যায় না। | This is a demo — no real money moves here. | demo footer line |
| ডেমো মোডে পেজ মুছবেন না | Page deletion is disabled in demo mode | settings |
| আপনার বার্তা দেখানো যাচ্ছে না, তবে ধন্যবাদ। | We can't show your message here, but thank you. | thanks fallback |
| পেজে ফিরুন | Back to page | thanks fallback |
| এটি কোনো রসিদ বা পেমেন্ট নিশ্চিতকরণ নয়। | This is not a receipt or a payment confirmation. | thanks page |
| টাকা সোজা ক্রিয়েটরের কাছে যায়; চানাস্তা টাকা নেয় না। | Money goes straight to the creator; Chanasta takes none. | embed micro-line |
| টাকা সোজা ক্রিয়েটরের অ্যাকাউন্টে যায়; চানাস্তা টাকা রাখে না। | Money goes straight to the creator's account; Chanasta holds none. | landing hero micro-line |
| QR সেভ করে গ্যালারি থেকে স্ক্যান করুন। | Save the QR and scan it from your gallery. | QR fallback helper |
| QR দেখাতে জাভাস্ক্রিপ্ট দরকার। ক্রিয়েটরের পেজে গিয়ে দেখুন। | Showing the QR needs JavaScript. Open the creator's page. | `<noscript>` |
| QR তৈরি করা যায়নি। নম্বর কপি করে পাঠান। | Couldn't build the QR. Copy the number instead. | QR encode error |
| QR-এ নির্বাচিত ৳{amount} বসানো আছে | The QR includes the selected ৳{amount} | QR helper when an amount is embedded |
| QR-এ ৳{amount} যোগ করা হয়েছে | Added ৳{amount} to the QR | polite live-region announcement on chip change |
| ইচ্ছেমতো — মূল QR | Any amount — the original QR | helper when the static payload is shown |
| সর্বোচ্চ ৳100,000 পর্যন্ত | Up to ৳100,000 | amount cap |
| টাকার পরিমাণ: {amount} | Amount: {amount} | SR amount label |
| আমরা যত দ্রুত সম্ভব দেখব। সাধারণত 72 ঘণ্টার মধ্যে চেষ্টা করি, তবে এটি কোনো নিশ্চয়তা নয়। | We'll look as soon as we can. We aim for 72 hours but can't guarantee it. | report helper |
| কী সমস্যা? (অনুগ্রহ করে সংক্ষেপে লিখুন) | What's wrong? (please describe briefly) | report email body |
| এই শব্দটি এখানে ব্যবহার করা যাবে না। | This word can't be used here. | prohibited-word validation |
| বার্তা স্প্যাম ঠেকাতে সীমা আছে। | There are limits to prevent message spam. | privacy page |
| টাকা কীভাবে যায় | How the money moves | legal H1 |
| চানাস্তা যা করে | What Chanasta does | legal section |
| চানাস্তা যা করে না | What Chanasta does not do | legal section |
| "যাচাই" মানে কী | What "verified" means | legal section |
| কেন QR স্ক্যানের আগে নাম মিলিয়ে নিতে হবে | Why check the name before scanning | legal section |
| অপরিচিত QR স্ক্যান করবেন না। নাম ও নম্বর মিলিয়ে নিন। | Don't scan unfamiliar QR codes. Verify the name and number. | safety card |
| আমি একটি পেজ খুলতে চাই | I want to create a page | landing secondary (optional) |
| চানাস্তা মাঝখানে নেই। | Chanasta is not in between. | landing money-path diagram |
| কোন উপায়ে পাঠানো যায়? | Ways to send | landing provider matrix |
| আপনার সাইটে বসান | Embed it on your site | landing embed section |
| সাধারণ প্রশ্ন | Common questions | landing FAQ |
| আপনার পেজ লাইভ! | Your page is live! | deck toast |

**Screen-reader and contextual labels (patterns)**

| Pattern (BN) | Pattern (EN) | Used on |
|---|---|---|
| `{creator name}-এর {provider} QR — {decode status}, {merchant name}। {QR-এ {amount} বসানো আছে। }স্ক্যান করে নিজের অ্যাপে টাকা পাঠান।` | `{creator name}'s {provider} QR — {decode status}, {merchant name}. {The QR includes {amount}. }Scan it and send from your own app.` | QR panel `aria-label` |
| `{amount} টাকার বার্তা নিশ্চিত করুন` | `Confirm the {amount} message` | claim action |
| `{amount} টাকার বার্তা লুকান` | `Hide the {amount} message` | claim action |
| `{amount} টাকার বার্তা আবার দেখান` | `Show the {amount} message again` | claim action |
| `{n}টি নতুন বার্তা` | `{n} new messages` | dashboard badge (deck) |
| `ভাষা বদলান — English` / `Change language — বাংলা` | — | language toggle |
| `পেজটি নতুন ট্যাবে খুলবে` | `Opens in a new tab` | external links (sr-only) |

### 9.4 Demo content rules (synthetic only — repo-wide rule)

- Three demo creators exactly: `@demo-teacher` (ডেমো শিক্ষক), `@demo-artist` (ডেমো শিল্পী), `@demo-writer` (ডেমো লেখক), with the names/taglines/bios from brand-copy §8 and a visible **ডেমো / DEMO** badge next to the name.
- Demo payment methods: **ডেমো বিকাশ (যাচাই করা QR)** with the deshiQR synthetic payload (`DEMO STORE`, fake account `01000000000`), and **ডেমো ব্যাংক** with a clearly fake account (`0000000000000`). Never a real phone number, name, bank or TxID.
- Demo claims: at least one `unverified` and one `confirmed` in the demo fixture so both badges render; a `hidden` claim proves public filtering; supporter names are fictional (“একজন শুভানুধ্যায়ী”, “রাফসান”).
- Demo mode (running without Supabase) is clearly labelled (§9.3 banner) on every page; claims and pages live in `localStorage` under the architecture keys `chanasta.local.creators`, `chanasta.local.methods`, `chanasta.local.claims`, `chanasta.local.owner` ([architecture.md §1](./architecture.md)) and never sync.
- Screenshots, marketing and tests use demo data only. A grep for real-looking account numbers/TxIDs is part of the release checklist.
- The landing demo card, the three demo pages and the embed demo preview all use the same pre-rendered synthetic QR SVG so the product looks complete offline.

### 9.5 Localisation mechanics and formatting

- `<html lang="bn">` is the base; the toggle swaps to `en` and persists (`chanasta.lang`). `?lang=en` and `?lang=bn` are accepted and replaceState'd on toggle. Default is Bangla regardless of browser language (Lead decision 11).
- Strings live in per-route dictionaries with `{placeholders}`; no concatenation (Bangla word order differs); no `Intl` plural rules needed for Bangla counts (`{n}টি বার্তা`), English uses regular plural (`1 message` / `2 messages`). Write both forms.
- **Amounts:** always `৳` + Latin digits via `formatTaka()`; no decimals in UI inputs (server allows them, display formats them); thousands separators per engine (`৳1,250.50`, `৳100,000`); no lakh grouping in UI (allowed only in long-form prose per brand rule).
- **Dates (UI):** Bangla `1 নভেম্বর 2026`, English `1 Nov 2026`; Latin digits; timezone **Asia/Dhaka**; relative `আজ`, `গতকাল`, `2 দিন আগে` (Latin digits); full timestamp in dashboard details `1 নভেম্বর 2026, 4:32 PM`.
- **Ordinal steps:** keep the deck's Bangla digits in step copy (`১. বিকাশ…`), while step progress and counters use Latin digits (`ধাপ 1 / 4`) — ordinals are markers, quantities are numeric data.
- **Provider names:** `bKash` / `Nagad` / `Rocket` / `Bangla QR` in Latin contexts; `বিকাশ` / `নগদ` / `রকেট` / `বাংলা QR` in Bangla copy; never translated to "বিকাশ অ্যাপ" when referring to the company? (বিকাশ অ্যাপ is fine for the app). No logos.
- **English tone:** sibling, not literal translation; short sentences; no "donate/tip/fund"; "support" not "payment"; keep the honesty sentences as strong as the Bangla.
- **Review gate:** every new Bangla string in §9.3 gets a native-speaker read-aloud check before merge; machine translation is not acceptable (brand rule).

---

## 10. Hand-off checklist

### 10.1 Build order (two implementers can work in parallel after step 2)

| Phase | Work | Depends on | Exit criteria |
|---|---|---|---|
| 1 | Copy `design/tokens.css` verbatim; base layout, font links, dark mode, skip link, focus ring, reduced-motion, global type styles | — | tokens render; theme switch works; focus visible; Bangla/English toggle flips leading and strings |
| 2 | Primitives: button, link, field, chips, badges, copy field, QR panel, disclosure strip, toast, dialog, avatar | 1 | component states all implemented; 44 px targets; contrast checked; keyboard operable |
| 3 | Supporter page `/@:slug` (identity → honesty strip → ladder → payment methods → claim form → claim list → footer) + `/@:slug/thanks` | 2 | all §4.2 states; 3G budget met; honesty checklist §5.3 passes; screen-reader pass |
| 4 | Landing `/` + demo fixtures/QR pre-render + 404 | 2, 3 (components) | demo mode looks complete; FAQ/matrix/embed; no-JS hero; LCP in budget |
| 5 | Auth `/login` + onboarding 4 steps + share kit + poster (server or local demo) | 2, 4 | time-to-first-page < 5 min on 360 px; decode states; publish blocked path; share kit |
| 6 | Dashboard: shell, inbox, profile, payments, settings | 2–5 | every state; claim confirm/hide/undo; TxID privacy; delete/export dialogs |
| 7 | Embed card + legal pages + print stylesheet + polish pass | 3–6 | container-query embed; no-JS fallback; A4 print test; reduced motion; forced colours |
| 8 | Performance/a11y audit + copy audit + demo-data grep | all | §10.2 and §10.3 checklists green |

If only one implementer: 1 → 2 → 3 → 5 (skip landing polish) → 4 → 6 → 7 → 8. The supporter page is the product; never ship a dashboard before it.

### 10.2 Definition of done

**Component** — variants built; all §3.0 states; dark tokens only; keyboard operable; 44 px; accessible name; focus-visible; no raw hex; no Bangla letter-spacing; no banned words; no provider logo; reduced-motion respected; contrast pair documented.

**Page** — every state in §4 implemented (including empty/error/loading/suspended/not-found); Bangla default + English toggle; honesty strip(s) present; primary CTA singular and honest; footer trust block + report + deshiQR credit; skip link; `h1` correct; meta title/description in both languages; no horizontal scroll at 320 px; dark + reduced motion + forced colours pass; fonts swap without layout shift; JS/transfer within §8.1 budget; no tracking; demo data only.

### 10.3 QA matrix (run before beta)

| Axis | Values |
|---|---|
| Devices | 360×640 Android Chrome (primary), 320×568, 390×844 iOS Safari, 768×1024 tablet, 1366×768 desktop, 1920 desktop |
| Networks | Fast 3G throttled, Slow 4G, offline; cold + warm cache |
| Modes | light, dark, forced colours, reduced motion, 200% zoom, 400% reflow, 1.5× line-height override |
| Input | touch, keyboard-only, screen reader (TalkBack/VoiceOver/NVDA), clipboard copy, numeric keyboard |
| Languages | Bangla default, English toggle, mixed provider terms, `?lang=` links |
| Data | demo mode, published, draft, no methods, no claims, suspended, deleted, 404, rate-limited, duplicate claim, offline mid-claim |
| Print | A4 PDF poster, legal page print, QR scan from printed sheet |

### 10.4 Cut list (if time runs short) — and what can never be cut

**Can be cut, in this order:** landing demo interactivity (use the static pre-rendered demo card) → poster print/download (keep the QR save) → dark-mode polish on the dashboard (system dark still works) → social share text generators (keep copy link) → dashboard desktop table (cards on all sizes) → any decorative steam animation → legal page TOC → embed `?theme=` override → avatar picker variety (keep the default ☕) → skeleton shimmer (plain skeletons).

**Never cut:** disclosure strip + footer trust block + no-fees line; decode-status badges and helpers; self-reported / creator-confirmed claim badges; the claim form's honesty intro + age acknowledgment; TxID privacy; report link; 44 px targets; focus-visible; skip link; QR inline SVG (no image requests); Bangla font quality; the demo creator pages; the English toggle; the "no fees on money" statement; the deshiQR credit.

### 10.5 Warnings for implementers

1. **The ৳ glyph is not in Figtree.** It falls back to Noto Sans Bengali inside amounts. Test `৳20`, `৳1,000`, `৳100,000` at every size/weight/theme; if the join looks heavy, use the sanctioned `.amount__taka` span (§2.2.3). Do not "fix" it by using Bengali digits or by adding a third font.
2. **Bangla is wider than you think.** A 20 px H1 that fits English will wrap twice in Bangla. Use `--text-h1`/`--text-h2`, `min-height` (never `height`) on text containers, and test every screen at 360 px with the real copy from `brand-copy.md` (measured line counts in §2.2.4).
3. **Never apply `letter-spacing`, `text-transform`, or justified text to Bangla.** It breaks shaping and looks wrong. Tracking tokens are for Latin/numeral runs.
4. **Tabular figures need `font-variant-numeric: tabular-nums lining-nums` on the element** (Figtree has `tnum`, verified). Dashboard numeric columns are right-aligned with a fixed `min-width` so alignment survives even if a browser drops the feature.
5. **Do not use `color-mix()`, `light-dark()`, or `@container` for the main layouts** unless you keep the explicit token fallbacks. The tokens are literal values for old mid-range Android Chrome; container queries are allowed only inside the embed card.
6. **The QR must stay black-on-white and un-overlaid**, in both themes and in print. No CSS filters, no rounded modules, no logo, no `border-radius` clipping the quiet zone. The SVG's own margin is the quiet zone.
7. **Do not load `jsqr` on the supporter page or the landing page.** It is only for the creator's QR upload/decode (onboarding/payments), imported after the file picker is used.
8. **Do not load Supabase on public pages.** Demo mode must work with zero backend; the dashboard/auth lazy-loads the client only when configured.
9. **Theme is a token swap, not a separate stylesheet.** Set `data-theme` on `<html>`; never invert the QR; never hand-pick dark colours outside `tokens.css`.
10. **Focus rings are not optional.** If a component removes the outline, it must restore the `--focus-ring` on `:focus-visible`; test every interactive element with Tab.
11. **Do not put a claim form in a modal**, do not auto-open anything on load, and never auto-focus the amount input on mobile (keyboard jump + scroll shift).
12. **Claim state is not payment state.** Do not add a "paid" filter, a receipt, a `confirmed → paid` rename, or a success animation on the thanks page. `confirmed` means the creator checked their own app; `unverified` is visible by default.
13. **Escaping and plain text:** claims/messages/bio/name are user text — render escaped, never `innerHTML`, no auto-linking, no images, no emoji rendering inside messages beyond native text.
14. **The thanks page must not leak another supporter's claim.** Keep claim context in `sessionStorage`; on a cold visit show the neutral fallback; never fetch a claim by ID from a public URL.
15. **Demo mode must look complete.** If a screen looks broken/empty in demo mode, it is broken — the demo is the product showcase and the acceptance test for this phase.
16. **Copy is a design deliverable.** If a string is missing, add it to §9.3 (Bangla + English) rather than writing it ad hoc; the banned-word audit (§6.11) is a release blocker.
17. **44 px is measured on the hit area**, not the visible icon — icon-only buttons need padding to reach it; badges are not buttons; adjacent tap targets need ≥ 8 px spacing.
18. **Content security:** no third-party scripts, no inline event handlers, no `eval`, CSP-friendly code (for the static host headers). The only external origin is `fonts.gstatic.com`/`fonts.googleapis.com`.

### 10.6 Hand-off sign-off

| Area | Owner | Sign-off means |
|---|---|---|
| Design system | design | tokens + primitives reviewed against §2/§3; no raw hex outside tokens |
| Supporter page | implementation + design | §4.2 + §5 checklist + §7 a11y + §8 budget |
| Creator flows | implementation + product | §4.4–4.9 states, no goal UI, no admin UI |
| Trust copy | brand + Lead | §6.11 audit green; legal banner decision confirmed (§11) |
| Accessibility | implementation + design | NVDA/TalkBack pass on supporter page + claim form + dashboard inbox |
| Performance | implementation | §8.1 budgets in CI; §8.4 3G run recorded |

---

## 11. Open questions for the Lead (design-level, non-blocking)

These do not block building the design as specified, but need a call before/at beta:

1. **Draft legal banner conflict.** Lead decision 12 says every legal page ships with a visible "Draft — pending legal review" banner; compliance §9 says the banner is staging-only (not in production). We implement the banner everywhere until counsel sign-off; confirm whether a public beta may ship legal pages with the draft banner (recommended: yes, with the banner, until reviewed).
2. **Report email wording/SLA.** The mailto target is `hello2himel@proton.me` and the "best effort, aim 72h, no guarantee" copy is invented (§9.3). Approve the Bangla sentence or supply the exact wording; it appears on every creator page.
3. **Theme selector.** This spec exposes System/Light/Dark in dashboard settings (supporter pages follow the OS). Confirm this is wanted for MVP or keep OS-only.
4. **Locked-amount wording.** We label the creator's fixed amount **নির্ধারিত / Suggested** and tell supporters they can send any amount (the UI cannot enforce a provider-side amount). Confirm; alternatives ("প্রস্তাবিত / Suggested", "পছন্দের অঙ্ক / Preferred amount") change the trust reading.
5. **`?lang=` URLs.** The toggle updates `?lang=en` via replaceState so English pages can be shared. Confirm this is acceptable for SEO (duplicate-content handling via `hreflang`), or drop the URL param and use storage only.
6. **Claim list page size.** 12 cards + **আরও বার্তা দেখুন**. Confirm, or set a different MVP cap.
7. **TxID in CSV export.** Default off with an explicit checkbox. Confirm this privacy default, and whether exports should include it at all in MVP.
8. **Poster account number.** The printed poster shows the full account number (needed for manual entry) while the screen masks it. Confirm this display rule for print.
9. **Claim confirm interaction.** One tap + 5 s undo (no confirmation dialog) because confirmation is reversible. Confirm, or require an explicit "did you check your app?" confirmation step.
10. **Amount-bearing QR vs compliance wording.** [architecture.md §5](./architecture.md) requires `withAmount(base, amount)` dynamic payloads when a supporter picks an amount, while [compliance.md §6](./compliance.md) lists lossless amount/reference derivation as roadmap/creator-opt-in rather than MVP. The design now specifies the dynamic QR (with a helper that never promises provider prefill); confirm the Lead wants this in MVP or whether to fall back to the static creator QR for the first release.
11. **Storage-key naming.** This doc now uses the architecture's `chanasta.local.*` keys for demo data; confirm the session-only keys (`chanasta.amount` for the selected amount, thanks-page claim context) are acceptable or should be namespaced `chanasta.session.*`.

---

*End of hand-off. If a decision here conflicts with `decisions.md` or `compliance.md`, those documents win — raise it with the Lead rather than improvising in code.*

