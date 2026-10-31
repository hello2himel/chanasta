/**
 * Creator identity marks.
 *
 * The product shows a creator's avatar as a RemixIcon glyph inside a warm
 * paper disc — never an emoji. New pages store a RemixIcon class (e.g.
 * `ri-palette-line`); legacy rows may still hold an emoji from the first
 * build, so `avatarIconClass()` maps those too. No emoji is ever rendered.
 */
export const AVATAR_ICONS = [
  "ri-cup-line",
  "ri-receipt-line",
  "ri-quill-pen-line",
  "ri-palette-line",
  "ri-book-open-line",
  "ri-mic-line",
  "ri-film-line",
  "ri-guitar-line",
  "ri-camera-line",
  "ri-code-s-slash-line",
  "ri-graduation-cap-line",
  "ri-plant-line",
  "ri-moon-line",
  "ri-star-line",
  "ri-sun-line",
  "ri-heart-line",
  "ri-hand-heart-line",
  "ri-store-2-line",
] as const;

export type AvatarIcon = (typeof AVATAR_ICONS)[number];


/**
 * RemixIcon class for a stored avatar value.
 *
 * The field is still called `avatar_emoji` for database compatibility, but it
 * stores a RemixIcon class. Anything that is not an icon class falls back to a
 * neutral glyph — no emoji is ever rendered.
 */
export function avatarIconClass(value: string | null | undefined): string {
  if (!value) return "ri-cup-line";
  if (value.startsWith("ri-")) return value;
  return "ri-user-smile-line";
}
