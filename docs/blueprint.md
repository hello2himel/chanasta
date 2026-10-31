# Chanasta — Product Blueprint

**Status:** Phase 1 · decision document for UI/UX and engineering
**Owner:** product-architect · **Last updated:** 2026-11-01
**Companion docs:** [data-model.md](./data-model.md) · [compliance.md](./compliance.md) · [brand-copy.md](./brand-copy.md)
**Binding decisions:** [decisions.md](./decisions.md) — the Lead's answers to §14; that file wins where it differs from this blueprint.

---

## 1. One-liner & positioning

> **Chanasta (চানাস্তা) is "Buy Me a Coffee" for Bangladesh:** one Bangla-first link that lets anyone buy a creator a cup of cha, with the money sent **directly into the creator's own bKash / Nagad / Rocket / bank account**.

**What it is (paragraph 1).** A creator, teacher, writer, streamer, artist or community organiser publishes a public page at `chanasta.example/@username` (final domain deferred — Lead decision #2). The page shows their own Bangla QR (bKash, or any app that accepts Bangla QR) and their other payment details, alongside a warm "thank you for reading/watching/learning" story. A supporter scans the creator's own QR or copies the creator's account number, sends money inside their own provider app, and lands back on the page to optionally say *"I sent it"*. That claim is self-reported: the creator can confirm it manually, hide it, or leave it unverified. Chanasta's job ends at publishing accurate information and carrying messages — **the money never enters Chanasta**.

**What it isn't (paragraph 2).** Chanasta is **not a payment processor, wallet, escrow, payout platform, or donation platform**. It never holds, routes, settles, refunds or confirms money; it has no balances, no payouts, and takes no cut of any transfer. It cannot tell whether a supporter actually paid, and it never claims to. Claims are statements by supporters, visible as *self-reported* (or *creator-confirmed*) — never as "verified payment". Chanasta is a publishing and messaging tool, and every page says so plainly in Bangla and English.

**Positioning sentence for the landing page:** *"আপনার টাকা, সোজা তাঁর কাছে। / Your money, straight to them."*

---

## 2. Bangladesh context (why this must be built here, not ported)

Use these points for landing-page and pitch copy. **No invented statistics** — validate any number with current provider data before it goes in marketing.

| Constraint | What global "Buy Me a Coffee" assumes | What is true in Bangladesh | Chanasta's answer |
|---|---|---|---|
| Rails | Stripe / PayPal / Connect; card-first checkout | Cards are not the default for individuals; mobile financial services (bKash, Nagad, Rocket) and bank accounts are | Money moves inside the creator's existing provider app — no card, no merchant account |
| Onboarding | Platform collects funds, pays out later | Creators want money **now**, in their own wallet, not a platform balance | Direct transfer to the creator's account; zero payout cycle |
| Language | English-first UI | Supporters read Bangla; English is secondary | Bangla-first copy, English toggle |
| Devices | Desktop, fast broadband | Mobile-first, low-end Android, metered data | Static page, inline SVG QR, no app install, small JS budget |
| Trust | Brand is the intermediary | Supporters trust a familiar name + the creator's own QR more than an unknown account | Show the creator's QR/account verbatim; never show Chanasta's account |
| Culture | "Tip" as a foreign habit | The everyday thank-you is **"এক কাপ চা খাওয়ান"** — buy me a cup of tea, or a plate of snacks | Product language is cha + nasta, not "donation" |
| Regulation | Platform is a licensed money handler | Money-handling requires a licensed PSP/MFS relationship; unlicensed custody is a serious risk | Deliberately stay outside the money flow (see [compliance.md](./compliance.md)) |

**Implication for engineering:** no server-side ledger, no webhook that "marks paid", no reconciliation. Any feature that would require us to know the truth about a transfer is out of scope by design.

---

## 3. Target creators & personas

Synthetic personas only — every name/account in this repo and its demos is fake.

### Persona A — "Rafiq", the tutorial creator (primary)
- **Who:** 28, runs a Bangla YouTube/Facebook tutorial channel (HSC math, mobile photography, freelancing). ~20k–100k followers. Works from home in a district town.
- **Wants:** keep tutorials free; earn a small, predictable thank-you income; one link for video descriptions and Facebook bio.
- **Constraints:** Android phone, mobile data, no company, no Stripe, no card. His audience is students who can pay only via bKash.
- **Why Chanasta:** "এক কাপ চা খাওয়ান" link under every video; supporters pay into his own bKash; he posts a screenshot of a nice message as social proof.
- **Success signal:** ≥1 support claim per week from pinned links; repeats from the same supporters.

### Persona B — "Nusrat", the writer / indie developer
- **Who:** 24, writes Bangla essays and publishes small web tools; audience includes diaspora Bangladeshis.
- **Wants:** a clean, non-corporate support page that doesn't sell anything; can accept bKash **and** a bank account (for supporters abroad who can't use bKash).
- **Why Chanasta:** one page with multiple methods, an English toggle, and an honest "I don't process payments" line.
- **Success signal:** shares the page proactively; supporters leave messages that she can confirm and reply to publicly (via the message, not DMs — DMs are not in MVP).

