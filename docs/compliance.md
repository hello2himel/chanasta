# Chanasta — Compliance & Policy Boundary

**Status:** Phase 1 · policy position for a non-lawyer team · **not legal advice**
**Owner:** product-architect · **Last updated:** 2026-11-01
**Companion docs:** [blueprint.md](./blueprint.md) · [data-model.md](./data-model.md) · [brand-copy.md](./brand-copy.md)

> **Bottom line:** Chanasta publishes payment information the creator already owns, and carries self-reported messages. Money moves inside the supporter's own provider app, directly to the creator's own account. Chanasta never receives, holds, routes, settles, confirms or refunds money. That is the whole compliance strategy — and it must stay true in code, copy, marketing and monetisation.
>
> **Before Chanasta ever monetises real money flows or adds any feature that brings it closer to the money, get local Bangladeshi legal advice and re-read this document.**

---

## 1. Who this is for

- **Founders and the Lead** — the decisions this document constrains.
- **UI/UX and brand** — the exact disclosures that must appear, and the words we must not use.
- **Engineering** — the "must never build" list and the trust copy shipped with the product.
- **Creators and supporters** — the plain-language version is the public "how it works" page; this document is its internal source of truth.

Regulatory references in this document are deliberately **general**: rules change, and we are not lawyers. Verify current instruments, circulars and provider contracts with qualified local counsel before launch and before any expansion.

---

## 2. The money path (and where Chanasta stands)

```
Supporter's phone                         Creator's phone
┌──────────────────┐   scan / copy   ┌─────────────────────────┐
│ bKash / Nagad /  │ ──────────────▶ │ Creator's own bKash /   │
│ Rocket / bank app│   (provider     │ Nagad / Rocket / bank   │
│ (supporter's own │    network,     │ account                 │
│  account)        │    not Chanasta)│                         │
└──────────────────┘                 └─────────────────────────┘
          │                                     ▲
          │ reads creator's QR / account number │
          ▼                                     │
   ┌──────────────────────────────────────────────────────────┐
   │ CHANASTA PAGE (/@username): static HTML + published texts │
   │ • displays the creator's OWN QR and payment details      │
   │ • records "I sent ৳X" — a self-reported message          │
   └──────────────────────────────────────────────────────────┘
                    ✗ no connection to the money line ✗
```

Chanasta is a **signpost and a noticeboard**, not a pipe. Even the claim record is downstream of the money movement and is created by the supporter's own statement.

---

## 3. What Chanasta deliberately does not do

This list is normative. A feature that violates any line is out of scope until this document is formally revised with legal review.

| Never (MVP and after) | Why |
|---|---|
| Hold a creator/supporter balance, wallet, float or "credits" | That is regulated money handling and a serious licensing problem |
| Receive money into a Chanasta account (a "collection" or "escrow" account) | Makes Chanasta a party to the transfer and creates custody |
| Route, split or forward funds to creators | That is payment processing / payment facilitation |
| Pay out creators, settle, batch, or run a payout cycle | That is a payment service requiring licensing and counterparties |
| Confirm that a payment happened, in UI, API, email or analytics | We cannot know; claiming otherwise is deceptive and creates liability |
| Auto-detect payments by reading SMS, notifications, emails, or provider APIs | Against the spirit of provider terms, unreliable, privacy-hostile, and would make us a payment verifier |
| Refund, reverse, dispute, or "protect" a transfer | We never had the money; refunds must go through the provider/creator |
| Take a fee, cut, percentage, commission or spread on money | Turns a support product into payment processing / money transmission risk |
| Require a supporter account, KYC, or store payment credentials/card numbers | We have no reason to touch sensitive financial data |
| Alter a creator's QR payee fields (account, institution, merchant) or substitute a Chanasta-owned account | Could redirect money; only amount/reference derivation is allowed, never payee-field changes |
| Open merchant accounts, act as an agent for providers, or imply partnership | We are not a PSP, merchant of record, or agent |
| Host charity/fundraising campaigns, donation totals, or "verified cause" mechanics | Fundraising/donation rules are a separate regulated area; MVP excludes it |
| Store a payment ledger or reconcile claims against bank statements | No ledger exists; claims are user statements, not entries |

**Marketing must not contradict this.** Do not say "we process", "we handle", "we transfer", "we verify payments", "we protect your money", "payouts", "instant settlement", "secure payments", "we take 0% fees on transfers" (implies a fee mechanism). Say **"we never touch the money"** instead.

---

## 4. Why "display payment info + self-reported claim" is not payment processing

Plain-language reasoning, useful for the public "how it works" page and for conversations with counsel, providers and creators.

