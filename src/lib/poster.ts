/**
 * A4 poster generation (pure SVG).
 *
 * The printable sign carries the same information as the page: the creator's own
 * QR (black on white, ≥62 mm, quiet zone from the encoder's margin), full account
 * number for manual entry (Lead-approved for print), the honest scan/check lines
 * and the no-custody line. Pure function so it is covered by `node:test`.
 */
import { encode, toSvgPath } from "./qr.ts";
import { formatTaka, maskAccount } from "./deshiqr.ts";
import { t } from "./i18n.ts";
import type { Creator, Lang, PaymentMethod } from "./types.ts";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXml(value: string): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

export interface PosterInput {
  creator: Pick<Creator, "slug" | "display_name" | "tagline" | "avatar_emoji">;
  method: Pick<PaymentMethod, "kind" | "label" | "account_number" | "qr_payload" | "qr_decoded"> | null;
  /** Canonical public URL, e.g. `https://chanasta.example/@demo-teacher`. */
  url: string;
  lang: Lang;
  demo: boolean;
  /** Optional amount the creator wants to suggest on the poster. */
  amount?: number | null;
}

export interface PosterResult {
  ok: boolean;
  svg: string | null;
  errorCode: string | null;
  fileName: string;
}

const MM = { width: 210, height: 297, margin: 15 } as const;

function ptToMm(pt: number): number {
  return Number((pt * 0.352778).toFixed(3));
}

/** Build the A4 poster SVG. `ok: false` when the QR cannot be encoded. */
export function generatePosterSvg(input: PosterInput): PosterResult {
  const fileName = `chanasta-poster-${input.creator.slug}.svg`;
  const qrPayload = input.method?.qr_payload ?? null;
  if (!qrPayload) {
    return { ok: false, svg: null, errorCode: "NO_QR", fileName };
  }

  let qrPath: string;
  let modules: number;
  try {
    const matrix = encode(qrPayload);
    modules = matrix.size + 8; // 4-module quiet zone on each side
    qrPath = toSvgPath(matrix, { margin: 4, dark: "#000000" });
  } catch (error) {
    return { ok: false, svg: null, errorCode: "ENCODE_FAILED", fileName: String(error) };
  }

  const qrSize = 62;
  const scale = qrSize / modules;
  const pageW = MM.width;
  const margin = MM.margin;
  const contentW = pageW - margin * 2;
  const qrX = margin + (contentW - qrSize) / 2;

  const lang = input.lang;
  const name = escapeXml(input.creator.display_name);
  const tagline = escapeXml(input.creator.tagline ?? "");
  const merchantName = escapeXml(input.method?.qr_decoded?.merchant_name ?? "DEMO STORE");
  const account = escapeXml(input.method?.account_number ?? "");
  const maskedAccount = escapeXml(maskAccount(input.method?.account_number ?? ""));
  const label = escapeXml(input.method?.label ?? "");
  const amountLine = input.amount ? escapeXml(formatTaka(input.amount)) : null;

  const scan = escapeXml(t(lang, "poster.scan"));
  const check = escapeXml(t(lang, "poster.check"));
  const noCustody = escapeXml(t(lang, "poster.noCustody"));
  const brandLine = escapeXml(t(lang, "poster.brandLine"));
  const brand = escapeXml(lang === "bn" ? "চানাস্তা" : "Chanasta");
  const accountLabel = escapeXml(t(lang, "poster.account"));
  const demoMark = input.demo ? `<g transform="translate(${pageW - margin - 20} ${margin})">` +
    `<rect width="20" height="7" rx="2" fill="#000000"/>` +
    `<text x="10" y="5" font-size="3.2" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(t(lang, "poster.demo"))}</text>` +
    `</g>` : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297" role="img" aria-label="${escapeXml(input.creator.display_name)} — ${escapeXml(t(lang, "app.name"))}">
  <rect width="210" height="297" fill="#ffffff"/>
  ${demoMark}
  <g font-family="'Noto Sans Bengali', 'Figtree', system-ui, sans-serif" fill="#0a0a0a">
    <text x="${margin}" y="${margin + 8}" font-size="8" font-weight="700">${brand}</text>
    <text x="${margin}" y="${margin + 13}" font-size="${ptToMm(9)}">${brandLine}</text>
    <line x1="${margin}" y1="${margin + 17}" x2="${pageW - margin}" y2="${margin + 17}" stroke="#0a0a0a" stroke-width="0.6"/>

    <text x="${margin}" y="${margin + 34}" font-size="${ptToMm(19)}" aria-hidden="true">${escapeXml(input.creator.avatar_emoji)}</text>
    <text x="${margin + 15}" y="${margin + 32}" font-size="${ptToMm(28 * 0.72)}" font-weight="700">${name}</text>
    <text x="${margin + 15}" y="${margin + 38}" font-size="${ptToMm(13)}">${tagline}</text>

    <g transform="translate(${qrX} ${margin + 48})">
      <rect width="${qrSize}" height="${qrSize}" fill="#ffffff"/>
      <g transform="scale(${scale.toFixed(6)})">${qrPath}</g>
    </g>

    <text x="${pageW / 2}" y="${margin + 48 + qrSize + 7}" font-size="${ptToMm(16)}" font-weight="700" text-anchor="middle">${merchantName}</text>
    <text x="${pageW / 2}" y="${margin + 48 + qrSize + 13}" font-size="${ptToMm(11)}" text-anchor="middle">${accountLabel}: ${account}</text>
    <text x="${pageW / 2}" y="${margin + 48 + qrSize + 18}" font-size="${ptToMm(9)}" text-anchor="middle" fill="#444444">${maskedAccount}</text>
    ${amountLine ? `<text x="${pageW / 2}" y="${margin + 48 + qrSize + 24}" font-size="${ptToMm(13)}" font-weight="700" text-anchor="middle">${amountLine}</text>` : ""}

    <text x="${margin}" y="${margin + 48 + qrSize + 38}" font-size="${ptToMm(11)}" font-weight="600">${label}</text>
    <text x="${margin}" y="${margin + 48 + qrSize + 44}" font-size="${ptToMm(11)}">${scan}</text>
    <text x="${margin}" y="${margin + 48 + qrSize + 50}" font-size="${ptToMm(10)}">${check}</text>

    <line x1="${margin}" y1="272" x2="${pageW - margin}" y2="272" stroke="#0a0a0a" stroke-width="0.4"/>
    <text x="${margin}" y="278" font-size="${ptToMm(12)}" font-weight="600">${escapeXml(input.url.replace(/^https?:\/\//, ""))}</text>
    <text x="${margin}" y="283" font-size="${ptToMm(9)}">${noCustody}</text>
  </g>
</svg>`;

  return { ok: true, svg, errorCode: null, fileName };
}

/** QR-only SVG (for "Save QR"), reusing the same engine renderer. */
export function generateQrOnlySvg(payload: string, ariaLabel: string): string | null {
  try {
    const matrix = encode(payload);
    const path = toSvgPath(matrix, { margin: 4, dark: "#000000" });
    const dimension = matrix.size + 8;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" width="${dimension * 8}" height="${dimension * 8}" role="img" aria-label="${escapeXml(ariaLabel)}"><rect width="${dimension}" height="${dimension}" fill="#ffffff"/>${path}</svg>`;
  } catch {
    return null;
  }
}