### Persona C — "Shahidul Sir", the tuition teacher (offline-first)
- **Who:** 41, teaches physics to Class 9–12 students; parents ask "কীভাবে টাকা দেব?" every month.
- **Wants:** a page he can show from his phone; parents scan and send; he does not want a full e-commerce app or monthly subscription software.
- **Why Chanasta:** a simple `/@shahidul-sir` page with preset amounts (৳500, ৳1,000, "ইচ্ছেমতো") and his own bKash QR.
- **Success signal:** time-to-first-page under 5 minutes; support claims used as a lightweight "I sent my monthly fee" note — **never** as an attendance or payment register. Chanasta must not market itself as school fee management.

### Persona D — "Ayesha", the community organiser / mosque committee (handled with caution)
- **Who:** 35, coordinates a neighbourhood iftar/relief effort; also an artist who paints. Community groups want a link to collect contributions.
- **Wants:** one link to share in a WhatsApp group; transparency about who gave what.
- **Why Chanasta:** the support page works, but **charity/fundraising is not a supported MVP use case** — it raises legal, trust and verification questions (see [compliance.md §6](./compliance.md)). We do not use "donation", "fund", "campaign", or progress-as-verified language, and we may suspend pages that solicit for charitable causes.
- **Success signal (for the artist half of this persona):** support claims with warm messages; no fundraising mechanics.

**Primary persona for MVP design decisions:** Persona A. If a screen works for Rafiq on a ৳12k Android phone over 3G, it works.

---

## 4. Jobs-to-be-done & supporter motivations

### Creator jobs
| When… | I want to… | So that… |
|---|---|---|
| Someone asks "কীভাবে সাপোর্ট করব?" | send one link instead of typing account numbers | I stop repeating myself and don't leak details to strangers |
| My free work helps people | receive small thank-yous without invoicing, haggling or a merchant account | supporting me feels as casual as buying me a cha |
| I check my page | see who said they sent something, and mark the ones I can see in my app | I can say thank you and keep the page trustworthy |
| I set up | finish in one sitting on my phone | I publish today, not "someday" |
| I share | paste a link in my bio, video description or website | new supporters find me without an app install |

### Supporter jobs
| When… | I want to… | So that… |
|---|---|---|
| I just learned/laughed/enjoyed something free | quickly say thanks in a familiar way | I feel like a good human, not a customer |
| I'm on mobile data | load and pay in under a minute | I don't abandon the gesture |
| I don't know the creator personally | see their real name and their own QR | I'm confident I'm supporting the right person |
| I'm worried about scams | see an honest statement of what the site can and cannot do | I trust the page more, not less |
| I want to be acknowledged | leave my name and a small message | the creator sees me and can confirm it |

### Supporter motivations (design for these, in this order)
1. **Thank + belong** — "I've been watching for two years, here's a cha."
2. **Buy a unit, not make a payment** — the amount ladder (৳20 / ৳50 / ৳100 / custom) makes the amount decision trivial.
3. **Low-risk experiment** — no account, no card, no app download on Chanasta; they already have bKash.
4. **Public acknowledgment** — a name + message on the page (optional, moderated by the creator).
5. **Reciprocity for a specific artifact** — "this video saved my exam" → optional message prompt after the money step.

