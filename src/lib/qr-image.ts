/**
 * Browser-only QR screenshot decoding with `jsqr`.
 *
 * This module is imported dynamically and only after the creator picks an image
 * (architecture.md §5, ui-ux §8.2): the supporter page and landing never load
 * jsqr. Even the failure paths keep the manual-number method available.
 */
import { classifyPayload } from "./qr-payload.ts";

export const MAX_QR_IMAGE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_QR_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type ImageDecodeError = "too_large" | "unsupported_type" | "decode_failed" | "read_failed";

export interface ImageDecodeResult {
  ok: boolean;
  /** Decoded payload text when a QR was found. */
  payload: string | null;
  /** Classification of the decoded payload (verified / unverified / none). */
  classification: ReturnType<typeof classifyPayload> | null;
  error: ImageDecodeError | null;
}

function validateFile(file: File): ImageDecodeError | null {
  if (file.size > MAX_QR_IMAGE_BYTES) return "too_large";
  if (file.type && !(ACCEPTED_QR_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "unsupported_type";
  }
  return null;
}

async function decodeWithJsQr(imageData: ImageData): Promise<string | null> {
  const module = await import("jsqr");
  const jsQR = module.default;
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data?.trim() || null;
}

async function fileToImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    // Downscale very large screenshots: QR decoding does not need 4000 px.
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    context.drawImage(bitmap, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
  } finally {
    bitmap.close?.();
  }
}

/** Decode an uploaded QR screenshot and classify its payload. */
export async function decodeQrImageFile(file: File): Promise<ImageDecodeResult> {
  const problem = validateFile(file);
  if (problem) {
    return { ok: false, payload: null, classification: null, error: problem };
  }
  try {
    const imageData = await fileToImageData(file);
    const payload = await decodeWithJsQr(imageData);
    if (!payload) {
      return { ok: false, payload: null, classification: null, error: "decode_failed" };
    }
    return { ok: true, payload, classification: classifyPayload(payload), error: null };
  } catch {
    return { ok: false, payload: null, classification: null, error: "read_failed" };
  }
}

/** Decode an already-loaded canvas/image (used by tests/dev tools). */
export async function decodeQrImageData(imageData: ImageData): Promise<ImageDecodeResult> {
  try {
    const payload = await decodeWithJsQr(imageData);
    if (!payload) return { ok: false, payload: null, classification: null, error: "decode_failed" };
    return { ok: true, payload, classification: classifyPayload(payload), error: null };
  } catch {
    return { ok: false, payload: null, classification: null, error: "decode_failed" };
  }
}
