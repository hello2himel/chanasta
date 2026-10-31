import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CLAIM_LIMITS,
  RESERVED_SLUGS,
  canReview,
  checkSlugLocally,
  errorCodeFromMessage,
  findBannedTerm,
  isReservedSlug,
  isSlugRuleValid,
  isValidAccountNumber,
  isValidHttpsUrl,
  isValidRoutingNumber,
  parseTaka,
  slugProblem,
  validateClaim,
  validatePaymentMethod,
  validateProfileText,
} from "../src/lib/validate.ts";

test("slug rules: accepted shapes", () => {
  for (const slug of ["demo-teacher", "abc", "a1-b2", "demo-teacher-2026", "x".repeat(30)]) {
    assert.equal(slugProblem(slug), null, slug);
    assert.equal(isSlugRuleValid(slug), true, slug);
  }
});

test("slug rules: every rejected case from data-model §6", () => {
  assert.equal(slugProblem(""), "empty");
  assert.equal(slugProblem("ab"), "length");
  assert.equal(slugProblem("x".repeat(31)), "length");
  assert.equal(slugProblem("Demo"), "uppercase");
  assert.equal(slugProblem("-demo"), "format");
  assert.equal(slugProblem("demo-"), "format");
  assert.equal(slugProblem("de--mo"), "format");
  assert.equal(slugProblem("demo_store"), "format");
  assert.equal(slugProblem("demo.store"), "format");
  assert.equal(slugProblem("123"), "format");
  assert.equal(slugProblem("demo teacher"), "format");
  assert.equal(isSlugRuleValid("demo-teacher"), true);
});

test("reserved slugs are rejected and the list is populated", () => {
  assert.ok(RESERVED_SLUGS.length >= 40);
  for (const reserved of ["dashboard", "onboarding", "bkash", "nagad", "chanasta", "demo", "donate", "verified"]) {
    assert.equal(isReservedSlug(reserved), true, reserved);
    assert.equal(slugProblem(reserved), "reserved", reserved);
  }
  const local = checkSlugLocally("demo-teacher");
  assert.equal(local.ok, true);
  assert.equal(checkSlugLocally("dashboard").problem, "reserved");
});

test("claim amount parsing accepts ৳ / commas and rejects junk", () => {
  assert.equal(parseTaka("50"), 50);
  assert.equal(parseTaka("৳50"), 50);
  assert.equal(parseTaka("1,250"), 1250);
  assert.equal(parseTaka(" 100 "), 100);
  assert.equal(parseTaka("0.5"), 0.5);
  assert.equal(parseTaka(""), null);
  assert.equal(parseTaka("abc"), null);
  assert.equal(parseTaka("-5"), null);
  assert.equal(parseTaka("50.999"), null);
});

test("claim validation enforces the product guard rails", () => {
  const valid = validateClaim({
    amount_bdt: 50,
    supporter_name: "রাফসান",
    message: "ভিডিওটা কাজে লেগেছে",
    txid: "DEMO-TXID-1",
    method_kind: "bkash",
    age_ack: true,
  });
  assert.equal(valid.ok, true);

  assert.equal(validateClaim({ amount_bdt: 0, age_ack: true }).issues[0]?.code, "TOO_SMALL");
  assert.equal(validateClaim({ amount_bdt: 100_001, age_ack: true }).issues[0]?.code, "TOO_LARGE");
  assert.equal(validateClaim({ amount_bdt: Number.NaN, age_ack: true }).issues[0]?.code, "REQUIRED");
  assert.equal(validateClaim({ amount_bdt: 20 }).issues.some((issue) => issue.field === "age"), true);
  assert.equal(
    validateClaim({ amount_bdt: 20, supporter_name: "x".repeat(CLAIM_LIMITS.maxName + 1), age_ack: true }).issues[0]?.field,
    "name",
  );
  assert.equal(
    validateClaim({ amount_bdt: 20, message: "x".repeat(CLAIM_LIMITS.maxMessage + 1), age_ack: true }).issues[0]?.field,
    "message",
  );
  assert.equal(
    validateClaim({ amount_bdt: 20, txid: "x".repeat(CLAIM_LIMITS.maxTxid + 1), age_ack: true }).issues[0]?.field,
    "txid",
  );
});

