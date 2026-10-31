import { test } from "node:test";
import assert from "node:assert/strict";

import {
  amountSpeech,
  clampTaka,
  formatDate,
  formatDateTime,
  formatTaka,
  maskNumber,
  messageCount,
  relativeDate,
  toBanglaDigits,
} from "../src/lib/format.ts";

test("formatTaka uses Latin digits and engine grouping", () => {
  assert.equal(formatTaka(20), "৳20");
  assert.equal(formatTaka(100), "৳100");
  assert.equal(formatTaka(1250.5), "৳1,250.50");
  assert.equal(formatTaka(100_000), "৳100,000");
});

test("formatDate uses Bangla month names with Latin digits", () => {
  assert.equal(formatDate("bn", "2026-11-01T10:00:00+06:00"), "1 নভেম্বর 2026");
  assert.equal(formatDate("en", "2026-11-01T10:00:00+06:00"), "1 November 2026");
  assert.equal(formatDate("bn", "not-a-date"), "");
});

test("formatDateTime appends a time", () => {
  const bn = formatDateTime("bn", "2026-11-01T16:32:00+06:00");
  assert.match(bn, /১ নভেম্বর 2026|1 নভেম্বর 2026/);
  assert.match(bn, /4:32/);
  const en = formatDateTime("en", "2026-11-01T16:32:00+06:00");
  assert.match(en, /pm/);
});

test("relativeDate handles minutes, hours and days", () => {
  const now = Date.parse("2026-11-01T12:00:00+06:00");
  assert.equal(relativeDate("bn", "2026-11-01T11:59:30+06:00", now), "এইমাত্র");
  assert.equal(relativeDate("en", "2026-11-01T11:59:30+06:00", now), "just now");
  assert.equal(relativeDate("bn", "2026-11-01T11:45:00+06:00", now), "15 মিনিট আগে");
  assert.equal(relativeDate("bn", "2026-11-01T09:00:00+06:00", now), "3 ঘণ্টা আগে");
  assert.equal(relativeDate("bn", "2026-10-30T12:00:00+06:00", now), "2 দিন আগে");
  assert.equal(relativeDate("en", "2026-10-30T12:00:00+06:00", now), "2 days ago");
  assert.equal(relativeDate("en", "2026-10-01T12:00:00+06:00", now), "1 October 2026");
});

test("amountSpeech produces Bangla screen-reader wording", () => {
  assert.equal(amountSpeech(20, "bn"), "৳২০ — বিশ টাকা");
  assert.equal(amountSpeech(50, "bn"), "৳৫০ — পঞ্চাশ টাকা");
  assert.equal(amountSpeech(100, "bn"), "৳১০০ — একশ টাকা");
  assert.equal(amountSpeech(500, "bn"), "৳৫০০ — পাঁচশ টাকা");
  assert.equal(amountSpeech(1000, "bn"), "৳১০০০ — এক হাজার টাকা");
  assert.ok(amountSpeech(37, "bn").startsWith("টাকার পরিমাণ: ৳37"));
  assert.equal(amountSpeech(50, "en"), "৳50 — fifty taka");
});

test("Bangla digit conversion is presentation-only", () => {
  assert.equal(toBanglaDigits(1250), "১২৫০");
  assert.equal(toBanglaDigits("৳50"), "৳৫০");
});

test("counts are messages, not money", () => {
  assert.equal(messageCount("bn", 3), "৩টি বার্তা".replace("৩", "3"));
  assert.equal(messageCount("en", 1), "1 message");
  assert.equal(messageCount("en", 2), "2 messages");
});

test("amount clamping keeps the product guard", () => {
  assert.equal(clampTaka(0), 1);
  assert.equal(clampTaka(100_001), 100_000);
  assert.equal(clampTaka(50.4), 50);
});

test("account masking keeps the ends", () => {
  assert.equal(maskNumber("01000000000"), "01000•••000");
  assert.equal(maskNumber("1234"), "••••");
  assert.equal(maskNumber(""), "");
});