1. **No possession or control.** At no moment does Chanasta hold, control or have access to funds. The supporter's app talks to the creator's account through the provider's own network.
2. **No execution of instructions.** Chanasta does not initiate, authorise, capture, route or settle any transfer. The supporter acts directly inside a licensed provider's app.
3. **No reconciliation or guarantee.** The claim is a message: *"I sent ৳X"*. Chanasta repeats it as a statement and labels it self-reported. It does not know whether it is true.
4. **No agency for the creator.** Chanasta is not the creator's agent for collecting money; it publishes information the creator supplies (their own QR/account, intended for public display).
5. **No stored value, no float, no exposure.** There is no time window where money is "with Chanasta". The only thing stored is public profile data and optional messages.
6. **It is a publishing and messaging tool.** In substance it is closer to a link-in-bio page plus a guestbook/noticeboard than to a checkout: the creator's QR is already printed on their shop wall, and the message is like a comment saying "I sent a cha".
7. **Disclosure is explicit.** Every page states in Bangla and English that Chanasta does not process payments, hold funds or verify transfers. That is the product's honest self-description, and copy consistency is itself a compliance control.

**Where the line gets blurry (do not cross without review):** anything that makes Chanasta look like it knows the truth about transfers (e.g. "Paid" status, reconciliation, "confirmed by Chanasta", order fulfilment, invoices, receipts), or anything where funds transit our accounts. See §12.

---

## 5. The Bangladesh regulatory context (for non-lawyers)

- Bangladesh Bank (the central bank) oversees the payment system. Its Payment Systems Department is the relevant area for payment services, and **payment service providers (PSPs) / payment system operators (PSOs)** operate under licensing/approval arrangements and applicable law (including the payment and settlement systems framework and related circulars — verify the current instruments with counsel).
- Mobile financial services (bKash, Nagad, Rocket) and banks issue and accept **Bangla QR** (the NPSB interoperable QR scheme). A supporter scanning a creator's QR is using a **licensed provider's own service**; Chanasta is not a party to that interaction.
- **Chanasta does not claim to be a PSP, PSO, MFS, merchant acquirer, payment aggregator, or agent of any provider.** It displays a QR/payment details and publishes messages. Where a provider's terms or the law require a licence for an activity, Chanasta must not do that activity.
- **Do not present legal conclusions as settled.** The position above is a deliberate, conservative product boundary, not a legal ruling. Before public launch, and before any change that touches money, get written advice from Bangladeshi counsel.

**What would force a formal review immediately**
- Adding fees on money, subscriptions tied to transfer volume, or any revenue share from transfers.
- Adding automated payment confirmation (provider APIs, SMS/email parsing, bank statement import).
- Holding any funds, any float, or acting as an intermediary.
- Building donation/fundraising/campaign mechanics or tax receipts.
- Offering checkout, invoices, escrow, buyer protection, refunds, or "order" semantics.
- Processing cards or storing credentials.
- Cross-border money movement or foreign-currency settlement.
- Marketing yourself as a payments company or as a provider's official partner.

---

## 6. Provider terms cautions

Provider terms are contracts, not suggestions. We do not get to reinterpret them, and they change. **Everyone on the team: when a provider-specific fact is needed, write "check current provider terms" — never invent API facts, limits, fees or support promises.**

| Caution | What Chanasta does |
|---|---|
| **Personal vs merchant QR/accounts.** Personal MFS accounts are generally intended for personal, person-to-person use; commercial use (a business collecting payments regularly) may be restricted by provider terms and may require merchant onboarding. | Creators are told to **check current provider terms** and to use merchant/business arrangements where required. Chanasta does not open, approve or intermediate merchant accounts; it does not present a personal QR as a merchant facility. |
| **Displaying a QR.** The creator is publishing their own QR/payment details for their own supporters. Chanasta never substitutes a platform QR, alters payee fields, overlays a "scan to pay Chanasta" flow, or claims the QR is issued by Chanasta. | Show the creator's own QR; show the decoded merchant name for comparison. When a supporter picks a preset amount, the page may derive a dynamic copy with deshiQR's `withAmount` — **amount/reference only**; merchant name, account, institution and tokens stay verbatim and the checksum is recomputed. Never change payee fields, never substitute a Chanasta account, and fall back to the static QR if derivation fails. |
| **Uploading QR screenshots.** Screenshots may contain the creator's name/account; they are public by definition once shown. | Tell creators before upload; store only what is needed; allow deletion; never publish private account-holder data beyond the QR itself. |
| **No SMS/notification parsing or scraped APIs.** Reading SMS is privacy-invasive and commonly restricted; unofficial API use may violate provider terms and is unreliable. | Out of scope, permanently for MVP. Claims are manual and self-reported. |
| **Trademarks and logos.** Using bKash/Nagad/Rocket logos may suggest endorsement or partnership we do not have. | Use provider names **nominatively** ("pay with bKash"), no logos, no "official", no partnership claims; link to the provider's own site for terms. |
| **Do not encourage splitting, misusing, or automating transfers.** | No bulk payout tooling, no "send to many", no scheduled transfers. |
| **Rate limits and account scrutiny.** A QR appearing on a public page can be shared widely; high volumes to a personal account may trigger provider review. | Tell creators in the help docs: large-scale commercial collection may need a merchant arrangement; check the provider's current terms; Chanasta cannot resolve provider account issues. |
| **App store / platform rules.** No app in MVP; if one ships later, review store payment rules separately. | Static web only. |

