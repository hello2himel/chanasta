# Chanasta · চানাস্তা

**এক কাপ চা, এক প্লেট নাস্তা — supporters' treat, straight to your account.**

[![CI](https://github.com/hello2himel/chanasta/actions/workflows/ci.yml/badge.svg)](https://github.com/hello2himel/chanasta/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-hello2himel.github.io%2Fchanasta-c25a2e)](https://hello2himel.github.io/chanasta/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Chanasta is **"Buy Me a Coffee" for Bangladesh**: one public page (`/@username`) where supporters can
treat a creator, teacher, writer, streamer, artist or community organiser to a cup of cha and a plate
of nasta. Supporters scan the creator's **own** Bangla QR (bKash, or any app that accepts Bangla QR) —
and the money goes **directly into the creator's own bKash / Nagad / Rocket / bank account**.

## Chanasta is not a payment processor

- We **never hold, route, settle, refund or confirm** money. No balances, no escrow, no payouts.
- We **never take a cut** of a transfer — no fees on money, ever.
- We only **display the creator's own payment information** and let supporters leave a
  **self-reported** "I sent ৳X" message that the creator can confirm or hide.
- A claim is a message, not a receipt. A creator's confirmation is their own manual note, not our
  verification. There is no automated payment confirmation anywhere in this product — by design.
- This keeps Chanasta out of the money flow and the licensing duties that come with handling funds
  (Bangladesh Bank / PSP territory). See [`docs/compliance.md`](./docs/compliance.md) and
  [`SECURITY.md`](./SECURITY.md).

## Live demo

**<https://hello2himel.github.io/chanasta/>** — runs entirely in your browser with synthetic demo
data, no account, no backend:

- `/@demo-teacher` — verified synthetic bKash QR
- `/@demo-artist` — unverified QR + manual bKash
- `/@demo-writer` — manual bKash / Rocket

All demo pages are labelled DEMO, use the fake account `01000000000` and dummy Bangla QR payloads, and
cannot receive money. You can also create and manage your own page locally in the browser.

## How it works

**Supporter** → opens `/@creator` → picks ৳20 / ৳50 / ৳100 / ইচ্ছেমতো → scans the creator's QR in their
own banking app and sends the money → optionally leaves a name + thank-you message + transaction id.

**Creator** → signs in (or uses the local demo) → adds their own Bangla QR (paste payload or upload a
screenshot; decoded and checksum-verified in the browser) and/or account numbers → writes a short
profile → publishes → shares one link, posters and an embed snippet.

## What's in the MVP

| Area | What ships |
| --- | --- |
| Supporter page | Bangla-first + English toggle, emoji avatar, story, amount ladder, amount-bearing QR (payee fields untouched), decoded merchant name, honest decode labels, copy/reveal account, other methods, self-reported claims, report link |
| Claims | Anonymous self-reported claim (amount, optional name/message/txid, method) · creator confirm/hide/restore · "not a receipt" wording everywhere · no automated confirmation |
| Creator onboarding | Magic-link sign-in, slug rules + reserved names, QR paste/screenshot decode, manual bKash/Nagad/Rocket, bank details, profile, preview, publish |
| Share kit | Copy link, WhatsApp/Facebook share, A4 poster (SVG/PNG), iframe embed snippet, `/embed/@slug` card |
| Dashboard | Claims inbox with filters, profile editor, payment-method editor with reorder, settings, soft delete |
| Trust & safety | Self-reported and creator-confirmed badges, disclosure strip, no-custody copy, report path, reserved slugs, private txid, synthetic demo data |
| Deployment | Static Vite app; local demo mode with zero backend; optional Supabase (Auth + Postgres/RLS + RPCs) for real accounts |

## Verification honesty

| Payment method | What we check | What the page says |
| --- | --- | --- |
| bKash Bangla QR | deshiQR decode + CRC-16 checksum + required merchant fields (NPSB scheme) | **যাচাই করা ব্যাংলা QR (বিকাশ) / Verified Bangla QR (bKash)** — data verified, *not* a payment |
| Nagad / Rocket / other Bangla QR | structural decode only, not verified against real provider payloads | **অযাচাইকৃত / Unverified** + "check the name and number before sending" |
| Images that do not decode | nothing | **শুধু ছবি / Image only** |
| Manual bKash/Nagad/Rocket numbers, bank accounts | format checks only | plain account details, no badge |

"Verified" never means money moved. bKash QR decoding is verified today (via deshiQR); support for the
other providers' QR payloads is planned and unverified.

## Built on deshiQR

The Bangla QR payload logic and QR encoder come from
[**deshiQR**](https://github.com/hello2himel/deshiQR) — the developer-facing engine (zero-dependency
library, QR encoder, web component, invoice API). Chanasta vendors a **pinned copy** under
[`vendor/deshiqr/`](./vendor/deshiqr) (`VENDOR.json` records the exact commit) so this repo builds
anywhere without a registry. Re-sync with:

```sh
pnpm sync:deshiqr
```

## Stack

- **App:** static [Vite](https://vite.dev) + vanilla TypeScript, no UI framework. Bangla-first CSS from
  [`design/tokens.css`](./design/tokens.css) (Figtree + Noto Sans Bengali, warm "tea-stall honest"
  palette, dark mode, A4 print styles).
- **Backend (optional):** Supabase — Postgres schema with RLS, public views, and SECURITY DEFINER RPCs
  for claims, publishing, slug changes and reordering. Nothing about money.
- **Local demo mode:** default when no Supabase env vars are present; everything persists in
  `localStorage` and works offline.
- **Tests:** `node:test` pure-logic suite plus a PGlite harness that applies the real schema and
  asserts the RLS/RPC security model (255 assertions).

## Quick start

```sh
pnpm install
pnpm dev            # http://localhost:5180 — local demo mode, no backend
pnpm test           # web logic tests
pnpm build          # static build in dist/
node scripts/check-sql.mjs   # apply schema in PGlite + assert RLS/RPC behavior
pnpm typecheck
```

To enable real accounts, follow [`docs/self-hosting.md`](./docs/self-hosting.md): create a Supabase
project, run [`supabase/schema.sql`](./supabase/schema.sql), optionally seed the demo data, then set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Netlify env vars or a runtime
`window.CHANASTA_CONFIG`).

## Docs

- [Product blueprint](./docs/blueprint.md) — positioning, personas, scope, metrics, launch plan
- [Lead decisions](./docs/decisions.md) — the binding product/technical decisions
- [Data model](./docs/data-model.md) — tables, enums, RLS intent, claim state machine, RPCs
- [Architecture](./docs/architecture.md) — runtime modes, routes, data interface, QR flow, deployment
- [UI/UX handoff](./docs/ui-ux.md) + [design tokens](./design/tokens.css) — components, wireframes, a11y, perf
- [Compliance](./docs/compliance.md) — the Bangladesh / "not a payment processor" boundary
- [Brand & copy](./docs/brand-copy.md) — Bangla + English voice and every key string
- [API](./docs/api.md) — public Supabase REST/RPC surfaces, errors, embed rules
- [Self-hosting](./docs/self-hosting.md) — Supabase + Netlify + Pages setup
- [Moderation runbook](./docs/moderation.md) — reports, hiding/rejecting, suspension, retention

## Safety & compliance summary

- Charity/fundraising is **out of scope** for this build; such pages can be suspended.
- Impersonation: the page shows the creator's own details verbatim and a report link, but there is no
  identity verification — never trust a link just because it is hosted here.
- txid and IP hashes are private; public views never expose them.
- Legal pages ship with a visible **draft — pending legal review** banner; no legal entity is claimed.
- **Get local legal advice before monetising anything money-adjacent.**

## Roadmap

Verified QR decoding for Nagad/Rocket/bank payloads (once real samples exist in deshiQR's test suite) ·
identity-verification program (badge wording: "পরিচয় যাচাইকৃত", never "payment verified") · creator
themes/custom domain as paid **software** features (never a cut of money) · richer analytics without PII
· moderation tooling · an official provider API partnership if one ever makes sense.

## License

[MIT](./LICENSE) © Himel Das. Not affiliated with bKash, Nagad, Rocket or NPSB. Chanasta does not
process payments.
