# Chanasta — moderation runbook

**Status:** draft for the beta build · **no admin UI in MVP** (Lead decision #9). All moderation actions
are service-role SQL run from the Supabase SQL editor (or a service-role tool), following this document.
**Companion docs:** [compliance.md](./compliance.md) · [data-model.md](./data-model.md) §7/§11 ·
[api.md](./api.md) · [self-hosting.md](./self-hosting.md).

> **Gold rule:** Chanasta never holds, routes, confirms, refunds or settles money. Moderation can hide a
> page or a claim, but it can never reverse a transfer. For any payment problem, send the person to their
> provider (bKash/Nagad/Rocket/bank). Never promise a refund and never call a claim "paid".

---

## 0. Roles, channels and commitments

| Item | Value |
|---|---|
| Report channel | Email **hello2himel@proton.me**. The app's report link is a `mailto:` prefilled with the reported page URL. |
| What to include in a report | page URL (`/@slug`), what is wrong, screenshots/links if available, reporter contact (optional) |
| Response commitment | **Best-effort review within 72 hours during beta.** This is a stated best effort, not a guarantee; say so in the ToS and in replies. |
| Who can moderate | the moderation owner using the Supabase SQL editor as `postgres`, or service-role tooling. Owners cannot suspend themselves (the RPC refuses `suspended`). |
| Admin UI | none in MVP. Do not build one for this beta; use the SQL below and keep an evidence log. |
| Notification | dashboard badge only (Lead decision #10). Contact the creator via the email on their Supabase auth account when a decision affects them. |

Categories and what happens:

| Category | Action |
|---|---|
| Impersonation (fake creator/brand/provider page) | suspend immediately, quarantine the slug, preserve evidence, reply to reporter |
| Charity / fundraising / "donate" / campaign framing | suspend (hard exclusion, decisions #4 + compliance §7) |
| Fraud/scam page or stolen payment details | suspend immediately, preserve evidence, consider reporting to provider/law enforcement as appropriate |
| Harassment / abusive claim messages | hide (or reject) the claim; suspend the page for repeat patterns |
| Spam / low-quality page | hide page; ask the owner to fix; repeat → suspend |
| Provider-terms misuse (e.g. presenting a personal account as a merchant facility) | ask the owner to correct; suspend if unaddressed |
| Under-18 creator or minor's data | remove the page/data on notice and do not publish it |
| Legal/police request | escalate to the Lead; do not improvise disclosure; keep the request with the evidence |

---

## 1. Find the page

Run in the Supabase SQL editor (postgres sees everything; base tables are not anon-readable):

```sql
select id, slug, display_name, user_id, status, verified, published_at,
       deleted_at, last_slug_change_at, created_at
from public.creators
where slug = 'REPORTED-SLUG';   -- e.g. 'demo-teacher'
```

If the URL contains a different slug, look it up with `where slug like '%…%'` carefully (avoid dumping
the whole table into a ticket). Note the `id`, the current `status` and whether `deleted_at` is set.

Look at the content (payment methods + visible claims):

```sql
select id, kind, label, account_number, qr_status, qr_decoded ->> 'merchant_name' as qr_name,
       enabled, sort_order, updated_at
from public.payment_methods
where creator_id = 'CREATOR-UUID'
order by sort_order;

select id, amount_bdt, supporter_name, message, method_kind, status, created_at
from public.support_claims
where creator_id = 'CREATOR-UUID'
order by created_at desc
limit 50;
```

> `txid` and `ip_hash` are private. Look at them only when investigating fraud, never copy them into
> tickets, public posts or the repo.

---

## 2. Suspend a page (reversible triage)

Use this for "under review" situations where the page may come back. It hides the page immediately
(public views filter on `status = 'published'`) but keeps data in place:

```sql
update public.creators
set status = 'suspended'
where id = 'CREATOR-UUID';
```

The page, its payment methods and its claims all disappear from the public views at once. Repeat
offenders, confirmed scams and charity/fundraising pages should use the soft-delete workflow below so
they cannot be re-published by the owner.

## 3. Soft-delete a page + quarantine its slug

Use for removal: the page 404s immediately, the slug is quarantined for 90 days (anti-impersonation),
and the row is hard-purged by retention after 30 days (data-model §11). Do this in one transaction so a
crash cannot leave the slug reusable:

```sql
begin;

-- 1. quarantine the current slug before changing anything
insert into public.reserved_slugs (slug, reason)
select slug, 'quarantine'
from public.creators
where id = 'CREATOR-UUID'
on conflict (slug) do nothing;

-- 2. hide the page and mark it deleted
update public.creators
set deleted_at = now(),
    status = 'suspended'
where id = 'CREATOR-UUID';

commit;
```

Now `public.is_slug_available('<slug>')` returns false, and no new creator can take the name while it is
quarantined. Payment methods and claims stay in the row for evidence until the hard purge.

> **Owner self-service delete:** the dashboard's "delete my page" is an owner-safe subset of this — it
> may set `deleted_at = now()` (with `status = 'suspended'`) on its own page. The guard trigger forces
> `status = 'suspended'`, quarantines the slug, and makes the deletion final for the owner; only
> moderation can restore a deleted page (section 4). Moderation should use the transaction above so the
> quarantine and deletion are committed together.

## 4. Restore a suspended or deleted page (appeal upheld)

Restore to `draft` first and require the creator to re-publish (publishing needs ≥1 enabled payment
method). Only un-quarantine the slug if you actually want to return the page to its original address:

```sql
-- remove the quarantine row ONLY for the page you are restoring
delete from public.reserved_slugs
where slug = 'OLD-SLUG' and reason = 'quarantine';

update public.creators
set deleted_at = null,
    status = 'draft'
where id = 'CREATOR-UUID';
```

The owner can then fix anything and call `creator_set_status('publish')` from the dashboard. If the
restore should publish directly, set `status = 'published'` and `published_at = coalesce(published_at,
now())`; the guard trigger refuses to publish a page with no enabled payment method
(`PUBLISH_NEEDS_METHOD`).

## 5. Hide, reject and restore claims

Claims are self-reported messages. The creator can already `confirm`/`hide`/`restore` their own claims;
moderation has two extra powers — reject (terminal) and hide on the owner's behalf.

```sql
-- hide a claim (public view drops it; the row is retained)
update public.support_claims
set status = 'hidden', hidden_at = now()
where id = 'CLAIM-UUID';

-- reject a claim: moderation-only and TERMINAL (owner can never reinstate it).
-- moderated_by must be an auth.users id (the moderator's Supabase user id, or null if not applicable).
update public.support_claims
set status = 'rejected', rejected_at = now(), moderated_by = 'MODERATOR-AUTH-USER-UUID'
where id = 'CLAIM-UUID';

-- moderation-side restore of a hidden claim (goes back to self-reported)
update public.support_claims
set status = 'unverified'
where id = 'CLAIM-UUID' and status = 'hidden';
```

Rules:

- `rejected` never appears in public views and is purged by retention after 90 days.
- never mark a claim `confirmed` on the creator's behalf; `confirmed` still means "the creator said so",
  never "verified payment".
- `hidden_at`/`confirmed_at`/`rejected_at` are maintained by the timestamp trigger — don't set them by
  hand except when a specific audit value is required (the RPC path does it for you).
- For duplicate/abusive claims, prefer `hidden` unless it is clearly fraudulent — rejection is terminal.

## 6. Impersonation reports

1. Confirm what is being impersonated: a person, a brand, a provider (bKash/Nagad/Rocket/bank), or the
   Chanasta team itself.
2. **Suspend the page immediately** (section 2) and **quarantine the slug** if the name is a lookalike
   (section 3). Do not wait for the 72-hour window on impersonation.
3. Preserve evidence (section 8): reported URL, screenshot, why it impersonates, timestamps, decision.
4. Reply to the reporter (best effort) and to the page owner's auth email, stating the suspension and the
   appeal path.
5. Check for related accounts (same `user_id` will only have one page in MVP, but the payment details may
   be reused). If the same payment account appears on several pages, open a separate review.
6. Provider impersonation (`bKash`, `Nagad`, `Rocket`, official-looking pages) is a high priority:
   suspend + quarantine, never use provider logos/official wording ourselves.

## 7. Charity / fundraising exclusion

MVP **hard-excludes** charity, fundraising, donation, campaigns and "goal raises ৳X" framing (Lead
decision #4, compliance §7). Goal columns exist in the data model but **no goal UI ships**; do not "allow
it just in the copy".

```sql
-- example wording that triggers removal:
-- "donate", "fund", "campaign", "relief fund", "medical fund", "iftar collection", "raising for"
update public.creators set status = 'suspended'
where id = 'CREATOR-UUID';
```

Follow the soft-delete workflow for pages that present themselves as a cause/charity. Tell the owner why
(support for their own work is fine; collecting for a cause is not supported in MVP) and that expansion
would require legal advice and a new review. Do not let "community support" wording become a loophole.

## 8. Evidence to keep

Keep a private moderation log **outside this repository** (ops spreadsheet or private object storage):

- report email (sender address, received time), reported URL/slug
- screenshot(s) or archived HTML of the offending page + the date
- the creator id and the decision (suspend / hide / reject / restore) with timestamps
- moderator, appeal/complaint notes, whether the provider or police were informed
- **not** `txid`, `ip_hash`, reporter PII beyond what is needed, or any payment credentials

Retention for evidence: **90 days** after the decision, unless there is an active appeal, legal hold or
provider investigation. Then delete it. Keep the repo free of real reports and real people's data;
moderation evidence is not seed data.

## 9. Soft delete, hard purge and retention

| Rule | Action |
|---|---|
| Page hidden / removed | `deleted_at = now(), status = 'suspended'` (public views exclude it immediately) |
| Slug reuse | quarantined for 90 days via `reserved_slugs.reason = 'quarantine'` |
| Hard purge | `select chanasta.purge_deleted_creators();` — deletes pages soft-deleted >30 days; methods/claims cascade |
| IP hashes | nulled after 30 days: `select chanasta.purge_expired_claim_pii();` |
| Rejected claims | purged after 90 days by the same call |
| Slug quarantine | expired after 90 days: `select chanasta.purge_expired_slug_quarantine();` (never touches the static reserved list) |

All three helpers are `SECURITY DEFINER` and service-role only — they are not callable through the public
REST API. Schedule them via `pg_cron` or the SQL editor (see [self-hosting.md](./self-hosting.md) §6).
Restoring a backup must not resurrect purged PII in production.

## 10. Appeals and errors

- An owner can appeal by email to the report address, quoting their page URL.
- Restore with section 4; if it was a claim-level action, restore with section 5 where possible (a
  `rejected` claim is terminal and is not restored by the creator).
- If you suspended the wrong page: restore it promptly, un-quarantine only the slug you quarantined, and
  note the correction in the moderation log.
- Never delete rows "so the report goes away"; hidden/rejected rows are evidence until retention removes
  them.

## 11. Weekly review checklist (15 minutes)

- [ ] Triage the report inbox (`hello2himel@proton.me`); confirm every report got a first response or a
      decision within the best-effort 72-hour window.
- [ ] Check suspended pages that are due for purge and whether any appeal is open.
- [ ] Check hidden/rejected claims for repeat abusers; look for duplicate txids as a soft signal (never
      unique — the same provider transaction can legitimately reappear).
- [ ] Review `public.reserved_slugs` for new lookalike/brand names to add (migration-only change, note it
      for the next schema review).
- [ ] Confirm `node scripts/check-sql.mjs` still passes after any schema change (255 assertions).
- [ ] Check retention jobs ran (`purge_expired_claim_pii`, `purge_deleted_creators`,
      `purge_expired_slug_quarantine`) and note the counts in the log.
- [ ] Spot-check a sample of pages for charity/fundraising wording and provider logos/official claims.
- [ ] Review auth redirect URLs and deployed headers if anything changed; confirm no service-role key in
      the web bundle.
- [ ] Update the abuse rate-limit thresholds only with a reason, and re-run the SQL harness afterwards.
