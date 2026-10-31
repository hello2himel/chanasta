import { test } from "node:test";
import assert from "node:assert/strict";

import { STORAGE_KEYS } from "../src/lib/config.ts";
import { DataError } from "../src/lib/errors.ts";
import { MemoryStorage, LocalStore } from "../src/lib/local-store.ts";

function makeStore(options: { now?: number; ids?: boolean } = {}) {
  const storage = new MemoryStorage();
  let tick = options.now ?? Date.parse("2026-11-01T12:00:00+06:00");
  let counter = 0;
  const store = new LocalStore(storage, {
    now: () => tick,
    idFactory: (prefix) => `${prefix}_${++counter}`,
  });
  const advance = (ms: number) => {
    tick += ms;
  };
  return { storage, store, advance };
}

function expectDataError(code: string, fn: () => unknown) {
  try {
    fn();
    assert.fail(`expected ${code}`);
  } catch (error) {
    assert.ok(error instanceof DataError, `expected DataError, got ${String(error)}`);
    assert.equal(error.code, code);
  }
}

test("corrupt storage recovers instead of throwing", () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEYS.creators, "{not json");
  storage.setItem(STORAGE_KEYS.methods, "[]");
  storage.setItem(STORAGE_KEYS.claims, '"a string"');
  storage.setItem(STORAGE_KEYS.owner, "garbage");
  const store = new LocalStore(storage);
  assert.deepEqual(store.creators(), []);
  assert.deepEqual(store.methods(), []);
  assert.deepEqual(store.claims(), []);
  assert.equal(store.ownerId(), null);
  assert.equal(store.getOwner(), null);
  // The corrupt keys were removed so the next run starts clean.
  assert.equal(storage.getItem(STORAGE_KEYS.creators), null);
});

test("a creator page can be created, updated, published and slug-changed", () => {
  const { store, advance } = makeStore();
  expectDataError("SLUG_INVALID", () => store.createCreator({ slug: "Bad Slug", display_name: "নাম" }));
  expectDataError("SLUG_RESERVED", () => store.createCreator({ slug: "dashboard", display_name: "নাম" }));

  const creator = store.createCreator({ slug: "my-page", display_name: "আমার পেজ" });
  assert.equal(creator.status, "draft");
  assert.equal(store.getOwner()?.id, creator.id);
  assert.equal(store.isSlugAvailable("my-page"), false);
  assert.equal(store.isSlugAvailable("demo-teacher"), false);
  assert.equal(store.isSlugAvailable("another-page"), true);

  expectDataError("SLUG_TAKEN", () => store.createCreator({ slug: "my-page", display_name: "নাম" }));

  const updated = store.updateCreator(creator.id, { display_name: "ডেমো শিক্ষক", tagline: "এক লাইন" });
  assert.equal(updated.display_name, "ডেমো শিক্ষক");
  assert.equal(updated.tagline, "এক লাইন");

  // Publishing without a payment method is blocked.
  expectDataError("PUBLISH_NEEDS_METHOD", () => store.setCreatorStatus(creator.id, "published"));
  advance(1000);
  store.savePaymentMethod({ creator_id: creator.id, kind: "bkash", label: "ব্যক্তিগত বিকাশ", account_number: "01000000000" });
  const published = store.setCreatorStatus(creator.id, "published");
  assert.equal(published.status, "published");
  assert.ok(published.published_at);

  const changed = store.changeSlug(creator.id, "renamed-page");
  assert.equal(changed.slug, "renamed-page");
  assert.equal(store.isSlugAvailable("my-page"), true);
  // One change per 30 days.
  advance(1000);
  expectDataError("SLUG_RATE_LIMITED", () => store.changeSlug(creator.id, "another-name"));
  advance(31 * 86_400_000);
  const again = store.changeSlug(creator.id, "third-name");
  assert.equal(again.slug, "third-name");
});

test("payment methods: add, limit, reorder, enable and delete", () => {
  const { store } = makeStore();
  const creator = store.createCreator({ slug: "methods-page", display_name: "নাম" });
  for (let index = 0; index < 8; index++) {
    store.savePaymentMethod({
      creator_id: creator.id,
      kind: "bkash",
      label: `পদ্ধতি ${index}`,
      account_number: `0100000000${index}`,
      sort_order: index,
    });
  }
  expectDataError("METHOD_LIMIT", () =>
    store.savePaymentMethod({ creator_id: creator.id, kind: "bkash", label: "extra", account_number: "01000000009" }),
  );
  const methods = store.listMethodsForCreator(creator.id, { includeDisabled: true });
  assert.equal(methods.length, 8);
  const ids = methods.map((method) => method.id).reverse();
  store.reorderPaymentMethods(ids);
  assert.deepEqual(
    store.listMethodsForCreator(creator.id, { includeDisabled: true }).map((method) => method.id),
    ids,
  );
  const first = store.listMethodsForCreator(creator.id)[0];
  assert.ok(first);
  const updated = store.savePaymentMethod({ ...first, id: first.id, creator_id: creator.id, enabled: false });
  assert.equal(updated.enabled, false);
  store.deletePaymentMethod(first.id);
  assert.equal(store.listMethodsForCreator(creator.id, { includeDisabled: true }).length, 7);
});

