# Chanasta redesign — coffee theme, de-slopped

Status: Phase 4 design + implementation brief.
Sources: the supplied `chanasta-pages.zip` boards (`Landing`, `Main`, `Onboarding`,
`Dashboard`, `Poster` — extracted at `/tmp/chanasta-ui/extracted/chanasta/`), the earlier single-merchant
`Taka QR` slip UI (inspiration for the receipt motif), and the public design craft references:

- Claude `frontend-design` skill — “AI-generated design right now clusters around…” tell list:
  <https://github.com/anthropics/skills/tree/main/skills/frontend-design>
- AI slop pattern catalogue (design auditor reference):
  <https://github.com/borghei/Claude-Skills/blob/main/engineering/design-auditor/references/ai_slop_patterns.md>

Kimi's public skills are engineering-only (TUI/docs/PR); there is no Kimi web-design skill to follow,
so the Claude skill is the guide.

## 1. What makes UI look like AI slop (audit checklist used here)

| Tell | Why it reads as generated | What this redesign does |
| --- | --- | --- |
| Warm cream + high-contrast serif + terracotta accent (the current AI default) | The exact palette/type combination most generators converge on | Coffee warmth comes from **depth and material** (espresso ink, jute paper, brass), not a cream+serif cliché; display type is a wide grotesque (Anek Bangla), not a serif |
| Purple/blue gradients, glassmorphism, glowing blobs | Default decoration disconnected from the product | None. Flat ink on paper; a single brass rule is the only ornament |
| Identical rounded cards on every surface, one giant radius | Content forced into a template | A 3-step radius scale; **ledger rows and hairline rules** instead of card grids; cards only where content is genuinely card-like (receipt, method) |
| Soft grey shadow under every card | Fake depth | Two elevations only: hairline lift + true overlay; otherwise borders |
| Emoji as iconography / mixed icon styles | Generic and inconsistent | **RemixIcon only**, outlined, one weight, semantic labels where needed. Zero emoji rendered |
| Decorative circles, rotated cards, floating pills | “AI garnish” with no meaning | Removed. The only non-rectangular shape is the perforated receipt notches, which encode the tear-line |
| Numbered 01/02/03 on content that is not sequential | Template habit | Numbering kept **only** for the real 3-step money/creator sequence |
| Generic CTAs (“Get started”, “Learn more”) and buzzwords | Vague, unverifiable | Specific Bangla verbs: “আপনার পাতার লিংক বানান”, “QR স্ক্যান করে পাঠান”; no buzzword copy |
| Predictable hero → 3 features → proof → pricing → footer | Statistical default ordering | Order follows the argument: the **money path first**, then the creator setup, then the honesty limits, then the receipt demo, then FAQ |
| Fake testimonials, invented stats, logos | Unverifiable trust theatre | Synthetic demo claims are clearly labelled DEMO; no invented metrics, no social proof theatre |
| Uniform card-grid of three features | Template rhythm | Asymmetric editorial: a full-bleed money-path band, a receipt specimen, a two-column honesty ledger |
| Decorative motion on every element | Distraction | No entry animations; motion only as feedback (amount change, copy, claim state) and never under reduced-motion |

## 2. Coffee theme (the “roastery ledger”)

Dark and light are both coffee: **jute paper + espresso ink + brass + roasted caramel**. Nothing reads
fintech, nothing reads SaaS-purple.

| Token | Light | Dark |
| --- | --- | --- |
| `--bg` | `#f1e8db` jute paper | `#150f0a` espresso night |
| `--surface` / `--raised` | `#fbf6ec` / `#fffdf8` milk foam | `#1f1711` / `#291f17` |
| `--ink` | `#241811` espresso | `#f3e9dc` crema |
| `--muted` | `#6e5b4b` roast grey | `#b9a794` |
| `--line` / `--line-strong` | `#ddcfbd` / `#c7b49d` | `#3a2c21` / `#513e2d` |
| `--accent` | `#9b5521` roasted caramel | `#d9a04b` brass |
| `--accent-soft` | `#f1dfc9` | `#3a2a18` |
| success / warn / danger | olive `#4f6b3b` / amber `#a66a12` / oxblood `#8e2f26` | muted versions |
| QR | always `#1b120c` on `#ffffff` | same — never inverted |

