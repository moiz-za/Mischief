import { describe, expect, it } from "vitest";
import {
  buildCustomCharacter,
  buildCustomPackManifest,
  displayNameFromFile,
  isCustomImage,
  slugify,
  storedImageName,
} from "../src/domain/custom-companion";
import { validateCharacterManifest, validateExperienceManifest } from "../src/domain/manifest";

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