Anti-motivations to design against: guilt, pressure, exclusivity ("only supporters get content" — explicit non-goal in MVP), and any implication that paying gives a receipt, refund or verified status.

---

## 5. Product principles

1. **No custody, ever.** Chanasta is never on the money path. No balances, escrow, payouts, collection accounts, refunds or confirmations. This is a product invariant, not a setting.
2. **Honesty over polish.** Every page shows, in Bangla and English, that Chanasta does not process payments and that claims are self-reported. Verification labels describe the data we actually checked (e.g. QR checksum + merchant fields), never a transfer.
3. **Bangla-first, English alongside.** Supporter pages default to Bangla; English is a toggle, not the base. Copy uses natural Bangla, not transliteration.
4. **Zero-friction and tiny.** No supporter account, no app install. Inline SVG QR, system fonts, a first-load budget of ~150 KB JS gzip and ~250 KB total on the supporter page; graceful on 3G.
5. **The creator owns their identity and their money.** Their QR, their account details, their voice. Chanasta publishes; the creator receives.
6. **Shareable by default.** Every creator page is a good screenshot: name, one QR, one line of honesty, `/@username`.
7. **Embeddable for the open web.** A one-tag embed for blogs, portfolios and docs sites; no tracking scripts beyond privacy-friendly aggregate counts.
8. **Boring, auditable surfaces.** Static front end, managed Postgres, RLS, no service keys in the client, synthetic data in every demo and test. Payments are never automated, so there is no reconciliation to get wrong.

---

## 6. MVP scope vs explicitly-not-now

| Area | MVP (must ship) | Explicitly not now | Why |
|---|---|---|---|
| Creator page | `/@username` public page, Bangla default + English toggle, avatar emoji, tagline, bio, socials, honesty disclosure | Themes, custom domains, custom fonts, video | Static + simple = fast + cheap |
| Payment methods | bKash Bangla QR via **payload paste or QR screenshot decode** (verified decode badge on success), bKash number, Nagad number, Rocket number, bank account details; enable/disable + sort | Nagad/Rocket/bank **QR payload decoding** (planned, unverified), automatic provider APIs, saved cards | deshiQR's decoder is verified for bKash-issued NPSB payloads only; see §9 |
| Amount ladder | Presets ৳20 / ৳50 / ৳100 / ইচ্ছেমতো (custom); locked-amount links are creator-optional | Goal/progress UI (column reserved, not rendered in MVP), goal-as-fundraiser, monthly recurring, tiers, memberships, paid content | Amount choice is a UX decision, not a billing product |
| "I sent it" claim | Amount + optional name, message, method, txid; unverified by default; public claim list; creator confirm/hide | Any automatic confirmation, SMS reading, API reconciliation, refunds, receipts | Legal/ToS: we cannot know money moved |
| Creator account | Magic-link auth, onboarding wizard, dashboard (claims inbox, methods, profile, publish/unpublish, link + embed snippet) | Teams/organisations, multiple pages per account, roles, admin UI | One creator = one page = MVP |
| Discovery | Landing page, example pages, docs | Public `/explore` directory, search, rankings, comments/feed | Scam surface, curation burden, SEO spam |
| Notifications | In-dashboard badge ("new claims") | Email/push notifications, weekly digests | Deliberately deferred; creators check dashboard |
| Verification | Honest engine labels; optional manual creator-confirmed claims | Paid verification, identity verification program, "official" badges, provider API partnership | Legal/trust — Lead decision; see §14 |
| Payments to Chanasta | None (free) | Fees on money (never), subscriptions, paid themes, custom domain, analytics | Free MVP; monetise software later, never a cut |
| Compliance | Disclosure copy on every page, ToS + Privacy, moderation/suspension runbook, charity excluded | Donation campaigns, fundraising tools, tax receipts, KYC | See [compliance.md](./compliance.md) |
| Data | Synthetic demo creators; no real data in repo/tests | Real beta data outside production, analytics with PII | Hard repo rule |

