import type { CharacterManifest, ExperienceManifest } from "./manifest";
import { sanitizePetMeta, type PetMeta } from "./procedural";

/**
 * Building blocks for user-created companions ("add your own image").
 *
 * A photo becomes a full Experience Pack: a safe pack id is derived from the
 * file name, the image is stored as the pack sprite, and a character is
 * generated so the behavior engine can animate the companion (idle/walk/sleep/
 * yawn). Pure + tested; I/O happens in the main process.
 *
 * Custom PETs (the auto-animation pipeline) additionally get a background-free
 * cutout sprite and pet metadata (cutout flag + face anchor) stored under
 * `manifest.configuration.mischief.pet`, which the overlay uses to drive the
 * procedural canvas animation.
 */

export const CUSTOM_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];

export const DEFAULT_CUSTOM_SPECIES = "custom";
export const CUSTOM_PET_SPECIES = "custom-pet";
export const DEFAULT_CUSTOM_PERSONALITY = "friendly";

/** Animation states a pet character exposes (matches the procedural engine). */
export const PET_ANIMATION_KEYS = ["idle", "walk", "run", "happy", "sad", "sleep", "yawn"];

/** The metadata key under `manifest.configuration` for custom pets. */
export const PET_CONFIG_KEY = "mischief";

/** Reads pet metadata back out of a validated experience manifest. */
export function petMetaFromConfiguration(configuration: Record<string, unknown>): PetMeta {
  const block = configuration[PET_CONFIG_KEY];
  const pet =
    typeof block === "object" && block !== null ? (block as Record<string, unknown>).pet : undefined;
  return sanitizePetMeta(pet);
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
  const cleaned = base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
 * A manifest for an auto-animated custom pet. The cutout sprite is a PNG and
 * the pet metadata (cutout flag + face anchor) travels in `configuration`.
 */
export function buildPetManifest(
  id: string,
  displayName: string,
  storedImage: string,
  meta: PetMeta
): ExperienceManifest {
  return {
    id,
    name: displayName,
    version: "0.1.0",
    category: CUSTOM_PET_SPECIES,
    author: "You",
    license: "MIT",
    description: `Your animated companion "${displayName}", generated from your photo.`,
    tags: ["custom", "pet", "animated"],
    minimumRuntimeVersion: "0.2.0",
    assets: [`images/${storedImage}`],
    characters: [`characters/${id}.json`],
    animations: PET_ANIMATION_KEYS,
    audio: [],
    configuration: { [PET_CONFIG_KEY]: { pet: meta } },
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
 * A character for an auto-animated custom pet: the full expression matrix the
 * procedural engine can drive (idle/walk/run/happy/sad/sleep/yawn).
 */
export function buildPetCharacter(
  id: string,
  displayName: string,
  personality = DEFAULT_CUSTOM_PERSONALITY
): CharacterManifest {
  return {
    id,
    species: CUSTOM_PET_SPECIES,
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