test("claim review transitions mirror the state machine", () => {
  assert.equal(canReview("unverified", "confirm"), true);
  assert.equal(canReview("unverified", "hide"), true);
  assert.equal(canReview("confirmed", "hide"), true);
  assert.equal(canReview("confirmed", "confirm"), false);
  assert.equal(canReview("hidden", "restore"), true);
  assert.equal(canReview("hidden", "confirm"), false);
  assert.equal(canReview("rejected", "restore"), false);
  assert.equal(canReview("rejected", "hide"), false);
});

test("profile text validation blocks multiline names and prohibited words", () => {
  assert.equal(validateProfileText({ display_name: "ডেমো শিক্ষক" }).ok, true);
  assert.equal(validateProfileText({ display_name: "" }).errors.display_name, "REQUIRED");
  assert.equal(validateProfileText({ display_name: "a".repeat(61) }).errors.display_name, "TOO_LONG");
  assert.equal(validateProfileText({ display_name: "line\nbreak" }).errors.display_name, "MULTILINE");
  assert.equal(validateProfileText({ display_name: "নাম", tagline: "please donate now" }).errors.tagline, "BANNED");
  assert.equal(validateProfileText({ display_name: "নাম", bio: "আমাদের ক্যাম্পেইনে যোগ দিন" }).ok, false);
  assert.equal(findBannedTerm("free video classes"), null);
  assert.equal(findBannedTerm("donate to my fund"), "donate");
});

test("payment validation covers bank, manual and QR evidence", () => {
  assert.equal(
    validatePaymentMethod({ kind: "bkash", label: "ব্যক্তিগত বিকাশ", account_number: "01000000000" }).ok,
    true,
  );
  assert.equal(
    validatePaymentMethod({ kind: "bkash", label: "ব্যক্তিগত বিকাশ", qr_payload: "0002..." }).ok,
    true,
  );
  assert.equal(validatePaymentMethod({ kind: "bkash", label: "" , account_number: "01000000000" }).issues[0]?.field, "label");
  assert.equal(validatePaymentMethod({ kind: "bkash", label: "x" }).issues[0]?.field, "evidence");
  assert.equal(validatePaymentMethod({ kind: "bank", label: "ব্যাংক", account_number: "0000000000000" }).issues.some((issue) => issue.field === "bank"), true);
  assert.equal(
    validatePaymentMethod({
      kind: "bank",
      label: "ব্যাংক",
      account_number: "0000000000000",
      bank_name: "ডেমো ব্যাংক",
      routing_number: "000000000",
    }).ok,
    true,
  );
  assert.equal(isValidAccountNumber("01000000000"), true);
  assert.equal(isValidAccountNumber("abc"), false);
  assert.equal(isValidRoutingNumber("123456789"), true);
  assert.equal(isValidRoutingNumber("12"), false);
});

test("URL validation requires https", () => {
  assert.equal(isValidHttpsUrl("https://example.com"), true);
  assert.equal(isValidHttpsUrl("http://example.com"), false);
  assert.equal(isValidHttpsUrl("not a url"), false);
});

test("known SQL error codes are detected in messages", () => {
  assert.equal(errorCodeFromMessage("SLUG_TAKEN: unique violation"), "SLUG_TAKEN");
  assert.equal(errorCodeFromMessage("rate_limited for this ip"), "RATE_LIMITED");
  assert.equal(errorCodeFromMessage("PUBLISH_NEEDS_METHOD"), "PUBLISH_NEEDS_METHOD");
  assert.equal(errorCodeFromMessage("something weird"), null);
});
