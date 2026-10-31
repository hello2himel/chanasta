# Contributing to Chanasta

Chanasta is a Bangladeshi "buy me a coffee" (চা + নাস্তা): a public support page where supporters send
money **directly to a creator's own bKash / Nagad / Rocket / bank account**. We only display payment
information and store self-reported "I sent it" claims.

## The two hard rules

1. **No custody, ever.** No ledger, balance, escrow, payout, refund or payment-confirmation feature.
   Money must never enter Chanasta. A pull request that adds a money path will be rejected.
2. **No real payment data.** No real QR payloads, account numbers, names, tokens, emails or
   screenshots in code, fixtures, seeds, examples, docs or tests. Every fixture is synthetic:
   account `01000000000`, `DEMO STORE`-style dummy payloads, fake creators (`@demo-*`).

Also non-negotiable: honest labels. "Verified" on a QR means *the payload/checksum/merchant fields
decoded* (bKash Bangla QR today; Nagad/Rocket/bank decoding is unverified). It never means a payment
happened. Claims are always shown as **স্ব-ঘোষিত / Self-reported** until a creator marks them
**ক্রিয়েটর নিশ্চিত করেছেন / Creator confirmed** — which is still not our verification.

## Setup

Requirements: Node >= 22.18, pnpm 12.

```sh
pnpm install
pnpm dev          # http://localhost:5180 — local demo mode, no backend needed
pnpm test         # node:test, pure logic
pnpm typecheck
pnpm build
pnpm sync:deshiqr # re-vendor the deshiQR engine (see below)
```

To exercise Supabase mode, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; see
[`docs/self-hosting.md`](./docs/self-hosting.md).

## Layout

| Path | What |
| --- | --- |
| `docs/` | Product blueprint, data model, compliance, brand/copy, decisions, architecture, UI/UX, API, hosting, moderation |
| `design/tokens.css` | The design system — single source of truth for colour/type/spacing |
| `src/` | The static Vite app (vanilla TS, no framework) |
| `test/` | `node:test` pure-logic tests |
| `supabase/` | Schema, RLS/RPCs, synthetic seed |
| `scripts/check-sql.mjs` | PGlite harness that applies the schema and asserts the security model |
| `vendor/deshiqr/` | Pinned, vendored deshiQR engine. **Do not edit.** |

## The deshiQR engine

Bengali QR payload logic and the QR encoder live in
[deshiQR](https://github.com/hello2himel/deshiQR), vendored here at a pinned commit and re-exported by
`src/lib/deshiqr.ts` / `src/lib/qr.ts`. Changes belong in the deshiQR repo; afterwards run
`pnpm sync:deshiqr` and commit the refreshed `vendor/deshiqr/` (the `VENDOR.json` records the commit).

## Conventions

- TypeScript strict; relative imports use explicit `.ts` extensions; no runtime dependencies beyond
  `@supabase/supabase-js` (lazy-loaded) and `jsqr` (only used for screenshot decoding).
- Every user-visible string goes through `src/lib/i18n.ts` in **both** `bn` and `en`; Bangla is the
  default and uses the `আপনি` form. Copy comes from `docs/brand-copy.md`.
- Use `design/tokens.css` variables — no hard-coded colours/spacing in components.
- Tests use `node:test` + `node:assert/strict`, no test framework and no DOM emulator. Keep logic in
  pure modules so it can be tested.
- Never render raw database errors; map error codes to friendly Bangla/English messages.
- txid is private to the creator: never in a public view, response, log or test fixture.

## Adding a demo creator (or changing demo data)

Demo data lives in `src/lib/demo.ts` (local mode) and `supabase/seed.sql` (Supabase seed). Use fake
accounts only (`01000000000`), clearly mark pages as DEMO in Bangla and English, and give every creator
at least one enabled payment method.

## Before opening a PR

- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` pass
- [ ] `node scripts/check-sql.mjs` passes if you touched SQL
- [ ] No real payment data anywhere
- [ ] Both `bn` and `en` strings present and reviewed against the brand guide
- [ ] No language implying Chanasta processes, holds, confirms or refunds money
- [ ] Disclosure strip, self-reported badge and report link still present on creator pages

## Licence

MIT. By contributing you agree your changes are licensed under the same terms.
