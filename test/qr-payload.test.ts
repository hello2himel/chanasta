import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEMO_QR_DYNAMIC,
  DEMO_QR_LONG,
  DEMO_QR_MINIMAL,
  DEMO_QR_STATIC,
  DEMO_QR_UNVERIFIED,
} from "../src/lib/demo.ts";
import {
  classifyPayload,
  decodeStatusHelperKey,
  decodeStatusLabelKey,
  deriveAmountPayload,
  imageOnlyClassification,
  renderAmountQr,
  renderQrSvg,
} from "../src/lib/qr-payload.ts";
import { decode, institutionOf, verifyChecksum, withAmount } from "../src/lib/deshiqr.ts";

const NOW = Date.parse("2026-11-01T12:00:00+06:00");

test("the synthetic static demo payload decodes and verifies", () => {
  assert.equal(verifyChecksum(DEMO_QR_STATIC), true);
  const classification = classifyPayload(DEMO_QR_STATIC, NOW);
  assert.equal(classification.ok, true);
  assert.equal(classification.status, "verified");
  assert.equal(classification.merchantName, "DEMO STORE");
  assert.equal(classification.account, "01000000000");
  assert.equal(classification.accountMasked, "01000•••000");
  assert.equal(classification.institution, "bd.org.bb.npsb");
  assert.equal(classification.kind, "static");
  assert.equal(classification.decoded?.merchant_name, "DEMO STORE");
  assert.equal(classification.decoded?.decoded_at, new Date(NOW).toISOString());
  assert.equal(institutionOf(decode(DEMO_QR_STATIC))?.verified, true);
});

test("dynamic, minimal and long-name fixtures all classify as verified data", () => {
  for (const payload of [DEMO_QR_DYNAMIC, DEMO_QR_MINIMAL, DEMO_QR_LONG]) {
    const classification = classifyPayload(payload);
    assert.equal(classification.ok, true, payload.slice(0, 30));
    assert.equal(classification.status, "verified");
  }
  assert.equal(classifyPayload(DEMO_QR_DYNAMIC).amount, 500);
  assert.equal(classifyPayload(DEMO_QR_DYNAMIC).kind, "dynamic");
  assert.equal(classifyPayload(DEMO_QR_LONG).merchantName, "DEMO SUPER SHOP LTD");
});

test("an unknown institution is structurally valid but not verified", () => {
  const classification = classifyPayload(DEMO_QR_UNVERIFIED);
  assert.equal(classification.ok, true);
  assert.equal(classification.status, "unverified");
  assert.equal(classification.institutionVerified, false);
  assert.equal(classification.merchantName, "DEMO STORE");
});

test("corrupted and garbage payloads are rejected, never thrown", () => {
  const corrupted = DEMO_QR_STATIC.slice(0, -4) + "0000";
  const corruptedResult = classifyPayload(corrupted);
  assert.equal(corruptedResult.ok, false);
  assert.equal(corruptedResult.status, "none");
  assert.equal(corruptedResult.errorCode, "CHECKSUM_MISMATCH");

  assert.equal(classifyPayload("").ok, false);
  assert.equal(classifyPayload("hello world").ok, false);
  assert.equal(classifyPayload(DEMO_QR_STATIC.slice(0, 40)).ok, false);
});

test("withAmount derivation keeps payee fields verbatim and re-seals the checksum", () => {
  const derived = deriveAmountPayload(DEMO_QR_STATIC, 50);
  assert.notEqual(derived, DEMO_QR_STATIC);
  assert.equal(verifyChecksum(derived), true);
  const decoded = decode(derived);
  assert.equal(decoded.amount, 50);
  assert.equal(decoded.kind, "dynamic");
  assert.equal(decoded.merchant.name, "DEMO STORE");
  assert.equal(decoded.merchant.account, "01000000000");
  assert.equal(decoded.merchant.institution, "bd.org.bb.npsb");
  assert.deepEqual(decoded.tokens, decode(DEMO_QR_STATIC).tokens);

  const amounts = [20, 50, 100, 1000, 9999.5];
  for (const amount of amounts) {
    const payload = deriveAmountPayload(DEMO_QR_STATIC, amount);
    assert.equal(decode(payload).amount, amount, `amount ${amount}`);
    assert.equal(verifyChecksum(payload), true);
  }

  const unverifiedDerived = deriveAmountPayload(DEMO_QR_UNVERIFIED, 100);
  assert.equal(classifyPayload(unverifiedDerived).status, "unverified");
  assert.equal(classifyPayload(unverifiedDerived).amount, 100);
});

test("any-amount (null) keeps the static payload untouched", () => {
  assert.equal(deriveAmountPayload(DEMO_QR_STATIC, null), DEMO_QR_STATIC);
  assert.equal(decode(deriveAmountPayload(DEMO_QR_STATIC, null)).amount, null);
});

test("derivation matches the engine's withAmount output", () => {
  assert.equal(deriveAmountPayload(DEMO_QR_STATIC, 75), withAmount(DEMO_QR_STATIC, 75));
});

test("QR SVG rendering is inline, black on white with a quiet zone", () => {
  const rendered = renderQrSvg(DEMO_QR_STATIC, { ariaLabel: "ডেমো QR" });
  assert.equal(rendered.ok, true);
  assert.ok(rendered.svg?.startsWith("<svg"));
  assert.ok(rendered.svg?.includes('fill="#ffffff"'));
  assert.ok(rendered.svg?.includes('fill="#0b0b0b"'));
  assert.ok(rendered.svg?.includes('role="img"'));
  assert.ok(rendered.svg?.includes("aria-label"));
  const quoted = rendered.svg?.match(/aria-label="([^"]*)"/)?.[1] ?? "";
  assert.ok(quoted.length > 0);
});

test("amount QR renders and falls back gracefully", () => {
  const rendered = renderAmountQr(DEMO_QR_STATIC, 50, { ariaLabel: "test" });
  assert.equal(rendered.ok, true);
  assert.equal(decode(rendered.payload as string).amount, 50);
  const anyAmount = renderAmountQr(DEMO_QR_STATIC, null);
  assert.equal(anyAmount.ok, true);
  assert.equal(anyAmount.payload, DEMO_QR_STATIC);
  const broken = renderAmountQr(null, 50);
  assert.equal(broken.ok, false);
  assert.equal(renderQrSvg("").ok, false);
});

test("image-only classification never claims verification", () => {
  const imageOnly = imageOnlyClassification();
  assert.equal(imageOnly.status, "image_only");
  assert.equal(imageOnly.ok, false);
  assert.equal(imageOnly.decoded, null);
});

test("decode status labels map to honest copy", () => {
  assert.equal(decodeStatusLabelKey("verified", "bkash"), "creator.qr.status.verified");
  assert.equal(decodeStatusLabelKey("unverified", "nagad"), "creator.qr.status.unverified");
  assert.equal(decodeStatusLabelKey("image_only", "other"), "creator.qr.status.imageOnly");
  assert.equal(decodeStatusLabelKey("none", "bkash"), "creator.qr.status.manual");
  assert.equal(decodeStatusLabelKey("none", "bank"), "creator.qr.status.bank");
  assert.equal(decodeStatusHelperKey("verified"), "creator.qr.helper.verified");
  assert.equal(decodeStatusHelperKey("unverified"), "creator.qr.helper.unverified");
  assert.equal(decodeStatusHelperKey("none"), "creator.method.checkFirst");
});
