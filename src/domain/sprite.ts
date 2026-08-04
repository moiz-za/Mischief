/**
 * Sprite selection for companions (spec §200 assets).
 *
 * A pack may reference any image format the overlay `<img>` can render:
 * SVG, PNG, JPG/JPEG, WebP, and animated GIF. Picking a sprite is a pure,
 * testable decision so the pack loader and the companion switcher share one
 * rule set. Path safety is part of the security boundary: the chosen path is
 * turned into an overlay URL, so traversal (`..`), absolute paths (`/`), and
 * anything outside a safe filename charset are rejected.
 */

export const SUPPORTED_SPRITE_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp", "gif"];

/** A path that is safe to turn into a relative overlay sprite URL. */
export function isSafeSpritePath(asset: string): boolean {
  return !asset.includes("..") && !asset.startsWith("/") && /^[a-zA-Z0-9._/-]+$/.test(asset);
}

/** Returns the first asset that is a supported, safe sprite, or null. */
export function pickSprite(assets: string[]): string | null {
  for (const asset of assets) {
    if (!isSafeSpritePath(asset)) continue;
    const lower = asset.toLowerCase();
    if (SUPPORTED_SPRITE_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`))) return asset;
  }
  return null;
}
