/**
 * Icon layer — RemixIcon only (https://remixicon.com), outlined, 24px grid.
 *
 * One family, one style, one optical weight. No hand-drawn icon set, no emoji,
 * no mixed libraries. `icon()` returns trusted markup (`<i class="ri-…">`) that
 * callers embed through `h()`'s `html` prop. Icons are decorative by default;
 * meaningful controls carry a text label or aria-label.
 */
const REMIX: Record<string, string> = {
  copy: "ri-file-copy-line",
  check: "ri-check-line",
  checkCircle: "ri-checkbox-circle-line",
  eye: "ri-eye-line",
  eyeOff: "ri-eye-off-line",
  download: "ri-download-line",
  share: "ri-share-line",
  info: "ri-information-line",
  warning: "ri-alert-line",
  x: "ri-close-line",
  plus: "ri-add-line",
  arrowUp: "ri-arrow-up-line",
  arrowDown: "ri-arrow-down-line",
  arrowRight: "ri-arrow-right-line",
  arrowLeft: "ri-arrow-left-line",
  chevronDown: "ri-arrow-down-s-line",
  chevronRight: "ri-arrow-right-s-line",
  globe: "ri-global-line",
  trash: "ri-delete-bin-line",
  edit: "ri-edit-line",
  image: "ri-image-line",
  spinner: "ri-loader-4-line",
  mail: "ri-mail-line",
  external: "ri-external-link-line",
  sun: "ri-sun-line",
  moon: "ri-moon-line",
  home: "ri-home-line",
  message: "ri-message-3-line",
  user: "ri-user-line",
  card: "ri-bank-card-line",
  settings: "ri-settings-3-line",
  qr: "ri-qr-code-line",
  bank: "ri-bank-line",
  hash: "ri-hashtag",
  clock: "ri-time-line",
  lock: "ri-lock-line",
  heart: "ri-heart-line",
  emoji: "ri-emotion-line",
  // Coffee / product set
  cup: "ri-cup-line",
  receipt: "ri-receipt-line",
  wallet: "ri-wallet-3-line",
  palette: "ri-palette-line",
  quill: "ri-quill-pen-line",
  mic: "ri-mic-line",
  film: "ri-film-line",
  guitar: "ri-guitar-line",
  camera: "ri-camera-line",
  code: "ri-code-s-slash-line",
  graduation: "ri-graduation-cap-line",
  plant: "ri-plant-line",
  star: "ri-star-line",
  bookmark: "ri-bookmark-line",
  link: "ri-link",
  shield: "ri-shield-check-line",
  stamp: "ri-stamp-line",
  whatsapp: "ri-whatsapp-line",
  facebook: "ri-facebook-circle-line",
  feather: "ri-feather-line",
  scroll: "ri-scroll-line",
  money: "ri-money-cny-circle-line",
  refund: "ri-refund-2-line",
  handHeart: "ri-hand-heart-line",
  store: "ri-store-2-line",
  tea: "ri-cup-line",
};

export type IconName = keyof typeof REMIX;

/** RemixIcon class for a semantic name (fallback: information). */
export function remixClass(name: IconName): string {
  return REMIX[name] ?? REMIX.info!;
}

export function icon(name: IconName, size = 20): string {
  return `<i class="${remixClass(name)} ri" style="font-size:${size}px" aria-hidden="true" focusable="false"></i>`;
}

/** Wordmark / empty-state motif: the cup is the product's one symbol. */
export function steamMark(size = 28): string {
  return `<i class="ri-cup-line ri" style="font-size:${size}px" aria-hidden="true" focusable="false"></i>`;
}
