# Chanasta — implementation architecture (contract)

Binding technical contract for Phase 3. Product decisions: [blueprint.md](./blueprint.md),
[decisions.md](./decisions.md). Data model: [data-model.md](./data-model.md). Visual language:
[ui-ux.md](./ui-ux.md) + `design/tokens.css`.

## 0. Non-negotiables

- **Chanasta never touches money.** No ledger, balances, escrow, payouts, confirmation, refunds, fees
  on transfers. The app displays creator-owned payment details and stores self-reported claims.
- **Honest labels.** `verified` on a QR means "the payload/checksum/merchant fields decoded", never
  "payment confirmed". bKash Bangla QR decode is verified; Nagad/Rocket/bank QR decoding is
  *unverified*; manual numbers are format-checked only.
- **No real data in the repo.** Demo creators, fake accounts (`01000000000`), synthetic deshiQR
  payloads, Bangla demo names. No analytics with PII.
- Bangla default, English toggle. Mobile-first, fast on 3G.
- Engine: vendored **deshiQR** (`src/lib/deshiqr.ts`, `src/lib/qr.ts`). Never import `vendor/`
  directly; never edit `vendor/` (re-sync with `pnpm sync:deshiqr`).

## 1. Runtime modes

Single static Vite app, two data backends behind one interface:

| Mode | When | Behavior |
|---|---|---|
| **Local demo** (default) | no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and no `window.CHANASTA_CONFIG` | Synthetic demo creators (`@demo-teacher`, `@demo-artist`, `@demo-writer`) + pages the visitor creates, persisted in `localStorage`. No auth: the local "creator" is the browser. A clear banner says data stays in this browser. Everything must be usable offline. |
| **Supabase** | env vars or `window.CHANASTA_CONFIG = { supabaseUrl, supabaseAnonKey }` present | Supabase Auth (magic link), Postgres + RLS, public views, RPCs. Client uses only the anon key. Service-role key never in the app. |

The UI must not know which backend it is on: all reads/writes go through `src/lib/data.ts`.

Storage keys (local mode): `chanasta.lang`, `chanasta.theme`, `chanasta.local.creators`,
`chanasta.local.methods`, `chanasta.local.claims`, `chanasta.local.owner`. Validate/repair corrupted
JSON by resetting that key (never throw).

## 2. Routes

Client-side router, base-path aware (`CHANASTA_BASE`, e.g. `/chanasta/` on GitHub Pages), path routes
with hash fallbacks for hosts without rewrites.

| Route | Page | Notes |
|---|---|---|
| `/` | landing | Live demo creator card, how it works, honesty section, "create your page" |
| `/@:slug` | creator page | Also `#/@slug`, `?c=slug`. States: loading / published / draft preview (owner) / suspended / not-found / no methods |
| `/@:slug/thanks` | claim thanks | Post-claim state; safe to reload |
| `/embed/@:slug` | embed card | Compact, iframe-able, no site nav; own CSP allowance for framing |
| `/onboarding` | 3-step wizard | slug → payment methods → profile → preview/publish (requires auth in Supabase mode; local mode works without) |
| `/login` | magic link | Supabase mode; local mode explains demo |
| `/dashboard` | claims inbox | Newest first, filters, confirm/hide, new-claim badge, share kit |
| `/dashboard/profile` | profile editor | display name, tagline, bio, emoji, socials, publish/unpublish |
| `/dashboard/payments` | payment methods | add/edit/enable/disable/reorder, QR paste or screenshot decode, decode-status labels |
| `/dashboard/settings` | settings | language, delete page (soft), session/logout |
| `/legal/terms`, `/legal/privacy`, `/legal/how-it-works` | legal | Draft banner; plain language; no invented legal entity |
| `*` | 404 | Bangla + English, link home |

Unknown-route and deep-link behavior on static hosts is handled by `public/_redirects` (Netlify) and
`404.html` + `.nojekyll` (Pages, copied by CI).

## 3. Module layout (web)

