import { test } from "node:test";
import assert from "node:assert/strict";

import { DICTS, HONESTY_KEYS, dictKeys, hasKey, t } from "../src/lib/i18n.ts";

const LANGS = ["bn", "en"] as const;

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1] as string).sort();
}

test("both dictionaries have exactly the same keys", () => {
  const bn = dictKeys("bn");
  const en = dictKeys("en");
  assert.ok(bn.length > 150, `expected a full dictionary, got ${bn.length} keys`);
  assert.deepEqual(en, bn);
});

test("every string is non-empty in both languages", () => {
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(DICTS[lang])) {
      assert.equal(typeof value, "string", `${lang}.${key} must be a string`);
      assert.ok(value.trim().length > 0, `${lang}.${key} is empty`);
    }
  }
});

test("interpolation placeholders are consistent across languages", () => {
  for (const key of dictKeys("bn")) {
    const bn = DICTS.bn[key] as string;
    const en = DICTS.en[key] as string;
    assert.deepEqual(placeholders(en), placeholders(bn), `placeholder mismatch for ${key}`);
  }
});

test("t() interpolates and falls back to the key", () => {
  const value = t("bn", "meta.title.creator", { name: "ডেমো শিক্ষক" });
  assert.ok(value.includes("ডেমো শিক্ষক"));
  assert.ok(!value.includes("{name}"));
  assert.equal(t("en", "does.not.exist"), "does.not.exist");
  assert.ok(hasKey("en", "honesty.footer"));
});

test("mandatory honesty lines exist in both languages", () => {
  for (const key of HONESTY_KEYS) {
    assert.ok(hasKey("bn", key), `bn is missing ${key}`);
    assert.ok(hasKey("en", key), `en is missing ${key}`);
    assert.ok((DICTS.bn[key] as string).length > 10, `bn.${key} is suspiciously short`);
    assert.ok((DICTS.en[key] as string).length > 10, `en.${key} is suspiciously short`);
  }
});

test("no-custody wording is explicit", () => {
  const bnFooter = DICTS.bn["honesty.footer"] as string;
  const enFooter = DICTS.en["honesty.footer"] as string;
  assert.match(bnFooter, /পেমেন্ট প্রসেস করে না/);
  assert.match(bnFooter, /টাকা রাখে না/);
  assert.match(enFooter, /not a payment processor/i);
  assert.match(enFooter, /never holds/i);
  assert.match(DICTS.en["honesty.decodeHelper"] as string, /not that the money arrived/i);
  assert.match(DICTS.bn["honesty.decodeHelper"] as string, /টাকা এসেছে এমন নয়/);
});

test("banned promises never appear in any string", () => {
  const banned = [
    "payment successful",
    "verified payment",
    "we'll inform the creator",
    "secure checkout",
    "guaranteed",
    "paid successfully",
    "instant payout",
    "we hold your money",
  ];
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(DICTS[lang])) {
      const lower = value.toLowerCase();
      for (const phrase of banned) {
        assert.ok(!lower.includes(phrase), `${lang}.${key} contains banned phrase "${phrase}"`);
      }
    }
  }
});

test("'refund' only appears in the honest no-custody disclosure lines", () => {
  const allowed = new Set([
    "honesty.footer",
    "honesty.landingFooter",
    "legal.terms.s2.body",
    "legal.terms.s4.body",
    "legal.hiw.not.body",
  ]);
  for (const [key, value] of Object.entries(DICTS.en)) {
    if (/refund/i.test(value)) {
      assert.ok(allowed.has(key), `en.${key} mentions refund outside the disclosure copy`);
    }
  }
});

test("claim badges never read as payment proof", () => {
  assert.equal(DICTS.bn["claim.badge.selfReported"], "স্ব-ঘোষিত");
  assert.equal(DICTS.en["claim.badge.selfReported"], "Self-reported");
  assert.equal(DICTS.bn["claim.badge.creatorConfirmed"], "ক্রিয়েটর নিশ্চিত করেছেন");
  assert.equal(DICTS.en["claim.badge.creatorConfirmed"], "Creator confirmed");
  assert.ok(!/paid|পেমেন্ট সফল/i.test(DICTS.en["claim.badge.selfReported"] as string));
});

test("Bangla copy uses আপনি, not তুমি", () => {
  for (const [key, value] of Object.entries(DICTS.bn)) {
    assert.ok(!/\bতুমি\b/.test(value), `bn.${key} uses informal তুমি`);
  }
});

test("quantities interpolate with Latin digits", () => {
  assert.match(t("bn", "dashboard.newClaims", { count: 3 }), /3/);
  assert.match(t("en", "dashboard.newClaims", { count: 12 }), /12/);
  assert.match(t("bn", "claim.form.amountHelper"), /[0-9]/);
  assert.match(t("en", "claim.form.amountHelper"), /100,000/);
});