**MVP definition of done:** a beta creator can publish a page with a verified bKash Bangla QR, share `/@username`, receive a self-reported claim, and confirm or hide it — with all disclosure copy present, on a mid-range Android phone over 3G.

---

## 7. Page & route inventory (product view)

Routes are client-rendered static pages; final routing is UI/UX + implementers' call, but page *jobs* and required states are fixed.

| Route | Who | Job | Required states |
|---|---|---|---|
| `/` | Everyone | Explain the product in one screen; live demo page; "create your page"; honesty footer | default, demo interaction, low-bandwidth fallback |
| `/onboarding` | New creator (auth) | 3–5 minutes: slug → payment method(s) → profile → preview → publish | empty, slug taken, invalid QR, decode-verified, save-failed |
| `/@:slug` | Supporter | The creator page: identity, amounts, "how to send", claim form, claim list, trust lines | loading, published, draft (owner preview), suspended, not-found, no payment methods yet, no claims yet |
| `/@:slug/thanks` | Supporter | Post-claim confirmation: "your message was noted; the money is not verified" + share prompt | success, expired/invalid claim |
| `/embed/@:slug` | Site owner | Compact iframe-able card: avatar, name, QR, amount chips, "support" | narrow (≤360px), wide, dark mode, no-JS static fallback |
| `/dashboard` | Creator | Claims inbox: newest first, unverified/confirmed/hidden filter, confirm/hide actions, link + share kit | empty, loading, error, suspended notice |
| `/dashboard/profile` | Creator | Edit display name, tagline, bio, emoji, socials (goal fields reserved — no UI in MVP), publish/unpublish, slug change (rate-limited) | validation errors |
| `/dashboard/payments` | Creator | Add/edit/disable/sort payment methods; QR paste/decode status; verified/unverified labels | decode success/failure, image-only, bank fields, limits |
| `/dashboard/settings` | Creator | Delete page (soft delete), export claims, session, language | confirm-delete, deleted |
| `/login` | Creator | Magic link (Supabase); "check your email" | sent, expired, rate-limited |
| `/legal/terms`, `/legal/privacy`, `/legal/how-it-works` | Everyone | Plain-language terms, data policy, and a "how the money moves" explainer | draft-review banner until counsel sign-off |
| `/dev` (engine docs, later) | Developers | deshiQR explanation, embed snippet, payload format pointer | external-link honesty |
| `/explore` | — | **Not in MVP** | — |
| `*` | Everyone | 404 with "পেজটি খুঁজে পাওয়া যায়নি" + link home | — |

**Global UI contract (all pages):** Bangla default with visible English toggle; footer disclosure line (Bangla + English); no tracking pixels; no provider logos used to imply endorsement; the creator's payment details are displayed verbatim and are never replaced with Chanasta-owned details.

---

## 8. Core flows

### 8.1 Supporter flow (happy path)
1. Supporter opens `chanasta.example/@rafiq` from a video description, bio, embed or WhatsApp message.
2. Above the fold: creator name/emoji, one-line story, the disclosure strip, the amount chips, and the primary action **"চা খাওয়ান / Buy a cha"**.
3. Chooses an amount (৳20 default preset or custom). The page now shows:
   - the creator's own **Bangla QR** (inline SVG), with "বিকাশ বা যেকোনো ব্যাংলা QR অ্যাপ দিয়ে স্ক্যান করুন";
   - the same account number as copyable text;
   - other enabled methods under "অন্য উপায়ে পাঠাতে চান?".
4. Supporter leaves the page, opens bKash (or another app that accepts Bangla QR), scans/sends **directly to the creator**. Chanasta is not involved.
5. Supporter returns and taps **"পাঠিয়েছেন? জানিয়ে দিন / Sent it? Let them know"**.
6. Claim form: amount (prefilled from the chosen chip), optional name, optional message, optional txid, method. Submit.
7. Thank-you state: *"ধন্যবাদ! আপনার বার্তা ক্রিয়েটর দেখতে পাবেন। চানাস্তা টাকা যাচাই করে না।"* Shows the claim as **স্ব-ঘোষিত / Self-reported**. Claim appears in the public list if the creator leaves it visible.
8. Optional share prompt: "পেজটি শেয়ার করুন".