**Never say** "bKash supports this", "Nagad has an API for us", "instant settlement", "we are integrated with", unless a signed agreement exists and is documented here. Current wording everywhere: **"bKash-issued Bangla QR decoding is verified by the deshiQR engine; Nagad/Rocket/bank decoding is planned and unverified. Check current provider terms."**

---

## 7. Charity, fundraising and "donation" — excluded from MVP

Collecting money for a cause, organisation or person other than the page owner raises legal and trust questions that Chanasta is not equipped to handle in MVP:

- Fundraising and donation activity can be subject to registration/permission requirements, restrictions on foreign funding, and reporting duties, depending on the cause, the organiser and the location of supporters. The details are jurisdiction- and fact-specific.
- Charitable framing invites expectations of accountability, receipts, tax benefits and oversight that Chanasta cannot meet (we cannot verify receipt, cannot issue tax receipts, and should not imply that a cause is vetted).
- Scam and misrepresentation risk is much higher for causes than for an individual creator's own page.

**Policy for MVP**
- Prohibited content includes "raising funds for", "donate to", "collecting for", relief/iftar/medical-fund campaigns, and any page that presents itself as a charity or cause.
- Vocabulary: **support / সমর্থন**, never donation/দান, fund/ফান্ড, campaign, "goal raises ৳X" (see [brand-copy.md](./brand-copy.md) §4).
- Goal fields exist in the data model for the future but **no goal/progress UI ships in MVP** (Lead decision). If goal progress is ever shown, it must be labelled **self-reported** and must not read as a fundraiser or as money received.
- Reported pages are reviewed; repeated or serious violations lead to suspension under the Terms.
- Expanding to community/charity support requires: written legal advice, a verification/moderation plan, and probably a different product and entity arrangement. Do not sneak it in via copy.

---

## 8. Tax, VAT and personal income (no advice)

- **Creators are responsible** for their own income tax and any other obligations on money they receive. Chanasta does not withhold, report, calculate or advise.
- Chanasta provides **no receipt, invoice or tax certificate** for a transfer. The only record is the self-reported claim, which is **not** proof of income and must not be presented as one.
- **MVP has no fees**, so Chanasta currently has no fee revenue to invoice. If paid software features launch, their tax/VAT treatment (and whether and how to charge VAT and issue invoices) must be reviewed with a Bangladeshi accountant before launch. Do not assume.
- Supporters may be outside Bangladesh; Chanasta does not handle foreign exchange or cross-border transfers, and claims may come from anywhere without implying currency conversion.
- Public copy: *"কর ও অন্যান্য দায়িত্ব ক্রিয়েটরের নিজের; চানাস্তা কোনো কর সংক্রান্ত পরামর্শ দেয় না। / Creators are responsible for their own taxes; Chanasta gives no tax advice."*

---

## 9. Privacy and data protection stance

Chanasta is not yet in a position to assert a specific data-protection law compliance claim (e.g. any forthcoming Bangladeshi data-protection statute) without legal review. The operating stance is conservative:

1. **Data minimisation.** Public page data is supplied by the creator. Supporter claims store only amount, optional name, optional message, optional method and optional txid (private), plus a salted IP hash for abuse prevention.
2. **No supporter accounts, no tracking pixels, no ad networks.** Analytics, if any, are privacy-friendly and aggregate (page views, claim counts), no cross-site tracking, no PII.
3. **Private-by-default fields.** `txid`, `ip_hash`, emails and auth IDs are never exposed via public views or APIs ([data-model.md §9–10](./data-model.md)).
4. **Retention.** IP hashes are nulled after 30 days; deleted pages purge after 30 days; rejected claims purge after 90 days; deleted slugs are quarantined for 90 days.
5. **No sale of data, no ad-tech sharing, no shadow profiles.**
6. **Access and deletion.** Creators can edit/delete their page and export their claims. Supporters who submitted a claim can ask the creator to hide it (creator controls public display); for other requests, use the report/contact route.
7. **Security.** RLS by default, no service keys in the client, dependency and secret hygiene, breach runbook with notification to affected users and (where required) authorities.
8. **Minors.** Creator accounts are 18+. Supporter claims require an age acknowledgment; if we learn of a minor's data, remove it.
9. **Demo/dev data is synthetic.** No real account numbers, names, QR payloads or txids in the repo, tests, fixtures, screenshots or marketing.
10. **International processing.** Supabase hosting region and any transfer of data outside Bangladesh must be disclosed in the privacy policy once the hosting arrangement is finalised.

