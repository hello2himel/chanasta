/**
 * Share kit helpers — pure URL/text generation only.
 *
 * No third-party share SDK, no tracking parameters: plain `wa.me` /
 * `facebook.com/sharer` URLs plus the clipboard. The embed snippet is a fixed
 * iframe with an explicit title, fixed height and the documented sandbox.
 */
import { REPORT_EMAIL } from "./config.ts";
import { absoluteUrl } from "./router.ts";
import { t } from "./i18n.ts";
import type { Lang } from "./types.ts";

/** Canonical page URL for a creator. */
export function creatorPageUrl(slug: string, origin: string, base: string = "/"): string {
  return absoluteUrl(`/@${slug}`, origin, base);
}

export function embedPageUrl(slug: string, origin: string, base: string = "/"): string {
  return absoluteUrl(`/embed/@${slug}`, origin, base);
}

/** Creator share text (used by copy + WhatsApp), with the page link inside. */
export function creatorShareText(lang: Lang, creatorName: string, pageUrl: string): string {
  const text = t(lang, "share.creatorText", { link: pageUrl });
  // `creatorName` is not in the template; keep the API for future variants.
  void creatorName;
  return text;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function facebookShareUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

/** The iframe embed snippet shown in onboarding/dashboard/share kit. */
export function embedSnippet(input: {
  embedUrl: string;
  title: string;
  height?: number;
  width?: number;
}): string {
  const height = input.height ?? 480;
  const width = input.width ?? 380;
  const title = input.title.replace(/"/g, "&quot;");
  return `<iframe src="${input.embedUrl}" title="${title}" width="${width}" height="${height}" loading="lazy" style="border:0;max-width:100%" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>`;
}

/** Report mailto link (Lead decision 13: best-effort, email only, no form). */
export function reportMailto(input: {
  slug: string;
  creatorName: string;
  pageUrl: string;
  lang: Lang;
  claimAmount?: number | null;
  pageName?: string;
}): string {
  const subject = t(input.lang, "report.subject", {
    slug: input.slug,
    name: input.pageName ?? input.creatorName,
  });
  const lines: string[] = [];
  lines.push(input.lang === "bn" ? `পেজ: ${input.pageUrl}` : `Page: ${input.pageUrl}`);
  lines.push(input.lang === "bn" ? `ভাষা: ${input.lang}` : `Language: ${input.lang}`);
  if (input.claimAmount != null) {
    lines.push(input.lang === "bn" ? `বার্তার পরিমাণ: ৳${input.claimAmount}` : `Message amount: ৳${input.claimAmount}`);
  }
  lines.push("");
  lines.push(
    input.lang === "bn"
      ? "কী সমস্যা? (অনুগ্রহ করে সংক্ষেপে লিখুন):"
      : "What's wrong? (please describe briefly):",
  );
  lines.push("");
  const body = lines.join("\n");
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** File name for a downloaded poster / QR image. */
export function posterFileName(slug: string): string {
  return `chanasta-poster-${slug}.svg`;
}

export function qrFileName(slug: string, amount: number | null): string {
  return amount === null ? `chanasta-qr-${slug}.svg` : `chanasta-qr-${slug}-${amount}.svg`;
}

/** The public "share kit" block data for the dashboard/onboarding. */
export interface ShareKitData {
  pageUrl: string;
  embedUrl: string;
  shareText: string;
  whatsappUrl: string;
  facebookUrl: string;
  iframe: string;
}

export function buildShareKit(input: {
  slug: string;
  creatorName: string;
  origin: string;
  base?: string;
  lang: Lang;
}): ShareKitData {
  const pageUrl = creatorPageUrl(input.slug, input.origin, input.base ?? "/");
  const embedUrl = embedPageUrl(input.slug, input.origin, input.base ?? "/");
  const title = t(input.lang, "share.iframeTitle", { name: input.creatorName });
  const shareText = creatorShareText(input.lang, input.creatorName, pageUrl);
  return {
    pageUrl,
    embedUrl,
    shareText,
    whatsappUrl: whatsappShareUrl(shareText),
    facebookUrl: facebookShareUrl(pageUrl),
    iframe: embedSnippet({ embedUrl, title }),
  };
}
