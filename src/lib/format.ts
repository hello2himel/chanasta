/**
 * Formatting helpers. Amount formatting always goes through the vendored
 * engine's `formatTaka()` so the whole product agrees on `৳1,250.50`.
 */
import { formatTaka } from "./deshiqr.ts";
import type { Lang } from "./types.ts";

export { formatTaka };

export const UNITS: readonly { amount: number; bn: string; en: string }[] = [
  { amount: 20, bn: "এক কাপ চা", en: "A cup of cha" },
  { amount: 50, bn: "এক প্লেট নাস্তা", en: "A plate of snacks" },
  { amount: 100, bn: "খাবার", en: "A meal" },
];

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBanglaDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => BN_DIGITS[Number(digit)] ?? digit);
}

/** `৳20` / `৳1,250.50` — Latin digits, no space, via the engine. */
export function taka(amount: number): string {
  return formatTaka(amount);
}

/** Whole-taka guard used by claim inputs (min ৳1, max ৳100,000). */
export function clampTaka(amount: number): number {
  return Math.min(100_000, Math.max(1, Math.round(amount)));
}

function parseIso(iso: string | Date): Date | null {
  const date = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `1 নভেম্বর 2026` / `1 November 2026`. Latin digits, Bangla month names. */
export function formatDate(lang: Lang, iso: string | Date): string {
  const date = parseIso(iso);
  if (!date) return "";
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  return lang === "bn"
    ? `${day} ${BN_MONTHS[month]} ${year}`
    : `${day} ${EN_MONTHS[month]} ${year}`;
}

export function formatDateTime(lang: Lang, iso: string | Date): string {
  const date = parseIso(iso);
  if (!date) return "";
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = lang === "bn" ? (hours < 12 ? "পূর্বাহ্ণ" : "অপরাহ্ণ") : hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${formatDate(lang, date)}, ${hour12}:${minutes} ${suffix}`;
}

/**
 * Relative date for claim cards: `এইমাত্র` / `2 দিন আগে` / falls back to an
 * absolute date after 30 days (which is when "N days ago" stops being useful).
 */
export function relativeDate(lang: Lang, iso: string | Date, now: number = Date.now()): string {
  const date = parseIso(iso);
  if (!date) return "";
  const diff = now - date.getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return lang === "bn" ? "এইমাত্র" : "just now";
  if (minutes < 60) return lang === "bn" ? `${minutes} মিনিট আগে` : `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "bn" ? `${hours} ঘণ্টা আগে` : `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days <= 30) return lang === "bn" ? `${days} দিন আগে` : `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(lang, date);
}

const SPOKEN_BN: Record<number, string> = {
  20: "বিশ টাকা",
  50: "পঞ্চাশ টাকা",
  100: "একশ টাকা",
  200: "দুইশ টাকা",
  500: "পাঁচশ টাকা",
  1000: "এক হাজার টাকা",
  2000: "দুই হাজার টাকা",
  5000: "পাঁচ হাজার টাকা",
};

const SPOKEN_EN: Record<number, string> = {
  20: "twenty taka",
  50: "fifty taka",
  100: "one hundred taka",
  200: "two hundred taka",
  500: "five hundred taka",
  1000: "one thousand taka",
  2000: "two thousand taka",
  5000: "five thousand taka",
};

/**
 * Bangla screen-reader amount wording: `৳20 — বিশ টাকা`.
 * Arbitrary amounts keep the digits (the screen reader reads them); no invented
 * number words (ui-ux §3.4 / §7.4).
 */
export function amountSpeech(amount: number, lang: Lang = "bn"): string {
  const rounded = Math.round(amount);
  if (lang === "en") {
    const words = SPOKEN_EN[rounded] ?? `${formatTaka(rounded)}`;
    return `${formatTaka(rounded)} — ${words}`;
  }
  const words = SPOKEN_BN[rounded] ?? `টাকার পরিমাণ: ${formatTaka(rounded)}`;
  if (SPOKEN_BN[rounded]) return `৳${toBanglaDigits(rounded)} — ${words}`;
  return words;
}

/** `12টি বার্তা` / `12 messages` — counts are messages, never money. */
export function messageCount(lang: Lang, count: number): string {
  return lang === "bn" ? `${count}টি বার্তা` : `${count} message${count === 1 ? "" : "s"}`;
}

export function relativeTimeTag(iso: string): string {
  const date = parseIso(iso);
  return date ? date.toISOString() : "";
}

/** A short masked phone/account for chips and tables. */
export function maskNumber(value: string | null | undefined): string {
  if (!value) return "";
  const text = value.trim();
  if (text.length <= 4) return "•".repeat(text.length);
  if (text.length <= 8) return text.slice(0, 2) + "•".repeat(text.length - 4) + text.slice(-2);
  return `${text.slice(0, 5)}•••${text.slice(-3)}`;
}
