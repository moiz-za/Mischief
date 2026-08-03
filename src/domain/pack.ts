import {
  type CharacterManifest,
  type ExperienceManifest,
  type ValidationIssue,
  parseCharacterManifest,
  parseExperienceManifest,
  validateExperienceManifest,
} from "./manifest";

/**
 * Minimal filesystem abstraction so the loader is testable without real I/O.
 */
export interface PackReader {
  exists(relativePath: string): boolean;
  readText(relativePath: string): string | null;
}

export interface LoadedCharacter {
  path: string;
  character: CharacterManifest;
}

export interface LoadedPack {
  manifest: ExperienceManifest;
  characters: LoadedCharacter[];
  missingAssets: string[];
}

export interface PackLoadResult {
  pack: LoadedPack | null;
  errors: ValidationIssue[];
}

/**
 * Load and strictly validate an Experience Pack from its directory.
 * The manifest is the security boundary: invalid content is rejected, never
 * tolerated (spec §95, §97). Assets and referenced characters are resolved
 * against the pack directory and must exist.
 */
export function loadExperiencePack(reader: PackReader): PackLoadResult {
  const manifestText = reader.readText("manifest.json");
  if (manifestText === null) {
    return { pack: null, errors: [{ path: "manifest.json", message: "Missing manifest.json" }] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestText);
  } catch (error) {
    return {
      pack: null,
      errors: [{ path: "manifest.json", message: `Invalid JSON: ${(error as Error).message}` }],
    };
  }

  const manifest = parseExperienceManifest(parsed);
  if (!manifest) {
    return { pack: null, errors: validateExperienceManifest(parsed).errors };
  }

  const errors: ValidationIssue[] = [];
  const missingAssets = manifest.assets.filter((asset) => !reader.exists(asset));
  for (const asset of missingAssets) {
    errors.push({ path: `assets.${asset}`, message: `Asset "${asset}" does not exist` });
  }

  const characters: LoadedCharacter[] = [];
  for (const characterPath of manifest.characters) {
    const characterText = reader.readText(characterPath);
    if (characterText === null) {
      errors.push({
        path: `characters.${characterPath}`,
        message: `Character file "${characterPath}" does not exist`,
      });
      continue;
    }
    let characterParsed: unknown;
    try {
      characterParsed = JSON.parse(characterText);
    } catch (error) {
      errors.push({
        path: `characters.${characterPath}`,
        message: `Invalid JSON: ${(error as Error).message}`,
      });
      continue;
    }
    const character = parseCharacterManifest(characterParsed);
    if (!character) {
      errors.push({
        path: `characters.${characterPath}`,
        message: "Invalid character manifest",
      });
      continue;
    }
    characters.push({ path: characterPath, character });
  }

  if (errors.length > 0) {
    return { pack: null, errors };
  }
  return { pack: { manifest, characters, missingAssets }, errors };
}
