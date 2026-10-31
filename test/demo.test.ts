import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEMO_CREATORS,
  DEMO_CLAIM_SEEDS,
  DEMO_METHODS,
  DEMO_QR_STATIC,
  DEMO_SLUGS,
  checkDemoInvariants,
  demoClaims,
  demoMethodsFor,
  demoPublicClaims,
  findDemoCreator,
  isDemoSlug,
} from "../src/lib/demo.ts";

const NOW = Date.parse("2026-11-01T12:00:00+06:00");

test("demo invariants hold (no real-looking data, DEMO markings, methods)", () => {
  assert.deepEqual(checkDemoInvariants(), []);
});

test("exactly the three documented demo creators exist", () => {
  assert.deepEqual([...DEMO_SLUGS], ["demo-teacher", "demo-artist", "demo-writer"]);
  assert.equal(DEMO_CREATORS.length, 3);
  for (const creator of DEMO_CREATORS) {
    assert.equal(findDemoCreator(creator.slug)?.slug, creator.slug);
    assert.equal(isDemoSlug(creator.slug), true);
    assert.equal(creator.status, "published");
    assert.equal(creator.is_demo, true);
    assert.equal(creator.verified, false);
    assert.ok(creator.display_name.includes("ডেমো"), creator.slug);
    assert.ok(creator.bio?.includes("ডেমো"), creator.slug);
  }
  assert.equal(isDemoSlug("someone-real"), false);
  assert.equal(findDemoCreator("nope"), null);
});

test("every demo creator has at least one enabled method, all obviously fake", () => {
  for (const creator of DEMO_CREATORS) {
    const methods = demoMethodsFor(creator.slug);
    assert.ok(methods.length >= 1, creator.slug);
    assert.ok(methods.every((method) => method.enabled));
    for (const method of methods) {
      if (method.account_number) {
        assert.match(method.account_number, /^0+[0-9]*$/, `${method.account_number} is not fake-looking`);
      }
      assert.equal(method.creator_slug, creator.slug);
    }
  }
  // The demo teacher must demonstrate a verified synthetic bKash QR + bank account.
  const teacher = demoMethodsFor("demo-teacher");
  assert.ok(teacher.some((method) => method.qr_status === "verified" && method.qr_payload === DEMO_QR_STATIC));
  assert.ok(teacher.some((method) => method.kind === "bank"));
  // The demo artist must demonstrate the honest unverified QR label.
  assert.ok(demoMethodsFor("demo-artist").some((method) => method.qr_status === "unverified"));
  // The demo writer demonstrates manual-only methods (no QR).
  assert.ok(demoMethodsFor("demo-writer").every((method) => method.qr_payload === null));
});

test("verified demo methods carry a secret-free decoded snapshot", () => {
  const verified = DEMO_METHODS.filter((method) => method.qr_status === "verified");
  assert.ok(verified.length > 0);
  for (const method of verified) {
    assert.ok(method.qr_decoded);
    assert.equal(method.qr_decoded?.merchant_name, "DEMO STORE");
    assert.equal(method.qr_decoded?.account_mask, "01000•••000");
    assert.ok(!JSON.stringify(method.qr_decoded).includes("DESHIQR"));
  }
});

test("demo claims include both public badges and a hidden row", () => {
  const claims = demoClaims(NOW);
  assert.ok(claims.length >= 6);
  const statuses = new Set(claims.map((claim) => claim.status));
  assert.ok(statuses.has("unverified"));
  assert.ok(statuses.has("confirmed"));
  assert.ok(statuses.has("hidden"));
  for (const seed of DEMO_CLAIM_SEEDS) {
    assert.ok(seed.amount_bdt >= 1 && seed.amount_bdt <= 100_000);
    assert.ok(seed.message === null || seed.message.length <= 280);
    if (seed.txid) assert.match(seed.txid, /^DEMO-/);
  }
});

test("public demo claims never include hidden or rejected rows", () => {
  for (const slug of DEMO_SLUGS) {
    const publicClaims = demoPublicClaims(slug, NOW);
    assert.ok(publicClaims.length >= 1, slug);
    for (const claim of publicClaims) {
      assert.notEqual(claim.status, "hidden");
      assert.notEqual(claim.status, "rejected");
      assert.equal(claim.creator_slug, slug);
      assert.ok(Date.parse(claim.created_at) <= NOW);
    }
    // Newest first.
    const dates = publicClaims.map((claim) => Date.parse(claim.created_at));
    assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
  }
});

test("demo timestamps are relative to now so pages feel fresh", () => {
  const later = demoClaims(NOW + 86_400_000);
  assert.notEqual(later[0]?.created_at, demoClaims(NOW)[0]?.created_at);
});