test("claim submission validates, rate-limits and stores self-reported status", () => {
  const { store, advance } = makeStore();
  const creator = store.createCreator({ slug: "claims-page", display_name: "নাম" });
  store.savePaymentMethod({ creator_id: creator.id, kind: "bkash", label: "বিকাশ", account_number: "01000000000" });
  store.setCreatorStatus(creator.id, "published");

  const draft = store.createCreator({ slug: "draft-page", display_name: "খসড়া" });
  expectDataError("NOT_PUBLISHED", () =>
    store.submitClaim({ creator_slug: draft.slug, amount_bdt: 20, age_ack: true }),
  );
  expectDataError("INVALID_INPUT", () => store.submitClaim({ creator_slug: creator.slug, amount_bdt: 20 }));
  expectDataError("CLAIM_TOO_LARGE", () =>
    store.submitClaim({ creator_slug: creator.slug, amount_bdt: 100_001, age_ack: true }),
  );

  const result = store.submitClaim({
    creator_slug: creator.slug,
    amount_bdt: 50,
    supporter_name: "রাফসান",
    message: "ধন্যবাদ",
    txid: "DEMO-TXID-9",
    method_kind: "bkash",
    age_ack: true,
  });
  assert.equal(result.status, "unverified");
  const publicClaims = store.listClaimsForSlug(creator.slug, { publicOnly: true });
  assert.equal(publicClaims.length, 1);
  assert.equal(publicClaims[0]?.txid, "DEMO-TXID-9"); // owner read includes txid; public render must not
  assert.equal(store.listMyClaims().length, 1);

  // Claims can also be submitted to demo creators; they are stored locally only.
  const demoClaim = store.submitClaim({ creator_slug: "demo-teacher", amount_bdt: 20, age_ack: true });
  assert.equal(demoClaim.status, "unverified");
  assert.equal(store.listClaimsForSlug("demo-teacher", { publicOnly: true }).length, 1);

  // Rate limit: 5 per hour total.
  advance(60_000);
  for (let index = 0; index < 3; index++) {
    store.submitClaim({ creator_slug: creator.slug, amount_bdt: 20, age_ack: true });
  }
  expectDataError("RATE_LIMITED", () =>
    store.submitClaim({ creator_slug: creator.slug, amount_bdt: 20, age_ack: true }),
  );
});

test("claim review enforces the state machine and ownership", () => {
  const { store, advance } = makeStore();
  const owner = store.createCreator({ slug: "review-page", display_name: "নাম" });
  store.savePaymentMethod({ creator_id: owner.id, kind: "bkash", label: "বিকাশ", account_number: "01000000000" });
  store.setCreatorStatus(owner.id, "published");
  const { id } = store.submitClaim({ creator_slug: owner.slug, amount_bdt: 100, age_ack: true });

  advance(1000);
  const confirmed = store.reviewClaim(id, "confirm");
  assert.equal(confirmed.status, "confirmed");
  assert.ok(confirmed.confirmed_at);
  expectDataError("INVALID_TRANSITION", () => store.reviewClaim(id, "confirm"));

  advance(1000);
  const hidden = store.reviewClaim(id, "hide");
  assert.equal(hidden.status, "hidden");
  assert.ok(hidden.hidden_at);

  const restored = store.reviewClaim(id, "restore");
  assert.equal(restored.status, "unverified");
  assert.equal(restored.confirmed_at, null);
  assert.equal(restored.hidden_at, null);

  // Demo claims cannot be reviewed by the visitor (not their page).
  const demoClaim = store.submitClaim({ creator_slug: "demo-artist", amount_bdt: 20, age_ack: true });
  expectDataError("NOT_OWNER", () => store.reviewClaim(demoClaim.id, "confirm"));
  expectDataError("NOT_FOUND", () => store.reviewClaim("missing", "confirm"));
});

test("soft delete hides the owner's page", () => {
  const { store } = makeStore();
  const creator = store.createCreator({ slug: "deleted-page", display_name: "নাম" });
  store.softDeleteCreator(creator.id);
  assert.equal(store.getOwner(), null);
  assert.equal(store.getCreatorBySlug("deleted-page")?.deleted_at !== null, true);
});
