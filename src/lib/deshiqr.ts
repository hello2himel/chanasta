/**
 * The vendored deshiQR engine.
 *
 * deshiQR (https://github.com/hello2himel/deshiQR) is the developer-facing Bangla QR
 * payload library. Chanasta vendors a pinned copy under `vendor/deshiqr/` so this repo
 * builds anywhere without a registry or cross-repo install. Re-sync with:
 *
 *   pnpm sync:deshiqr
 *
 * Import payload helpers from this module, never from `vendor/` directly.
 */
export * from "../../vendor/deshiqr/core/src/index.ts";
