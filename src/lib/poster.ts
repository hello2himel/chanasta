/**
 * A4 poster generation (pure SVG) — the "chai receipt" print artifact.
 *
 * One memorable object: a tall receipt with an espresso masthead, mono details,
 * a white QR plate (always black-on-white, ≥62 mm), the amount ladder, the full
 * account number for manual entry (Lead-approved for print), a perforated tear
 * edge and the honest scan/check/no-custody lines. Pure function so it is
 * covered by `node:test`.
 *
 * Print ink stays near-black for crisp output; the coffee identity comes from
 * the espresso band, brass rule, mono receipt typography and the tear edge.
 * No emoji: the wordmark is the RemixIcon cup path (rim + handle + steam).
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

const MM = { width: 210, height: 297, margin: 16 } as const;

/** Print palette: espresso ink, brass accent, white QR plate / page. */
const PRINT = {
  ink: "#241811",
  muted: "#6e5b4b",
  line: "#c7b49d",
  accent: "#9b5521",
  brass: "#b98a2e",
  paper: "#ffffff",
  crema: "#f3e7d6",
  plate: "#ffffff",
} as const;

/** RemixIcon `cup-line` path (MIT) used as the wordmark mark, scaled 18×18 mm. */
const CUP_PATH =
  "M16 13V5H6V13C6 14.1046 6.89543 15 8 15H14C15.1046 15 16 14.1046 16 13ZM5 3H20C21.1046 3 22 3.89543 22 5V8C22 9.10457 21.1046 10 20 10H18V13C18 15.2091 16.2091 17 14 17H8C5.79086 17 4 15.2091 4 13V4C4 3.44772 4.44772 3 5 3ZM18 5V8H20V5H18ZM2 19H20V21H2V19Z";

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

  const pageW = MM.width;
  const pageH = MM.height;
  const margin = MM.margin;
  const contentW = pageW - margin * 2;
  const qrSize = 64;
  const qrX = margin + (contentW - qrSize) / 2;
  const scale = qrSize / modules;

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
  const url = escapeXml(input.url.replace(/^https?:\/\//, ""));
  const demoMark = input.demo
    ? `<g transform="translate(${pageW - margin - 24} ${margin + 4})">
        <rect width="24" height="7" rx="1" fill="none" stroke="${PRINT.accent}" stroke-width="0.5" stroke-dasharray="1.2 1"/>
        <text x="12" y="4.8" font-size="3.4" font-weight="700" fill="${PRINT.accent}" text-anchor="middle" font-family="'Noto Serif Bengali', serif">${escapeXml(t(lang, "poster.demo"))}</text>
      </g>`
    : "";

  // Receipt-shaped content: masthead band, details, QR, instructions, tear edge.
  const mastheadH = 34;
  const qrTop = 96;
  const rulesY = qrTop + qrSize + 22;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297" role="img" aria-label="${escapeXml(input.creator.display_name)} — ${escapeXml(t(lang, "app.name"))}">
  <rect width="210" height="297" fill="${PRINT.paper}"/>
  <g font-family="'Spectral', 'Noto Serif Bengali', Georgia, serif" fill="${PRINT.ink}">

    <!-- espresso masthead -->
    <rect x="0" y="0" width="${pageW}" height="${mastheadH}" fill="${PRINT.ink}"/>
    <g transform="translate(${margin} ${(mastheadH - 11) / 2}) scale(0.46)" fill="${PRINT.crema}">
      <path d="${CUP_PATH}"/>
    </g>
    <text x="${margin + 13}" y="${mastheadH / 2 + 2.6}" font-size="${ptToMm(15)}" font-weight="700" fill="${PRINT.crema}">${brand}</text>
    <text x="${pageW - margin}" y="${mastheadH / 2 + 1}" font-size="3.2" text-anchor="end" fill="${PRINT.crema}" font-family="ui-monospace, Menlo, monospace">${url}</text>
    ${demoMark}

    <!-- creator -->
    <text x="${margin}" y="${mastheadH + 14}" font-size="${ptToMm(26 * 0.72)}" font-weight="700">${name}</text>
    ${tagline ? `<text x="${margin}" y="${mastheadH + 21}" font-size="3.6" fill="${PRINT.muted}">${tagline}</text>` : ""}

    <!-- receipt rule + label -->
    <line x1="${margin}" y1="${mastheadH + 26}" x2="${pageW - margin}" y2="${mastheadH + 26}" stroke="${PRINT.line}" stroke-width="0.4"/>
    <text x="${margin}" y="${mastheadH + 32}" font-size="2.9" fill="${PRINT.muted}" font-family="ui-monospace, Menlo, monospace" letter-spacing="0.3">${brandLine}</text>

    <!-- QR plate (always black on white) -->
    <g transform="translate(${qrX} ${qrTop})">
      <rect x="-3" y="-3" width="${qrSize + 6}" height="${qrSize + 6}" fill="${PRINT.plate}" stroke="${PRINT.line}" stroke-width="0.4"/>
      <g transform="scale(${scale.toFixed(6)})">${qrPath}</g>
    </g>
    <text x="${pageW / 2}" y="${qrTop + qrSize + 9}" font-size="4" font-weight="700" text-anchor="middle">${merchantName}</text>
    <text x="${pageW / 2}" y="${qrTop + qrSize + 15}" font-size="2.9" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">${accountLabel}: ${account}</text>
    <text x="${pageW / 2}" y="${qrTop + qrSize + 20}" font-size="2.6" text-anchor="middle" fill="${PRINT.muted}" font-family="ui-monospace, Menlo, monospace">${maskedAccount}</text>
    ${amountLine ? `<text x="${pageW / 2}" y="${qrTop + qrSize + 28}" font-size="5.4" font-weight="700" text-anchor="middle" fill="${PRINT.accent}">${amountLine}</text>` : ""}

    <!-- instructions, in receipt voice -->
    <line x1="${margin}" y1="${rulesY}" x2="${pageW - margin}" y2="${rulesY}" stroke="${PRINT.line}" stroke-width="0.4"/>
    <text x="${margin}" y="${rulesY + 7}" font-size="2.8" font-weight="700" fill="${PRINT.accent}" font-family="ui-monospace, Menlo, monospace" letter-spacing="0.4">${label}</text>
    <text x="${margin}" y="${rulesY + 14}" font-size="3.5">${scan}</text>
    <text x="${margin}" y="${rulesY + 20}" font-size="3.2" fill="${PRINT.muted}">${check}</text>

    <!-- tear edge -->
    <g>
      <line x1="${margin}" y1="${pageH - 26}" x2="${pageW - margin}" y2="${pageH - 26}" stroke="${PRINT.line}" stroke-width="0.5" stroke-dasharray="2 1.6"/>
      ${[0, 1, 2, 3, 4, 5, 6]
        .map((i) => {
          const cx = margin + ((contentW / 7) * (i + 0.5)).toFixed(2);
          return `<circle cx="${cx}" cy="${pageH - 26}" r="1.6" fill="${PRINT.paper}" stroke="${PRINT.line}" stroke-width="0.4"/>`;
        })
        .join("")}
    </g>

    <!-- stub -->
    <text x="${margin}" y="${pageH - 16}" font-size="3.1" font-weight="600">${escapeXml(t(lang, "app.name"))}</text>
    <text x="${margin}" y="${pageH - 11}" font-size="2.7" fill="${PRINT.muted}">${noCustody}</text>
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
