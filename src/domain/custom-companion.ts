import type { CharacterManifest, ExperienceManifest } from "./manifest";
import { sanitizeCompanionMeta, type CompanionMeta } from "./procedural";

/**
 * Building blocks for user-created companions ("add your own companion").
 *
 * An image becomes a full Experience Pack: a safe pack id is derived from the
 * file name, the image is stored as the pack sprite, and a character is
 * generated so the behavior engine can animate the companion (idle/walk/sleep/
 * yawn). Pure + tested; I/O happens in the main process.
 *
 * Imported companions (the cutout editor pipeline) additionally get a
 * background-free cutout sprite and metadata (cutout flag + anchor point)
 * stored under `manifest.configuration.mischief.imported`, which the overlay
 * uses to drive the procedural canvas animation.
 */

export const CUSTOM_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];

export const DEFAULT_CUSTOM_SPECIES = "custom";
export const CUSTOM_IMPORTED_SPECIES = "custom-imported";
export const DEFAULT_CUSTOM_PERSONALITY = "friendly";

/** Animation states an imported character exposes (matches the procedural engine). */
export const IMPORTED_ANIMATION_KEYS = ["idle", "walk", "run", "happy", "sad", "sleep", "yawn"];

/** The metadata key under `manifest.configuration` for imported companions. */
export const COMPANION_CONFIG_KEY = "mischief";

/**
 * Reads companion metadata back out of a validated experience manifest.
 * Reads the current `imported` key and falls back to the pre-release `pet`
 * key so older saved packs keep working.
 */
export function companionMetaFromConfiguration(
  configuration: Record<string, unknown>
): CompanionMeta {
  const block = configuration[COMPANION_CONFIG_KEY];
  const entry =
    typeof block === "object" && block !== null ? (block as Record<string, unknown>) : {};
  const imported = entry.imported ?? entry.pet;
  return sanitizeCompanionMeta(imported);
}

/** True when the file name is an image format we can use as a sprite. */
export function isCustomImage(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return CUSTOM_IMAGE_EXTENSIONS.includes(ext);
}

/** "My Best Friend.jpg" -> "my-best-friend" (safe kebab-case id). */
export function slugify(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug.length > 0 ? slug : "companion";
}

/** Human-readable display name from a file name: "my_best_friend.jpg" -> "my best friend". */
export function displayNameFromFile(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : "My Companion";
}

/** The on-disk file name a custom sprite is stored as (safe + unique per pack). */
export function storedImageName(id: string, sourceName: string): string {
  const ext = sourceName.split(".").pop()?.toLowerCase() ?? "png";
  return `${id}.${ext}`;
}

/** A manifest for a user-created companion pack. */
export function buildCustomPackManifest(
  id: string,
  displayName: string,
  storedImage: string
): ExperienceManifest {
  return {
    id,
    name: displayName,
    version: "0.1.0",
    category: "custom",
    author: "You",
    license: "MIT",
    description: `Your custom companion "${displayName}", made from your own image.`,
    tags: ["custom", "personal"],
    minimumRuntimeVersion: "0.2.0",
    assets: [`images/${storedImage}`],
    characters: [`characters/${id}.json`],
    animations: [],
    audio: [],
    configuration: {},
    compatibility: { platforms: ["windows", "macos", "linux"] },
  };
}

/**
 * A manifest for an auto-animated imported companion. The cutout sprite is a
 * PNG and the metadata (cutout flag + anchor) travels in `configuration`.
 */
export function buildImportedPackManifest(
  id: string,
  displayName: string,
  storedImage: string,
  meta: CompanionMeta
): ExperienceManifest {
  return {
    id,
    name: displayName,
    version: "0.1.0",
    category: CUSTOM_IMPORTED_SPECIES,
    author: "You",
    license: "MIT",
    description: `Your animated companion "${displayName}", generated from your image.`,
    tags: ["custom", "personal", "animated"],
    minimumRuntimeVersion: "0.2.0",
    assets: [`images/${storedImage}`],
    characters: [`characters/${id}.json`],
    animations: IMPORTED_ANIMATION_KEYS,
    audio: [],
    configuration: { [COMPANION_CONFIG_KEY]: { imported: meta } },
    compatibility: { platforms: ["windows", "macos", "linux"] },
  };
}

/** A character for a user-created companion pack. */
export function buildCustomCharacter(
  id: string,
  displayName: string,
  personality = DEFAULT_CUSTOM_PERSONALITY
): CharacterManifest {
  return {
    id,
    species: DEFAULT_CUSTOM_SPECIES,
    displayName,
    author: "You",
    animations: {
      idle: { fps: 8, duration: 1000, loop: true },
      walk: { fps: 10, duration: 600, loop: true },
      sleep: { fps: 4, duration: 3000, loop: true },
      yawn: { fps: 6, duration: 2200, loop: false },
      happy: { fps: 10, duration: 500, loop: false },
    },
    behavior: {
      weightedDecision: true,
      idleWeight: 0.5,
      walkWeight: 0.3,
      sleepWeight: 0.1,
      yawnWeight: 0.05,
      happyWeight: 0.05,
    },
    personality,
    voice: { enabled: false },
    sounds: [],
  };
}

/**
 * A character for an auto-animated imported companion: the full expression
 * matrix the procedural engine can drive (idle/walk/run/happy/sad/sleep/yawn).
 */
export function buildImportedCharacter(
  id: string,
  displayName: string,
  personality = DEFAULT_CUSTOM_PERSONALITY
): CharacterManifest {
  return {
    id,
    species: CUSTOM_IMPORTED_SPECIES,
    displayName,
    author: "You",
    animations: {
      idle: { fps: 8, duration: 1200, loop: true },
      walk: { fps: 10, duration: 600, loop: true },
      run: { fps: 12, duration: 400, loop: true },
      happy: { fps: 10, duration: 500, loop: true },
      sad: { fps: 6, duration: 1000, loop: true },
      sleep: { fps: 4, duration: 3000, loop: true },
      yawn: { fps: 6, duration: 2200, loop: false },
    },
    behavior: {
      weightedDecision: true,
      idleWeight: 0.35,
      walkWeight: 0.3,
      runWeight: 0.1,
      happyWeight: 0.1,
      sadWeight: 0.1,
      sleepWeight: 0.05,
      yawnWeight: 0.05,
    },
    personality,
    voice: { enabled: false },
    sounds: [],
  };
}
