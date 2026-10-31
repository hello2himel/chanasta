# Lead decisions (unblocking UI/UX)

Answers to the open questions in [blueprint.md §14](./blueprint.md). These are binding for UI/UX and
implementation in this build. Anything not listed here defaults to the blueprint's recommendation.

| # | Question | Decision |
|---|---|---|
| 1 | Stack | **Supabase is the backend of record.** The web app is static-first and runs in **local demo mode** without env vars; when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are present it uses Supabase Auth + Postgres + RLS + edge functions. No other backend. |
| 2 | URL scheme | Canonical creator URL is **`/@<slug>`** (path route, hash fallback for static hosts). No `/u/` alias, no short domain in MVP. Domain/handle final choice is deferred; deploy targets are GitHub Pages (demo) and Netlify. |
| 3 | Verification flag | Ship `verified boolean default false` on creators, **never purchasable**, no UI to self-grant. MVP displays no "verified page" badge; if a manual identity review ever starts, the wording is "পরিচয় যাচাইকৃত / Identity-checked by Chanasta", and it never means "payment verified". |
| 4 | Charity / fundraising | **Hard exclusion in MVP.** No "donation", "fund", "campaign", "goal progress as fundraising", no charity categories, no solvency language. Pages soliciting for causes are suspended per the moderation runbook. |
| 5 | Goals | Keep the `goal_amount` column for the future, but **do not render any goal/progress UI in MVP**. The public page shows the amount ladder + claims only. |
| 6 | Claim visibility | **Visible by default as self-reported** (`unverified` with an explicit badge). Creator can mark `confirmed` (still labelled "creator confirmed", never "verified payment") or `hidden`. Moderation can `reject`. |
| 7 | Txid | Optional field, **private to the creator only** (owner read; never in public views/exports, never logged). Retained while the claim exists, deleted with it. |
| 8 | Amount caps | Server/product cap per claim: **min ৳1, max ৳1,00,000**; UI presets stay small (৳20/৳50/৳100/ইচ্ছেমতো, custom input capped). Rate limits in the data model apply. |
| 9 | Admin tooling | **No admin UI in MVP.** Moderation/suspension is a service-role SQL runbook documented in `docs/moderation.md` (written during implementation). |
| 10 | Notifications | **Dashboard badge only** (new claims). No email/push digests in MVP. |
| 11 | Language & address | **Bangla default with a visible English toggle**, `আপনি` form. No per-creator tone setting. English is a sibling, not a machine translation. |
| 12 | Legal entity | Not yet formed. Every legal page ships with a visible **"Draft — pending legal review"** banner; the demo is clearly a demo and not open for real creators until ToS/privacy are reviewed. No real user data in this build. |
| 13 | Reports / moderation SLA | Footer + creator-page **report link** (mailto `hello2himel@proton.me` with the page URL prefilled). Best-effort review within **72 hours** during beta; the SLA is stated in ToS as best-effort, not a guarantee. |
| 14 | Deleted pages / slugs | Soft delete (`deleted_at`), slug **quarantined for 90 days**, hard purge of content after 30 days. No slug reuse during quarantine. |
| 15 | Discovery | **No `/explore` in MVP.** Landing + demo pages only. |

## Additional binding constraints for UI/UX

1. **Money is never on our path.** No UI may imply that Chanasta processes, holds, routes, confirms,
   refunds or guarantees a payment. No "payment successful" states. The claim is a message, not a
   receipt.
2. **Honesty surfaces are part of the design**, not an afterthought: disclosure strip on every creator
   page (Bangla + English), self-reported badge on claims, decode-status label on every payment
   method, "double-check name and number" hint on manual methods, "no fees on money" line.
3. **Performance budget**: supporter page ≤ ~150 KB JS gzip / ~250 KB total on first load, inline SVG
   QR (no image requests), system/`font-display: swap` Bengali + Latin fonts, works on 3G and a
   mid-range Android. No client tracking pixels.
4. **Bangla typography is first-class**: pick and specify actual Bangla-capable font families
   (self-hosted or Google Fonts with swap), correct line-height and numeral handling; test with real
   Bangla strings from `docs/brand-copy.md`.
5. **Accessibility**: WCAG 2.1 AA contrast, 44px touch targets, visible focus, keyboard-operable
   amount chips/claim form, `prefers-reduced-motion`, labelled inputs, error text tied to fields.
6. **Demo mode must look complete**: synthetic creators (`@demo-teacher`, `@demo-artist`,
   `@demo-writer`), clearly labelled DEMO, with fake account details (`01000000000`, `DEMO STORE`
   style) and the deshiQR synthetic payloads. No real data.
7. **Engine credit**: disclose "Powered by deshiQR" (the dev-facing Bangla QR engine) in the footer,
   linking to https://github.com/hello2himel/deshiQR.
8. **Design scope**: one visual language for supporter pages, creator dashboard and embed widget;
   tokens live in `design/tokens.css` and are the single source of truth for implementation.

## Additional resolutions (recorded after the UI/UX handoff)

1. **Amount-bearing QR is approved** (supersedes the older "chips must not change the QR" note in
   `docs/ui-ux.md` §4.1.1). The supporter page derives the QR with the selected amount
   (`withAmount`, per `docs/architecture.md` §5), keeping account/name/city/tokens verbatim, and
   falls back to the static payload for **ইচ্ছেমতো**. UI copy may say the selected amount is placed
   in the QR; it must never promise that a provider app will pre-fill or skip steps.
2. **Legal banner scope**: the "draft — pending legal review" banner appears on the three `/legal/*`
   pages only, plus a one-line "beta · draft terms" footer note. Creator pages carry the normal
   honesty/disclosure copy instead.
3. **Report path/SLA**: mailto `hello2himel@proton.me` with the page URL, best-effort review within
   72 hours, stated as best-effort in the ToS and moderation runbook.
4. **Poster** shows the full account number (it is the creator's public payment info and the poster is
   meant for manual entry); the web page keeps the masked-by-default reveal.
5. No CSV/export in the MVP.
6. **QR "verified" status is derived in the browser and stored with the method.** The database enforces
   payload CRC validity and that a `verified` method's decoded institution is the NPSB scheme, but it
   cannot prove the creator owns the account: the badge is about **data shape**, and supporters must
   still compare the merchant name and scan the creator's own QR. No identity verification exists in
   this build.