### 8.2 "I sent it" claim flow — rules and states
- Anyone can submit a claim **without an account**; rate-limited (see [data-model.md §8](./data-model.md)); no email required.
- The claim is not a receipt and grants no rights. It is a message to the creator, published as **self-reported**.
- States: `unverified` (default, visible with self-reported badge) → `confirmed` (creator checked their own provider app and marked it; visible as "ক্রিয়েটর নিশ্চিত করেছেন / Creator confirmed") or `hidden` (creator hides; not visible) or `rejected` (moderation; not visible). `rejected` is terminal.
- **No automated confirmation, ever, in MVP.** No SMS parsing, no provider API polling, no "payment received" webhooks. Creator confirmation is manual and outside Chanasta's knowledge.
- If the creator cannot find the transfer, they can hide the claim. Chanasta takes no action against the supporter's money and cannot refund anything.
- Claims are never edited by supporters after submission (no edit token in MVP). A wrong claim can be hidden by the creator.

### 8.3 Creator flow (first page)
1. Lands on `/`, taps "পেজ খুলুন / Create your page".
2. Signs in with a magic link (email only; no password, no social login in MVP).
3. Onboarding step 1 — **slug**: `@username` with availability check, format rules inline.
4. Step 2 — **payment details**: paste a Bangla QR payload or upload a QR screenshot (decoded in the browser with `jsqr`). For bKash-issued NPSB payloads the server re-decodes and verifies the checksum → **verified decode** label; otherwise the method is stored as **unverified/image-only** with an honest label. Manual account numbers are always allowed.
5. Step 3 — **profile**: display name, tagline, short bio, emoji avatar, optional socials. Goal fields are stored but **not rendered in MVP** (Lead decision; goal/progress UI is out of scope).
6. Step 4 — **preview** (Bangla + English), then **publish**.
7. Share kit: copy link, WhatsApp/Facebook share text, embed snippet (`<iframe src="…/embed/@slug">`), A4 QR poster download (uses the creator's base static payload), "open my page".
8. Dashboard thereafter: new claims badge, confirm/hide, edit methods/profile, unpublish.

Target: **time-to-first-page < 5 minutes**, no app install, no payment-method approval queue.

### 8.4 Manual confirmation flow
1. Claim arrives as `unverified`; creator gets a dashboard badge (no email in MVP).
2. Creator opens their own bKash/Nagad/Rocket app statement and looks for the amount/name/txid.
3. If it matches: tap **"নিশ্চিত করেছি / I've confirmed"** → `confirmed`; the public card says *"ক্রিয়েটর নিশ্চিত করেছেন"*, not "verified by Chanasta".
4. If it doesn't match or looks like spam: **"দেখাবেন না / Hide"** → `hidden`.
5. Abuse/fraud (e.g. repeated fake claims, scams): hide + report; moderation may `reject` and suspend the page. No admin UI in MVP (service-role/SQL runbook).
6. Chanasta never independently verifies and never notifies the supporter that money arrived.

---

## 9. Payment-method strategy & honest labels

**Rule of the house:** we verify *the data* (is this a well-formed Bangla QR for the merchant we display?), never *the money*.

| Method | What we store/show | How it gets verified | Public label (Bangla / English) | Notes |
|---|---|---|---|---|
| bKash Bangla QR (payload or screenshot) | Full payload + decoded merchant snapshot (name, city, account, institution) + inline SVG QR | deshiQR decode + CRC-16 checksum + required fields; verified **only** for NPSB Bangla QR payloads (the scheme bKash issues) | **যাচাই করা ব্যাংলা QR (বিকাশ) / Verified Bangla QR (bKash)** | "Verified" = payload/checksum/merchant fields are valid. It does **not** mean a transfer happened. |
| bKash number (manual) | Number + masked display + copy button | Format check only | **বিকাশ নম্বর / bKash number** | No QR means no decode; keep manual check prompt |
| Nagad / Rocket numbers | Number + masked display + copy | Format check only | **নগদ নম্বর / Nagad number**, **রকেট নম্বর / Rocket number** (unverified) | Do not imply provider integration |
| Nagad / Rocket / other Bangla QR | Payload if the user pastes it, or the uploaded image | Decode may succeed structurally but is **not verified** against real payloads → store as unverified | **অযাচাইকৃত ব্যাংলা QR / Unverified Bangla QR — পাঠানোর আগে মিলিয়ে দেখুন** | Roadmap: add verified decode when real payloads are in deshiQR's test suite |
| Bank account | Account name, account number, bank name, branch, routing number | Format check only | **ব্যাংক অ্যাকাউন্ট / Bank account** | Useful for diaspora supporters; creator's details are public by design |
| Other | A label + number/QR, treated as manual | None | **অন্য উপায় / Other** | Escape hatch; still no custody |

**What we never promise anywhere:** "payment successful", "we'll inform the creator", "instant confirmation", "verified payment", "secure checkout", "money-back", "we hold your money", "guaranteed", "refund", "escrow", "payout". Keep `check current provider terms` language for anything provider-specific (merchant vs personal QR, fees, limits).

**Display rules**
- The QR shown is always the **creator's own**; Chanasta never substitutes its own account or a platform QR. When a supporter picks a preset amount, the page may derive a dynamic Bangla QR with deshiQR's `withAmount` — **amount/reference only**; merchant name, account, institution and tokens stay verbatim, the checksum is recomputed, and the page falls back to the static QR if derivation fails.
- Account numbers are stored in full (the supporter needs them) but **masked by default** on screen (`01000•••000`) with an explicit reveal/copy control; the QR payload itself is public data, like a QR printed on a shop wall.
- Every method group carries the decode-status label; unverified methods also carry *"পাঠানোর আগে নাম ও নম্বর মিলিয়ে নিন / double-check the name and number before sending."*
- The claim form's method selector lists only the creator's enabled methods. The txid is optional and **never public**.

---

## 10. Success metrics (no GMV — we don't process money)

All targets below are hypotheses for the beta, not commitments. Track events without PII.

| Metric | Definition | Beta target (hypothesis) |
|---|---|---|
| **Activation** | % of signed-up creators who publish a page within 24h | 60% |
| **Time-to-first-page** | median minutes from signup to first publish | < 5 min |
| **Page completeness** | % of published pages with ≥1 verified-decode method and a QR | 80% |
| **First claim** | % of published pages with ≥1 support claim within 30 days | 40% |
| **Creator confirmation rate** | % of visible claims marked confirmed (proxy for real support, not proof) | 30–50% |
| **Repeat supporters** | share of claims from a supporter fingerprint returning within 60 days (privacy-friendly, aggregate) | 15–20% |
| **Share rate** | % of creator sessions using copy-link / WhatsApp / embed snippet | 25% |
| **Embed installs** | unique sites that load `/embed/@slug` for ≥7 days | 5 in beta |
| **Creator D7 retention** | creators who return to the dashboard in week 2 | 50% |
| **Page performance** | p75 LCP on 3G/mid Android; JS budget adherence | < 2.5 s, ≤150 KB JS gzip |
| **Trust comprehension** | % of test supporters who, after 10s on the page, correctly state that Chanasta does not process payments (5–10 person hallway test) | ≥ 90% |

**Explicitly not tracked/reported as success:** GMV, transfer volume, "payments processed", revenue from transfers. We cannot measure money movement and must never imply we do.

---

## 11. Monetisation stance

- **MVP is free**, with no fees on money — ever, not even a "small percentage".
- If Chanasta charges later, it charges **for software**: custom domain, themes/branding, analytics, export, multiple pages/teams, API. A flat subscription is fixed regardless of how much supporters send.
- **Never:** a commission, payment-processing fee, payout fee, escrow, float, or any product where Chanasta touches the money.
- Anything that changes this stance triggers a compliance re-review (see [compliance.md §12](./compliance.md)) before engineering starts, and likely requires licensing/partner discussions that are out of MVP scope.
- Open-source posture: vendor deshiQR (MIT) and keep the engine's credit visible; a public roadmap and open demo pages help trust.

---

## 12. Risks & mitigations

| Risk | How it hurts | Mitigation (product + policy) |
|---|---|---|
| **Impersonation / scam pages** | Someone publishes a fake page for a well-known creator, collects money, disappears | Honest identity signals (display name + creator-supplied links); report button; fast suspension runbook; reserved brand slugs (`bkash`, `nagad`, `chanasta`, …); no paid/official badges until an identity process exists; "verified page" means identity-checked by Chanasta only if that program ships — never money-verified |
| **Fake support claims** | Inflated social proof; creator misled | Claims always `unverified` by default; public badge is explicit; creator confirm/hide; rate limits + IP-hash abuse controls; moderation reject; no auto-confirm; duplicate-txid detection as a signal |
| **Charity / fundraising** | Legal exposure (fundraising/donation rules, foreign funding), trust damage | MVP excludes fundraising language and campaign mechanics; "support", not "donate"; suspend pages soliciting for causes; counsel review before any expansion |
| **Provider terms** | QR personal vs merchant use, logo misuse, automation, account suspension | Keep to displaying the creator's own QR; no SMS parsing, no scraped APIs; provider names used nominatively; creators told to check **current provider terms**; no provider logos implying partnership |
| **Minors** | Under-18 creators/supporters; safeguarding | Creator accounts 18+ in ToS; supporter claims require a tick-box "I'm 18+ or have permission"; no youth-targeted content; report path |
| **Harassment / abusive messages** | Creator and supporter harm; public claims as a vector | Creator hide control; message length limits; word filter + report; moderation reject; no DMs in MVP |
| **Spam / SEO abuse** | Low-quality pages, search penalties | No public directory; publish rate limits per account; no-follow on creator social links; manual review of reported pages |
| **Privacy leak / breach** | Supporter names/messages/txids exposed; creator contact info | Public views expose only public columns; txid and IP hash never public; RLS owner-only writes; minimal retention; no real data in repo; breach runbook |
| **QR substitution/tampering** | Page shows an altered QR; money goes elsewhere | Decode server-side, show merchant name from the decoded payload next to the QR, checksum verification; creator re-verifies after edits; display "QR তথ্য যাচাই করা" only when decode actually passed |
| **Stale / wrong account details** | Money sent to wrong place | Creator can edit/disable methods anytime; page shows "সর্বশেষ হালনাগাদ" timestamp; supporter told to verify name/number; no refunds possible — so confirmation UX matters |
| **Regulatory change** | New rules for "support" pages or QR display | Policy owner assigned; quarterly review; open question to Lead; legal advice before real money flows are monetised |
| **Trust deficit** | Supporters assume we take a cut or hold money | Disclosure lines on every page + landing + claim form; "no fees on money" stated; claims clearly self-reported |

---

## 13. Launch plan

**Phase 0 — internal showcase (week 0)**
- Synthetic demo creators only (`@demo-teacher`, `@demo-artist`, `@demo-writer`; fake accounts, clearly labelled DEMO).
- Static deploy + Supabase staging; verify disclosure copy on every surface; QR decode verification visible.
- Quick 5-person hallway test of the claim flow and trust comprehension metric.

**Phase 1 — closed beta, 10–20 creators (weeks 1–4)**
- Hand-picked creators across the four personas (no charity/fundraising use cases).
- Onboard with a 15-minute call + a short Bangla guide; watch them create a page.
- Weekly feedback loop: 1 async form, 1 group call/month; instrument the metrics above.
- Ship only fixes and copy improvements during beta — no new payment features.
- Success gate for public launch (all must hold): activation ≥50%, first claim ≥40%, 0 unresolved impersonation reports, 0 money-custody confusion in testing, disclosure comprehension ≥90%.
- If the gate fails: stay in beta, fix onboarding/trust, do not add features.

**Phase 2 — public launch (week 5+)**
- Landing page + SEO in Bangla and English: "বাংলাদেশে ক্রিয়েটরকে সাপোর্ট করার সহজ উপায়", "buy me a coffee Bangladesh", "বাংলা QR দিয়ে সাপোর্ট", creator how-to guides, and honest engine explainers.
- Creator content: one short video per persona, a copy-paste link-in-bio kit, and an embed snippet for bloggers.
- Press/community: a few niche communities (tech, education, art), no paid ads until trust copy is validated.
- Monthly review of metrics + risk register; quarterly compliance review.

**Feedback loop:** dashboard "report a problem" link → shared inbox; public changelog; every support claim dispute route points to provider support (not to Chanasta's money operations, because there are none).

---

## 14. Open questions for the Lead (decide before UI/UX starts)

> **Resolved 2026-11-01:** the Lead answered all of these in [decisions.md](./decisions.md), which is binding for UI/UX and implementation. This section stays as the decision record; where the two differ, decisions.md wins. Carry-forward consequences: goal/progress UI is **not rendered in MVP**; legal pages ship with a visible "Draft — pending legal review" banner until counsel signs off; reporting uses the Lead's prefilled report route with a best-effort 72-hour review during beta.

1. **Stack confirmation.** The repo already depends on `@supabase/supabase-js` and a `supabase/` directory, so the data model assumes Postgres + RLS + edge functions. Confirm Supabase is the backend of record (vs. static-only + later backend), because it changes onboarding and dashboard scope.
2. **Route/URL scheme.** Canonical is `/@username`; do we also mint `/u/username` redirects and a short domain, and who owns the domain/name (chanasta.xyz, chanasta.com.bd, chanasta.app)?
3. **Verification program.** MVP can be "no identity verification" + `verified` flag reserved for a future program. Should we ship the flag column now (my recommendation: yes, default false, never purchasable) and what badge wording if a manual program starts?
4. **Charity policy.** Confirm hard exclusion of fundraising/charity pages in MVP (recommended), or allow "community support" pages with a disclaimer? This changes ToS, moderation and risk appetite.
5. **Goals / progress bars.** Keep optional goal amount (my recommendation: column yes, display off until claims volume makes it meaningful, always labelled self-reported) or drop entirely?
6. **Claim visibility default.** Default public (`unverified` visible with badge) vs. creator-approval-before-public? Recommend visible-by-default for social proof + creator hide control; confirm.
7. **Txid handling.** Optional and private in my model. Confirm, and confirm the exact retention (I propose: retained while claim lives, deleted with it; never public).
8. **Amount caps.** Product guards: min ৳1, max ৳100,000 per claim (lead decision; data-model). Rate limits in the data model apply.
9. **Admin/moderation tooling.** MVP proposes no admin UI — suspension/rejection via service-role SQL runbook. Acceptable for beta, or must we build a minimal admin panel before public launch?
10. **Notifications.** No email/push for new claims in MVP (dashboard badge only). Confirm this is acceptable for beta retention, or add a minimal email digest.
11. **Language default and address form.** Supporter pages default Bangla with English toggle; all money/refund/trust copy uses **আপনি** (not তুমি). Confirm, or allow per-creator tone?
12. **Legal entity & docs owner.** Who is the data controller/terms counterparty (company name, address, jurisdiction), and who signs off ToS/privacy after counsel review? Required before public launch (copy outline in [compliance.md §9](./compliance.md)).
13. **Report/moderation SLA.** Who watches reports during beta, and what's the promised response window? Needed for ToS and the impersonation runbook.
14. **Deleted-page slug policy.** Recommended: soft delete, slug quarantined 90 days to prevent impersonation, hard purge 30 days. Confirm.
15. **Explore/discovery.** Recommend "not in MVP". Revisit only after 50+ published creators and a moderation process exists.

---

*Everything in this document is a product decision for Phase 1. Where a provider-specific fact is unknown, the product must say "check current provider terms" rather than invent it; where a legal fact matters, [compliance.md](./compliance.md) governs.*