```
index.html                 meta, fonts, theme bootstrap (CSP hash pinned in _headers)
public/                    _redirects, _headers, favicon.svg, robots.txt
design/tokens.css          design system tokens (single source, owned by UI/UX)
src/main.ts                bootstrap, router mount, global error boundary
src/styles.css             app styles importing ../design/tokens.css
src/lib/
  router.ts                route parsing (base path, @slug, hash/query fallbacks), navigation
  config.ts                runtime config resolution + mode detection
  i18n.ts                  bn/en dictionaries, t(key, vars), <html lang>, persisted choice
  dom.ts                   h() element helper, safe text, focus trap, copy-to-clipboard, toast
  format.ts                BDT amount formatting, dates, pluralisation (uses deshiqr.formatTaka)
  validate.ts              slug rules, claim form validation, URL validation
  qr-payload.ts            decode/derive via vendored engine; jsQR screenshot decode; merchant snapshot
  data.ts                  backend interface + local implementation (async)
  supabase.ts              lazy supabase client, auth, recorded RPC/view mapping (only imported when configured)
  demo.ts                  synthetic creators/methods/claims (no real data)
  poster.ts                A4 poster SVG/PNG generation
  share.ts                 share URLs (WhatsApp/Facebook), embed snippet, copy text
src/components/            primitives (buttons, chips, badges, qr panel, method card, claim card,
                           claim form, disclosure strip, header/footer, dialog, skeleton)
src/pages/                 home, creator, thanks, embed, onboarding, login, dashboard/*, legal, not-found
test/*.test.ts             pure-logic tests (node:test)
supabase/                  schema, seed, docs (platform workstream)
```

## 4. i18n contract

- `bn` is the default; `en` is a visible toggle in header (and persists in `localStorage`).
- Every user-visible string goes through `t(key, vars)`; no hard-coded Bangla/English in components.
- Keys are English-ish (e.g. `creator.cta.buyCha`); dictionaries live in `src/lib/i18n.ts` with both
  languages side by side. Strings come from [brand-copy.md](./brand-copy.md) — don't paraphrase away
  the honesty lines.
- Bangla uses the `আপনি` form. Amounts: `৳` symbol, Bangla numerals are optional (keep Western digits
  for clarity, but amounts get Bangla screen-reader labels such as "৳৫০ — পঞ্চাশ টাকা").
- `<html lang>` follows the toggle; dates via `Intl.DateTimeFormat(lang)`.

## 5. QR / payment-method logic

- Onboarding accepts (a) pasted Bangla QR payload text, (b) QR screenshot uploaded → decode with
  `jsqr` in the browser, (c) manual bKash/Nagad/Rocket number, (d) bank details.
- Payload validation runs through the vendored engine: `decode`/`validate`/`verifyChecksum`. If it
  passes the Bangla QR checks *and* the institution is the NPSB/Bangla QR scheme (`bd.org.bb.npsb`,
  the one bKash issues) → `qr_status = "verified"` with `qr_decoded` merchant snapshot (name, city,
  account, institution). Any other structurally valid payload → `qr_status = "unverified"` with the
  honest label. Image without decodable payload → `image_only` (never claim verification).
- The creator page shows the **creator's own** methods. When a supporter picks an amount, derive a
  dynamic payload with the vendored `withAmount(base, amount)` (keeps account/name/tokens verbatim)
  and render inline SVG via the vendored `encode` + `toSvg`. "ইচ্ছেমতো" shows the static payload.
  Never substitute a Chanasta-owned account.
- Show the decoded merchant name next to the QR so supporters can compare it with the creator's name.
- The claim form stores the *method kind* snapshot, never the account number.

## 6. Data access interface (`src/lib/data.ts`)

Async functions; each has a local implementation and a Supabase implementation:

```ts
getCreator(slug): Promise<Creator | null>
listPublishedCreators(): Promise<CreatorSummary[]>          // landing demo list only
createCreator(input): Promise<Creator>
updateCreator(id, patch): Promise<Creator>                  // profile fields only
setCreatorStatus(id, "published" | "draft"): Promise<Creator>
changeSlug(id, slug): Promise<Creator>
listMyCreators(): Promise<Creator[]>                        // owner
isSlugAvailable(slug): Promise<boolean>

listPaymentMethods(creatorId): Promise<PaymentMethod[]>     // public: enabled only
savePaymentMethod(input): Promise<PaymentMethod>
deletePaymentMethod(id): Promise<void>
reorderPaymentMethods(ids): Promise<void>

listPublicClaims(creatorSlug): Promise<SupportClaim[]>      // unverified + confirmed
listMyClaims(creatorSlug): Promise<SupportClaim[]>          // owner, all statuses, includes txid
submitClaim(input): Promise<{ id; status }>
reviewClaim(claimId, "confirm" | "hide" | "restore"): Promise<SupportClaim>
```

Supabase mode maps these to the views/RPCs in [data-model.md](./data-model.md):