The public privacy page must be reviewed by counsel before launch. Per Lead decision (entity not yet formed), every legal page ships with a visible **"খসড়া — আইনি পর্যালোচনার অপেক্ষায় / Draft — pending legal review"** banner, and this build is not open to real creators until ToS/privacy are reviewed.

---

## 10. Required disclosures (exact copy, ship on the listed surfaces)

Bangla and English together. Brand voice owns tone; compliance owns presence. These strings are mandatory.

**A. Creator page — footer strip (always visible)**
> চানাস্তা কোনো পেমেন্ট প্রসেস করে না। টাকা সরাসরি ক্রিয়েটরের নিজের অ্যাকাউন্টে যায়; চানাস্তা টাকা রাখে না, পাঠায় না, ফেরত দেয় না, নিশ্চিতও করে না।
>
> Chanasta is not a payment processor. Money goes directly to the creator's own account; Chanasta never holds, routes, refunds or confirms it.

**B. Above the payment methods**
> নিজের অ্যাপ থেকে সরাসরি পাঠান। পাঠানোর আগে নাম ও নম্বর মিলিয়ে নিন।
>
> Send directly from your own app. Check the name and number before sending.

**C. On each method group**
> যাচাই করা মানে QR-এর তথ্য ঠিক আছে — টাকা এসেছে এমন নয়।
>
> "Verified" means the QR data checks out — not that the money arrived.

**D. Claim form header + submit**
> পাঠিয়েছেন? জানিয়ে দিন। এটি একটি স্ব-ঘোষিত বার্তা; চানাস্তা টাকা যাচাই করে না।
>
> Sent it? Let them know. This is a self-reported message; Chanasta does not verify the money.

**E. Claim list header**
> স্ব-ঘোষিত সমর্থন — ক্রিয়েটর নিশ্চিত না করা পর্যন্ত যাচাই করা নয়।
>
> Self-reported support — unverified unless the creator confirms it.

**F. Landing footer**
> চানাস্তা একটি পাবলিক পেজ টুল। আমরা কোনো টাকা রাখি না, পেমেন্ট প্রসেস করি না, ফেরত দিই না। পেমেন্ট সংক্রান্ত সমস্যায় আপনার প্রোভাইডারের সহায়তা নিন।
>
> Chanasta is a public page tool. We do not hold money, process payments or issue refunds. For payment issues, contact your provider.

**G. Creator onboarding + dashboard help**
> আপনার QR/অ্যাকাউন্ট আপনার নিজের। চানাস্তা কখনো নিজের অ্যাকাউন্ট দেখায় না। ব্যক্তিগত ও ব্যবসায়িক ব্যবহারের নিয়ম প্রোভাইডারের বর্তমান শর্তে দেখুন।
>
> Your QR/account is your own. Chanasta never shows its own account. Check current provider terms for personal vs business use.

**H. ToS short line (site footer)**
> চানাস্তা পেমেন্ট প্রসেসর নয় — [শর্তাবলি] ও [গোপনীয়তা] দেখুন।
>
> Chanasta is not a payment processor — see [Terms] and [Privacy].

**Rules for copy:** no "guaranteed", "verified payment", "instant", "safe payment", "we protect your money", "donation", "fund". Provider names may appear descriptively only.

---

## 11. Terms & Privacy outline (bullets for counsel)

