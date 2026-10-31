/**
 * The vendored deshiQR QR encoder and SVG renderer.
 *
 * Like `deshiqr.ts`, this is a pinned copy of `deshiqr-qr` from the deshiQR repo.
 * Re-sync with `pnpm sync:deshiqr`.
 */
export { encode, getVersionCapacity, toSvg, toSvgPath, toTerminal } from "../../vendor/deshiqr/qr/src/index.ts";
export type {
  EcLevel,
  EncodeOptions,
  QrMatrix,
  SvgOptions,
  TerminalOptions,
} from "../../vendor/deshiqr/qr/src/types.ts";
