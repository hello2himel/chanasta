# Chanasta embeds — examples

Three ways to put a creator's support page on your own site, in increasing order of involvement. All
examples use the **synthetic demo creators** (`demo-teacher`, `demo-artist`, `demo-writer`) and the
placeholder origin `https://chanasta.example` so nothing here points at a real person, account or
deployment.

| Way | Best for | Files |
|---|---|---|
| **Link** | bios, newsletters, chat, QR posters | a normal `https://your-site/@demo-teacher` link |
| **Iframe** | a blog sidebar, portfolio footer, docs page | [`embed.html`](./embed.html) (demo + copy snippet) |
| **Widget** | a button that opens the card in a modal, without leaving your page | [`embed-widget.js`](./embed-widget.js) |

> **Honesty copy — keep this with every embed:**
> চানাস্তা কোনো পেমেন্ট প্রসেস করে না। টাকা সরাসরি ক্রিয়েটরের নিজের অ্যাকাউন্টে যায়; চানাস্তা টাকা
> রাখে না, পাঠায় না, ফেরত দেয় না, নিশ্চিতও করে না।
>
> Chanasta is not a payment processor. Money goes directly to the creator's own account; Chanasta never
> holds, routes, refunds or confirms it. Support claims are self-reported messages, not receipts.

---

## 1. Link

The canonical public URL is:

```text
https://your-site.example/@demo-teacher
```

That's it — no script, no API. Static hosts without rewrites also accept the fallbacks
`https://your-site.example/#/@demo-teacher` and `https://your-site.example/?c=demo-teacher`. On a GitHub
Pages build the base path is included (`/chanasta/@demo-teacher`).

## 2. Iframe

The app serves a chrome-free, iframe-friendly card at `/embed/@<slug>`:

```html
<iframe
  src="https://your-site.example/embed/@demo-teacher"
  title="চানাস্তা — ডেমো শিক্ষক (DEMO Teacher) support page"
  width="100%"
  height="640"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
  allow="clipboard-write"
  style="border: 1px solid #e6dccd; border-radius: 20px; max-width: 420px"
></iframe>
```

`embed.html` is a small styled demo page that loads that iframe and generates a copy-paste snippet. Point
it at any deployment without editing the file:

```text
embed.html?origin=https://your-site.example&slug=demo-artist
```

Notes:

- Only `/embed/*` is allowed to be framed (`frame-ancestors *` in the deployed CSP); the rest of the app
  refuses framing. Don't proxy or re-host the embed.
- The iframe is responsive: it fills its container's width; set a height around 600–680px or let it scroll.
- The card shows the same disclosures as the full page. Do not hide them.

## 3. Widget (modal)

`embed-widget.js` is a zero-dependency script (~5 KB unminified) that opens the same embed URL in an
accessible modal dialog. No cookies, no tracking, no network calls beyond the iframe.

```html
<script src="embed-widget.js" data-origin="https://your-site.example" defer></script>

<button type="button" data-chanasta-widget data-slug="demo-teacher">
  ☕ ডেমো শিক্ষককে চা খাওয়ান
</button>
```

- `data-origin` on the script (or on the button) sets the deployment; it defaults to the current page
  origin.
- `data-slug` must be a synthetic demo slug in this repo's examples; the script falls back to
  `demo-teacher` for anything else.
- Anchor triggers (`<a data-chanasta-widget …>`) work too; the script cancels the default navigation.
- API: `window.ChanastaEmbed.open("demo-artist", "https://your-site.example")` and
  `window.ChanastaEmbed.close()`.
- Accessibility: `role="dialog"`, `aria-modal`, Escape closes, backdrop click closes, focus returns to
  the trigger, scroll is locked while open. No focus is trapped inside a cross-origin iframe beyond the
  dialog's own controls.
- The same script can be checked syntactically with `node --check examples/embed-widget.js`.

## 4. What NOT to do

- **Do not** wrap the page in a fake checkout, "secure payment" flow, receipt or confirmation. There is
  no payment confirmation anywhere in Chanasta.
- **Do not** replace the creator's QR/account with your own, or edit payee fields in the QR. Amount-bearing
  QR derivation (via the deshiQR engine) keeps payee fields verbatim and is documented in
  [`../docs/architecture.md`](../docs/architecture.md) §5.
- **Do not** claim "verified payment", "payment successful", "safe/secure checkout", "refund" or "we'll
  inform the creator". Claims are self-reported; creators can mark one "creator-confirmed", which still
  isn't a payment verification.
- **Do not** add tracking pixels/analytics to the embed. Privacy-friendly aggregate counts only.
- **Do not** use a real person's name, account, QR or transaction id in a demo — this repo is synthetic.

## 5. Configure your own origin

If you self-host, set `origin`/`data-origin` to your deployment and make sure:

1. The app is built/deployed with the `/embed/@:slug` route reachable (SPA fallback if needed).
2. The host's CSP allows framing **only** for `/embed/*` and your site is allowed to frame it.
3. Auth redirect URLs in Supabase include your own site's `/dashboard` (see
   [`../docs/self-hosting.md`](../docs/self-hosting.md)).

Questions/bugs: open an issue or email the report address in
[`../docs/moderation.md`](../docs/moderation.md) for abuse/impersonation reports.