Not final text — an outline counsel can turn into documents. Owner: Lead ([blueprint.md §14](./blueprint.md)). Until counsel signs off, both pages display the visible "Draft — pending legal review" banner in Bangla and English (Lead decision #12).

**Terms of Service — outline**
- **Service description:** publishing a public support page for the creator's own payment details; displaying self-reported support messages. Not payment, banking, escrow, money transfer, investment or fundraising services.
- **No custody:** Chanasta never receives or holds funds; no balances, payouts, refunds or confirmations. Supporters pay at their own risk directly to the creator.
- **Creator obligations:** 18+; accurate information; own accounts/QRs; lawful content; no impersonation; no charity/fundraising or prohibited categories; check current provider terms; comply with tax law; no misleading claims about their page.
- **Supporter terms:** payments are direct and irreversible from Chanasta's perspective; check recipient identity before sending; claims are self-reported and may be hidden/removed; no refund route via Chanasta; contact your provider.
- **Claims & moderation:** rate limits, spam/fraud removal, suspension, reporting, no obligation to publish any content.
- **Intellectual property:** creator keeps their content; licence to display it; Chanasta brand and site content reserved; deshiQR MIT attribution.
- **Disclaimers:** "as is", no warranty that a QR/account is valid for a transfer beyond the data checks we perform, no warranty of creator identity or authenticity except an explicit `verified` badge program if launched.
- **Limitation of liability; indemnity; force majeure.**
- **Governing law and jurisdiction:** Bangladesh (confirm with counsel), amicable resolution first.
- **Changes, termination, account deletion, notices.**

**Privacy Policy — outline**
- What we collect (creator profile, public payment methods, claims content + optional private txid, hashed IP, auth email), why (provide the page, abuse prevention, support), legal bases/notice per applicable law.
- What is public vs private (link to the visibility matrix).
- Cookies/local storage: session + UI preferences only; no ad/tracking cookies.
- Processors/subprocessors (Supabase, static host, email for magic links) and cross-border storage.
- Retention and deletion (30/90-day rules; backups).
- Rights: access, correction, deletion requests, contact route and response window.
- Security measures and breach notification.
- Children (18+ creators; supporter acknowledgment; removal on notice).
- Naming a data controller/contact (Lead decision).
- No sale of personal data; no automated decision-making; no advertising.

---

## 12. Review triggers ("stop and get advice" list)

If a proposed feature hits any of these, **do not ship it** until this document is revised with local legal advice and the Lead signs off in writing:

1. Any custody, float, wallet, balance, escrow, payout, split, routing, refund or chargeback handling.
2. Any automated confirmation of payment (API, SMS, notification, email or statement import).
3. Any fee, commission or revenue share on transfers; any pricing that scales with transfer volume.
4. Donations, campaigns, fundraising, causes, tax receipts or "verified cause" mechanics.
5. Storing card credentials, bank credentials, provider passwords, PINs or OTPs.
6. Foreign currency, cross-border transfers, remittance or investment framing.
7. Acting for a provider or implying partnership, or using provider logos/official branding.
8. Publishing identity documents or verification data of creators/supporters.
9. Any "must be 18+" enforcement beyond an acknowledgment (if we add real age checks, review privacy and the law first).
10. Marketing copy that says or implies we process, protect, hold, verify or guarantee payments.

---

## 13. Pre-launch compliance checklist

| # | Item | Owner | Done when |
|---|---|---|---|
| 1 | This boundary reviewed and accepted by the Lead | Lead | written note in repo/issue |
| 2 | All mandatory disclosures (A–H) present on every required surface, Bangla + English | UI/UX + engineering | review of staging pages |
| 3 | Terms + Privacy drafted and **reviewed by Bangladeshi counsel**; draft banner visible until sign-off | Lead + counsel | signed-off versions live |
| 4 | No real personal data in repo, fixtures, seeds, screenshots or demo | engineering | grep + review |
| 5 | RLS verified: anon cannot read base tables or private columns (`txid`, `ip_hash`, emails) | engineering | SQL tests pass |
| 6 | No automated payment confirmation anywhere (code review) | engineering | review checklist |
| 7 | Claim rate limits + moderation/suspension runbook tested; report route live with a best-effort 72-hour review SLA during beta | engineering + moderation owner | dry run |
| 8 | Charity/fundraising pages excluded; report route + response SLA defined | Lead | policy page + runbook |
| 9 | Provider-terms wording audited ("check current provider terms", no API claims, no logos) | brand + Lead | copy audit |
| 10 | Hosting region / data processors listed in Privacy | Lead + engineering | privacy page |
| 11 | Monetisation stance documented: no fees on money | Lead | pricing page (or "free") |
| 12 | Legal entity/controller name, address, contact in Terms/Privacy | Lead | published docs |
| 13 | **Local legal advice obtained before monetising real money flows or expanding scope** | Lead | advice on file |

---

## 14. Final note

The conservatism here is not bureaucracy — it is the product's moat. "We never touch the money" is easy to say, hard to believe, and only credible if code, copy, monetisation and moderation all agree. When in doubt:

> **Do not build the feature. Say "check current provider terms". Ask the Lead. Then get local legal advice before real money is involved.**
