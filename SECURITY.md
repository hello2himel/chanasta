# Security policy — Chanasta

## What Chanasta is, in security terms

Chanasta is a **static web app + optional Supabase project** that publishes a creator's own payment
details (a Bangla QR payload, account numbers, bank details) and stores **self-reported** "I sent it"
messages from supporters.

It is **not** a payment processor, wallet, escrow or payout service:

- Money moves directly between the supporter and the creator, inside the provider's own app.
- Chanasta never holds, routes, settles, confirms, refunds or guarantees a payment.
- Chanasta cannot tell whether a supporter actually paid; a claim is a message, and a creator's
  "confirmed" mark is the creator's own manual note. Neither is "payment verified".
- Running a payment service in Bangladesh may require a licence. Do not add money-handling features
  without legal review.

## What we protect

- **Creator accounts** (Supabase Auth + RLS): a creator can only read/write their own rows. Public
  reads go through `public_creators`, `public_payment_methods`, `public_support_claims`; the base tables
  are not readable by `anon`.
- **txid and IP hashes** are private: never exposed in public views, API responses, client renders,
  logs or exports. Retained only while needed for the claim (IP hash purged on the retention schedule).
- **Slugs** are unique, format-validated, and a reserved list blocks routes and brand/provider names
  (`bkash`, `nagad`, `chanasta`, `dashboard`, …) to limit impersonation and squatted pages.
- **Anonymous claims** are only accepted through a `SECURITY DEFINER` RPC with validation and
  rate limits (per salted IP hash and per creator); direct table writes are not granted to `anon`.

## What we cannot protect against

- **Impersonation.** Anyone can publish a page with a creator's name and reuse their public QR. We
  show the creator's own details verbatim, never a Chanasta account, and provide a report path — but
  there is no identity verification in this build. Treat `verified` as "the QR data decoded", never
  as "this page is authentic".
- **Fake claims.** Supporters can lie. Claims are labelled self-reported; creators confirm at their
  own discretion. Never rely on a claim as proof of payment.
- **Wrong account details.** If a creator edits their details, supporters may send to the old account.
  We show a "last updated" timestamp and tell supporters to double-check the name and number.
- **Fundraising abuse.** Charity/fundraising is out of scope and may be suspended per the moderation
  runbook.
- **Self-declared QR verification.** A creator's QR method is marked `verified` when the browser
  decodes a structurally valid NPSB/Bangla QR payload with a matching checksum; the database enforces
  the payload CRC and scheme consistency. That still does not prove the creator owns the account. The
  badge describes the data, not the person — supporters must compare the merchant name and scan the
  code the creator actually shared.

## No real data in this repository

All seeds, fixtures, demo pages and tests are synthetic (`01000000000`, DEMO creators, dummy NPSB
tokens). Never open a pull request containing a real QR payload, account number, screenshot, email or
transaction id.

## Reporting a vulnerability

Email **hello2himel@proton.me** with a description, impact, reproduction steps and the affected
deployment. Do not open a public issue for a live vulnerability. We aim to acknowledge within 72 hours
and ship a fix or mitigation within 14 days for confirmed issues. Coordinated disclosure is
appreciated; credit will be given unless you prefer otherwise.

## Hardening checklist for self-hosters

- Apply `supabase/schema.sql` completely — the RLS policies, column grants and public views are the
  security model, not optional extras. Run `node scripts/check-sql.mjs` to verify them.
- Never ship the Supabase **service-role key** to the browser. The app uses the anon key only; the
  service role is only for moderation SQL.
- Restrict the Supabase Auth redirect URL to your real origin; enable email confirmation.
- Set a real CSP via `public/_headers` (the default denies framing except `/embed/*`), keep
  `X-Content-Type-Options: nosniff`, and serve over HTTPS.
- Keep `frame-ancestors *` scoped to the embed route only.
- Review reports and clear spam claims per [`docs/moderation.md`](./docs/moderation.md).
- Keep dependencies updated; the app has only two runtime dependencies by design.