Type (user-directed override, later in the build): **Spectral** for Latin + **Noto Serif Bengali** for
Bangla/৳, one serif family visible across both scripts. This intentionally departs from the anti-slop
rule against "cream + high-contrast serif + terracotta": the palette is jute/espresso/brass (not the
generator cream/terracotta), the display voice is a low-contrast screen serif, and the ledger/receipt
structure carries the identity. `ui-monospace` is reserved for actual receipt data (slug, reference,
txid); amounts keep tabular figures via `--amount-feature-settings`. Numbers are Latin
digits; ৳ is allowed to fall back to the Bengali face.

Shape: `radius-xs 3 / sm 6 / md 8 / lg 12 / xl 16 / pill 999`. Shadows: hairline (`--shadow-xs`) and
overlay (`--shadow-lg`) only. Borders and paper carry hierarchy.

## 3. The two product-specific motifs (where the personality lives)

1. **The chai receipt (bill slip).** A perforated paper strip is the supporter's core artifact:
   creator name and "counter" line at the top, tabular amount, the QR plate, then a torn stub holding the
   reference/last-updated line and the honesty note. Dashed tear line with punched notches. It appears
   on the supporter page, the poster and the dashboard preview — one memorable element, reused with
   restraint. (Inspiration: the slip metaphor from the Taka QR UI provided by the user.)
2. **The money path.** A horizontal ledger diagram — supporter's app → *(money)* → creator's account,
   with a bracketed note that Chanasta sits **outside** that path. This is the product's entire thesis,
   so it gets the full-bleed band; no other section gets this weight.

Everything else is quiet: hairline rules, left-aligned editorial copy, generous but varied spacing,
no nested cards, no ornament that does not carry information.

## 4. Page direction (structure comes from the supplied boards)

- **Landing** — masthead (cup wordmark, nav, language, creator CTA) · demo strip · asymmetric hero
  with the receipt specimen (not a rotated card) · full-bleed money-path band · "who it's for" ledger ·
  honesty limits · FAQ (details/summary) · closing CTA · footer.
- **Supporter page** — creator identity (RemixIcon avatar, name, tagline, slug) · amount ladder
  (৳20 / ৳50 / ৳100 / ইচ্ছেমতো) · the chai receipt with QR + account methods · claim form and
  self-reported claim ledger · honesty strips · report/engine credit.
- **Onboarding** — 4 steps (email/handle → payment methods → profile → preview/publish), step rail,
  inline decode status, no wizard theatre.
- **Dashboard** — creator header (avatar, slug, status stamp), claims ledger (rows, not cards),
  profile/payments/settings sections, share kit. Tabular, quiet, no floating cards.
- **Poster** — A4 receipt: espresso masthead, QR on white, amount ladder, full account details,
  torn bottom edge, demo mark. Print-safe, mono for numbers.

## 5. Rules for implementers

1. **No emoji anywhere.** Use RemixIcon classes (`ri-…-line`) via `icon()` or inline `<i class="ri-… ri">`.
   Avatars use `avatarIconClass()` from `src/lib/avatars.ts`.
2. **Only the coffee tokens** (`design/coffee.css`). No raw hex outside it and no new fonts.
3. **Radii from the scale only**; pill radius only for status stamps and amount chips.
4. **No decorative circles/blobs/rotations; no gradients; no backdrop blur; no shadows on cards** —
   use hairlines and paper. One overlay shadow for dialogs only.
5. **No new UI libraries.** RemixIcon CSS is bundled; that is the only icon dependency.
6. **Copy stays honest**: no “payment successful / verified payment / refund / we'll inform / secure
   checkout”, claims are always self-reported until the creator marks them confirmed. Keep the demo
   strip and the no-custody line.
7. **Keep functionality**: amount → QR derivation (`withAmount`), screenshot decode, claims, dashboard
   actions, language toggle, share kit, poster download, a11y (44px targets, focus-visible, reduced
   motion, labels) and the JS budget (supporter cold load ≤ ~150 KB).
8. **Copy modules**: don't edit `src/lib/i18n.ts` (Lead-owned). Put page copy in your own
   `src/pages/<area>/copy.ts` as `{ bn, en }` pairs with a small `pick(lang)` helper, or reuse existing
   i18n keys via `ctx.t`. The language toggle re-renders the whole route, so local copy is safe.
9. **Styles**: public workstream owns `src/styles/public.css`; app workstream owns `src/styles/app.css`.
   `src/styles.css` and `src/styles/chrome.css` are Lead-owned (shell, header, footer). Prefix page
   classes (`pub-…`, `app-…`) to avoid collisions.
10. **Reference fidelity**: read the board HTML in `/tmp/chanasta-ui/extracted/chanasta/` for structure
    and Bangla copy; keep its information architecture, then apply the coffee/de-slop rules above.
