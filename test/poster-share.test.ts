import { test } from "node:test";
import assert from "node:assert/strict";

import { DEMO_CREATORS, DEMO_METHODS } from "../src/lib/demo.ts";
import { escapeXml, generatePosterSvg, generateQrOnlySvg } from "../src/lib/poster.ts";
import {
  buildShareKit,
  creatorPageUrl,
  creatorShareText,
  embedPageUrl,
  embedSnippet,
  facebookShareUrl,
  posterFileName,
  qrFileName,
  reportMailto,
  whatsappShareUrl,
} from "../src/lib/share.ts";

const teacher = DEMO_CREATORS[0] as (typeof DEMO_CREATORS)[number];
const qrMethod = DEMO_METHODS.find((method) => method.creator_slug === "demo-teacher" && method.qr_status === "verified")!;
const ORIGIN = "https://chanasta.example";

test("A4 poster SVG is well-formed, black on white and carries the honest lines", () => {
  const result = generatePosterSvg({
    creator: teacher,
    method: qrMethod,
    url: `${ORIGIN}/@demo-teacher`,
    lang: "bn",
    demo: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.errorCode, null);
  assert.equal(result.fileName, "chanasta-poster-demo-teacher.svg");
  const svg = result.svg as string;

  assert.ok(svg.startsWith('<?xml version="1.0"'));
  assert.match(svg, /viewBox="0 0 210 297"/);
  assert.match(svg, /width="210mm"/);
  assert.match(svg, /height="297mm"/);
  assert.match(svg, /fill="#ffffff"/);
  assert.match(svg, /fill="#0a0a0a"/);
  // The creator's own QR modules are drawn as a path and scaled to 62mm.
  assert.match(svg, /<path d="M/);
  assert.match(svg, /transform="scale\(/);
  // Decoded merchant name + full account number for manual entry (Lead-approved print rule).
  assert.ok(svg.includes("DEMO STORE"));
  assert.ok(svg.includes("01000000000"));
  // Demo mark and the no-custody line.
  assert.ok(svg.includes("ডেমো"));
  assert.ok(svg.includes("পেমেন্ট প্রসেস করে না"));
  // No unresolved template values.
  assert.ok(!svg.includes("undefined"));
  assert.ok(!svg.includes("NaN"));
  assert.equal((svg.match(/<svg/g) ?? []).length, 1);
  assert.equal((svg.match(/<\/svg>/g) ?? []).length, 1);
});

test("poster falls back when there is no QR payload", () => {
  const manual = DEMO_METHODS.find((method) => method.creator_slug === "demo-writer")!;
  const result = generatePosterSvg({
    creator: DEMO_CREATORS[2]!,
    method: manual,
    url: `${ORIGIN}/@demo-writer`,
    lang: "en",
    demo: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "NO_QR");
  assert.equal(result.svg, null);
});

test("poster escaping never emits raw markup from user text", () => {
  assert.equal(escapeXml('<script>"x"&'), "&lt;script&gt;&quot;x&quot;&amp;");
  const result = generatePosterSvg({
    creator: { ...teacher, display_name: 'ডেমো <শিক্ষক> "x"', tagline: "a & b" },
    method: qrMethod,
    url: `${ORIGIN}/@demo-teacher`,
    lang: "en",
    demo: false,
  });
  const svg = result.svg as string;
  assert.ok(!svg.includes("<শিক্ষক>"));
  assert.ok(svg.includes("&lt;শিক্ষক&gt;"));
  assert.ok(svg.includes("a &amp; b"));
});

test("QR-only SVG renders for the save-QR action", () => {
  const svg = generateQrOnlySvg(
    DEMO_METHODS.find((method) => method.qr_payload === null) ? "not-a-payload" : (qrMethod.qr_payload as string),
    "ডেমো QR",
  );
  assert.ok(svg?.includes("<svg"));
  assert.ok(svg?.includes("role=\"img\""));
  assert.equal(generateQrOnlySvg("this payload is too long ".repeat(500), "x"), null);
});

test("share URLs are plain, encoded and SDK-free", () => {
  assert.equal(creatorPageUrl("demo-teacher", ORIGIN, "/"), "https://chanasta.example/@demo-teacher");
  assert.equal(creatorPageUrl("demo-teacher", ORIGIN, "/chanasta/"), "https://chanasta.example/chanasta/@demo-teacher");
  assert.equal(embedPageUrl("demo-teacher", ORIGIN), "https://chanasta.example/embed/@demo-teacher");

  const text = creatorShareText("bn", teacher.display_name, `${ORIGIN}/@demo-teacher`);
  assert.ok(text.includes("https://chanasta.example/@demo-teacher"));
  assert.match(whatsappShareUrl("hi there & you"), /^https:\/\/wa\.me\/\?text=/);
  assert.ok(whatsappShareUrl("hi there & you").includes(encodeURIComponent("hi there & you")));
  const fb = facebookShareUrl(`${ORIGIN}/@demo-teacher`);
  assert.ok(fb.startsWith("https://www.facebook.com/sharer/sharer.php?u="));
  assert.ok(fb.includes(encodeURIComponent(`${ORIGIN}/@demo-teacher`)));
});

test("iframe embed snippet is fixed-height, titled and sandboxed", () => {
  const snippet = embedSnippet({
    embedUrl: `${ORIGIN}/embed/@demo-teacher`,
    title: 'ডেমো শিক্ষক-কে এক কাপ চা খাওয়ান — "Chanasta"',
  });
  assert.match(snippet, /^<iframe /);
  assert.ok(snippet.includes(`src="${ORIGIN}/embed/@demo-teacher"`));
  assert.ok(snippet.includes("width=\"380\""));
  assert.ok(snippet.includes("height=\"480\""));
  assert.ok(snippet.includes("loading=\"lazy\""));
  assert.ok(snippet.includes("sandbox=\"allow-scripts allow-same-origin allow-popups\""));
  // Quotes in the title are escaped so the snippet stays valid HTML.
  assert.ok(snippet.includes("&quot;Chanasta&quot;"));
  assert.ok(!snippet.includes('title="ডেমো শিক্ষক-কে এক কাপ চা খাওয়ান — "'));
});

test("report mailto prefills subject and page URL, never a txid", () => {
  const mailto = reportMailto({
    slug: "demo-teacher",
    creatorName: teacher.display_name,
    pageUrl: `${ORIGIN}/@demo-teacher`,
    lang: "bn",
    claimAmount: 50,
  });
  assert.ok(mailto.startsWith("mailto:hello2himel@proton.me?"));
  assert.ok(mailto.includes(encodeURIComponent(`${ORIGIN}/@demo-teacher`)));
  assert.ok(mailto.includes("subject="));
  assert.ok(!mailto.toLowerCase().includes("txid"));
  assert.ok(!mailto.includes("DEMO-TXID"));
});

test("buildShareKit composes the whole share surface", () => {
  const kit = buildShareKit({
    slug: "demo-teacher",
    creatorName: teacher.display_name,
    origin: ORIGIN,
    base: "/",
    lang: "en",
  });
  assert.equal(kit.pageUrl, `${ORIGIN}/@demo-teacher`);
  assert.equal(kit.embedUrl, `${ORIGIN}/embed/@demo-teacher`);
  assert.ok(kit.iframe.includes(kit.embedUrl));
  assert.ok(kit.shareText.includes(kit.pageUrl));
  assert.equal(kit.whatsappUrl, whatsappShareUrl(kit.shareText));
  assert.equal(kit.facebookUrl, facebookShareUrl(kit.pageUrl));
});

test("download file names are stable and safe", () => {
  assert.equal(posterFileName("demo-teacher"), "chanasta-poster-demo-teacher.svg");
  assert.equal(qrFileName("demo-teacher", null), "chanasta-qr-demo-teacher.svg");
  assert.equal(qrFileName("demo-teacher", 50), "chanasta-qr-demo-teacher-50.svg");
});
