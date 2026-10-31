# Changelog

All notable changes to Chanasta are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-11-01

Coffee-theme, de-slopped redesign of the whole product (from a supplied five-board design).

### Changed

- **New visual language**: "roastery ledger" — jute paper, espresso ink, brass/caramel accent, Spectral
  + Noto Serif Bengali typography, coffee token layer in `design/coffee.css`.
- **Receipt motif**: the supporter page, poster, thanks slip and onboarding preview now share a
  perforated "chai receipt" with punched notches; the landing page keeps a receipt specimen and the
  money-path band as its only full-bleed moment.
- **De-slopped UI**: no gradients, blur, rotated/decorative cards, emoji or mixed icon styles; a
  tightened radius scale, two elevation levels, ledger rows instead of card stacks, and honest,
  specific CTAs. **RemixIcon** replaces the old inline SVG set and every emoji avatar.
- **Creator app**: onboarding rebuilt as a quiet 4-step rail with a RemixIcon avatar picker, live
  receipt preview and decode stamps; dashboard rebuilt as a ledger (creator header with mono slug and
  status stamp, claims ledger with private TxID revealed only on expand, profile/payments/settings in
  the same language).
- Landing, supporter, thanks, embed, 404, login and legal pages all rebuilt; header/footer/demo strip
  restyled as a coffee ledger shell.

### Fixed

- Footer now stays pinned to the viewport on short pages.
- `@import` ordering in `styles.css` (workstream stylesheets are now bundled instead of dropped).
- Claim details are removed from the DOM when collapsed, so a private TxID cannot be exposed by CSS.
- Print poster uses the receipt layout, serif print families and no emoji.

## [0.1.0] — 2026-11-01

First public release. A Bangla-first "buy me a coffee" that never touches money.

### Added

- **Supporter pages** at `/@username` (Bangla default + English toggle, light/dark): amount ladder
  (৳20 / ৳50 / ৳100 / ইচ্ছেমতো), amount-bearing Bangla QR derived with the deshiQR engine (payee fields
  verbatim), decoded merchant name, honest decode-status labels, copy/reveal account details, other
  payment methods, self-reported claim list, report link, "Powered by deshiQR" credit.
- **Self-reported claims**: anonymous claim form (amount, optional name/message/txid, method), thanks
  page, creator confirm/hide/restore, explicit **স্ব-ঘোষিত / Self-reported** and **ক্রিয়েটর নিশ্চিত
  করেছেন / Creator confirmed** badges. No automated payment confirmation by design.
- **Creator onboarding**: 4-step wizard (slug → payment methods → profile → preview/publish), pasted
  Bangla QR payload or QR-screenshot decode (jsQR), manual bKash/Nagad/Rocket numbers, bank details,
  verified/unverified/image-only classification, share kit with A4 poster and iframe embed snippet.
- **Dashboard**: claims inbox with filters and new-claim badge, profile editor, payment-method editor
  (add/edit/enable/disable/reorder), settings, soft delete, magic-link auth in Supabase mode.
- **Embed** `/embed/@slug` compact iframe card; examples for link, iframe and widget.
- **Local demo mode** — the default with no backend: three synthetic demo creators
  (`@demo-teacher`, `@demo-artist`, `@demo-writer`), synthetic claims, and a visitor-created local page
  in `localStorage`; clearly labelled DEMO in both languages.
- **Supabase backend** (optional): schema with CRC-validated Bangla QR payloads, slug/reserved-name
  protection, RLS (anon has zero base-table access), public views that never expose `txid`/`ip_hash`,
  and SECURITY DEFINER RPCs for claims, publishing, slug changes and ordering, all rate-limited.
- **Documentation**: product blueprint, data model, compliance boundary ("not a payment processor"),
  brand + Bangla/English copy guide, Lead decisions, architecture contract, UI/UX handoff with 30
  components and measured contrast, API reference, self-hosting guide, moderation runbook.
- **Tooling**: PGlite SQL harness (255 assertions over schema/RLS/RPCs), CI (typecheck, tests, build),
  GitHub Pages demo deploy, Netlify config, synthetic seed data.

### Security

- No real payment data anywhere: all fixtures and demos use fake accounts (`01000000000`) and dummy
  Bangla QR payloads.
- No fund custody, no money flow, no fees on transfers; claims are messages, never receipts.
- Private `txid` and `ip_hash`; strict CSP with pinned inline-script hash; embed framing allowed only
  for `/embed/*`.