- Public reads: `public_creators`, `public_payment_methods`, `public_support_claims` (anon key).
- Owner reads: base tables under RLS; `support_claims` owner read includes `txid` (private).
- Writes: owner table INSERT/UPDATE for creator/profile/methods (column grants), and RPCs
  `is_slug_available`, `submit_support_claim`, `review_support_claim`, `creator_set_status`,
  `creator_change_slug`.
- Error mapping: surface friendly Bangla/English messages for `SLUG_TAKEN`, `SLUG_RESERVED`,
  `RATE_LIMITED`, `CLAIM_TOO_LARGE`, `NOT_PUBLISHED`, `PUBLISH_NEEDS_METHOD`; unknown errors get a
  generic "আবার চেষ্টা করুন / try again" message. Never render raw SQL errors.

Local mode implements the same interface against `localStorage`, seeding the demo creators on first
run and letting a visitor create a page they own locally (dashboard opens it).

## 7. Supabase wiring (client)

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (or runtime `window.CHANASTA_CONFIG`).
- `@supabase/supabase-js` is **dynamically imported** only when configured, so demo mode never
  downloads it.
- Auth: `signInWithOtp({ email, options: { emailRedirectTo: <origin+bath>/dashboard } })`; handle the
  magic-link hash on load; `onAuthStateChange` updates the shell; logout on settings.
- Public pages must work while signed out.
- All mutations go through the interface above; no direct table writes from components.

## 8. Deployment

- **GitHub Pages demo**: CI builds with `CHANASTA_BASE=/chanasta/`, copies `index.html` → `404.html`,
  adds `.nojekyll`, deploys `.github/workflows/pages.yml`. Demo = local mode.
- **Netlify**: `netlify.toml` (root) + `public/_redirects`; set `VITE_SUPABASE_*` to enable accounts.
- **Supabase**: apply `supabase/schema.sql`, optional `supabase/seed.sql`; configure Auth redirect
  URLs; see `docs/self-hosting.md`.
- `public/_headers`: strict CSP for the app, and allow framing **only** for `/embed/*`
  (`frame-ancestors *`), deny elsewhere; cache immutable assets; `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`.

## 9. Testing contract (no DOM test framework is installed)

`node --test test/*.test.ts` with `node:test` + `node:assert/strict` over **pure logic**:

- router: base path, `/@slug`, hash/query fallbacks, unknown routes
- i18n: both dictionaries have the same keys, interpolation, baked-in honesty strings present
- validate: slug rules (every rejected case from data-model §6), claim amount/name/message/txid limits
- format: BDT formatting, Bangla screen-reader amount wording, dates
- qr-payload: decode the synthetic fixtures, verified vs unverified classification, `withAmount` derivation
- demo: synthetic data shape/consistency (every demo creator has ≥1 enabled method, no real-looking account)
- data (local): create/update/publish/list claims/review transitions, corrupted storage recovery
- poster/share: A4 SVG well-formed, embed snippet correct, share URLs encode the page URL

Static checks instead of DOM tests: build must succeed, `dist/index.html` must reference the base
path, and the built bundle must contain the demo payload + the "no custody" disclosure string (do a
grep check in your report).

## 10. Performance & quality bars

- Supporter page ≤ ~150 KB JS gzip first load; no raster avatars (emoji/initials only); QR is inline
  SVG; fonts with `display=swap`; no tracking pixels.
- WCAG 2.1 AA contrast; 44px touch targets; visible focus; keyboard-operable chips/forms/dialogs;
  `prefers-reduced-motion`; labelled inputs; errors tied to fields.
- Bangla and English copy both reviewed against `docs/brand-copy.md`; no "payment successful",
  "verified payment", "we'll inform the creator", "refund", "secure checkout" language anywhere.
- Every creator page renders the disclosure strip + report link + "Powered by deshiQR" credit.

## 11. Workstream split (Phase 3)

| Workstream | Owns | Must not touch |
|---|---|---|
| **web** | `index.html`, `src/**`, `public/**`, `test/**`, `README`-adjacent UI copy in those files | `supabase/**`, `docs/**`, `design/**`, `vendor/**`, package files, workflows |
| **platform** | `supabase/**`, `scripts/check-sql.mjs`, `docs/api.md`, `docs/self-hosting.md`, `docs/moderation.md`, `examples/**` | `src/**`, `index.html`, `public/**`, `design/**`, `vendor/**`, package files, workflows |
| **lead** | repo integration, workflows, netlify.toml, README, final wiring, publishing | — |

Both workstreams: do not run `pnpm install`, do not commit, synthetic data only, and if you need a
cross-cutting change, message the Lead instead of editing the other side.
