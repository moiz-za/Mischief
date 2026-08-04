import { describe, expect, it } from "vitest";
import {
  buildCustomCharacter,
  buildCustomPackManifest,
  buildImportedCharacter,
  buildImportedPackManifest,
  companionMetaFromConfiguration,
  CUSTOM_IMPORTED_SPECIES,
  displayNameFromFile,
  IMPORTED_ANIMATION_KEYS,
  isCustomImage,
  slugify,
  storedImageName,
} from "../src/domain/custom-companion";
import { validateCharacterManifest, validateExperienceManifest } from "../src/domain/manifest";
import { sanitizeCompanionMeta, type CompanionMeta } from "../src/domain/procedural";

describe("isCustomImage", () => {
  it("accepts supported image extensions", () => {
    for (const name of ["buddy.png", "buddy.jpg", "buddy.jpeg", "buddy.webp", "buddy.gif"]) {
      expect(isCustomImage(name), name).toBe(true);
    }
  });

  it("rejects non-images and extensionless files", () => {
    expect(isCustomImage("buddy.mp3")).toBe(false);
    expect(isCustomImage("buddy")).toBe(false);
    expect(isCustomImage("buddy.exe")).toBe(false);
  });
});

describe("slugify", () => {
  it("produces safe kebab-case ids from file names", () => {
    expect(slugify("My Best Friend.jpg")).toBe("my-best-friend");
    expect(slugify("Fluffy_McPaws.png")).toBe("fluffy-mcpaws");
    expect(slugify("snake_case and spaces.png")).toBe("snake-case-and-spaces");
  });

  it("handles edge cases", () => {
    expect(slugify("----.png")).toBe("companion");
    expect(slugify("CaFé.gif")).toBe("caf");
    expect(slugify("123.png")).toBe("123");
  });
});

describe("displayNameFromFile", () => {
  it("turns file names into friendly display names", () => {
    expect(displayNameFromFile("my_best_friend.jpg")).toBe("my best friend");
    expect(displayNameFromFile("Fluffy.png")).toBe("Fluffy");
  });

  it("falls back for empty names", () => {
    expect(displayNameFromFile("____.jpg")).toBe("My Companion");
  });
});

describe("storedImageName", () => {
  it("names the stored sprite after the pack id with the source extension", () => {
    expect(storedImageName("my-best-friend", "My Best Friend.jpg")).toBe(
      "my-best-friend.jpg"
    );
    expect(storedImageName("buddy", "buddy.png")).toBe("buddy.png");
  });
});

describe("custom pack/character builders produce valid manifests", () => {
  it("the generated manifest passes strict validation", () => {
    const manifest = buildCustomPackManifest("fluffy", "Fluffy", "fluffy.png");
    const result = validateExperienceManifest(manifest);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(manifest.assets).toEqual(["images/fluffy.png"]);
  });

  it("the generated character passes strict validation", () => {
    const character = buildCustomCharacter("fluffy", "Fluffy");
    const result = validateCharacterManifest(character);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(character.personality).toBe("friendly");
  });
});

describe("imported pack/character builders", () => {
  const meta: CompanionMeta = sanitizeCompanionMeta({ cutout: true, face: { x: 0.5, y: 0.3 } });

  it("the generated imported manifest passes strict validation", () => {
    const manifest = buildImportedPackManifest("buddy", "Buddy", "buddy.png", meta);
    const result = validateExperienceManifest(manifest);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(manifest.animations).toEqual(IMPORTED_ANIMATION_KEYS);
    expect(manifest.category).toBe(CUSTOM_IMPORTED_SPECIES);
    expect(manifest.configuration.mischief).toEqual({ imported: meta });
  });

  it("the generated imported character passes strict validation", () => {
    const character = buildImportedCharacter("buddy", "Buddy");
    const result = validateCharacterManifest(character);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(character.species).toBe(CUSTOM_IMPORTED_SPECIES);
    expect(Object.keys(character.animations)).toEqual(IMPORTED_ANIMATION_KEYS);
    expect(character.animations.run).toBeDefined();
    expect(character.animations.sad).toBeDefined();
    expect(character.behavior.sadWeight).toBeGreaterThan(0);
  });

  it("companion metadata round-trips through the manifest configuration", () => {
    const manifest = buildImportedPackManifest("buddy", "Buddy", "buddy.png", meta);
    const restored = companionMetaFromConfiguration(manifest.configuration);
    expect(restored).toEqual(meta);
  });

  it("reads the legacy pre-release pet config key so old packs keep working", () => {
    const legacyConfiguration = {
      mischief: { pet: { cutout: true, face: { x: 0.6, y: 0.4 } } },
    };
    expect(companionMetaFromConfiguration(legacyConfiguration)).toEqual({
      cutout: true,
      face: { x: 0.6, y: 0.4 },
    });
  });
});
