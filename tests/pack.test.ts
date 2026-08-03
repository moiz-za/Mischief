import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { PackReader } from "../src/domain/pack";
import { loadExperiencePack } from "../src/domain/pack";
import { validatePluginManifest } from "../src/domain/manifest";

const VALID_MANIFEST = {
  id: "test-pack",
  name: "Test Pack",
  version: "0.1.0",
  category: "animals",
  author: "Mischief Test Suite",
  license: "MIT",
  description: "A valid experience pack for loader tests.",
  tags: ["test"],
  minimumRuntimeVersion: "0.1.0",
  assets: ["images/creature.svg"],
  characters: ["characters/whiskers.json"],
  animations: [],
  audio: [],
  configuration: { idleTimeoutMs: 30000 },
  compatibility: { platforms: ["windows", "macos", "linux"] },
};

const VALID_CHARACTER = {
  id: "whiskers",
  species: "cat",
  displayName: "Whiskers",
  author: "Mischief Test Suite",
  animations: {
    idle: { fps: 6, duration: 1200, loop: true },
    walk: { fps: 10, duration: 600, loop: true },
  },
  behavior: { weightedDecision: true, idleWeight: 0.7, walkWeight: 0.3 },
  personality: "curious",
  voice: { enabled: false },
  sounds: [],
};

function memoryReader(files: Record<string, string>): PackReader {
  return {
    exists(relative) {
      return relative in files;
    },
    readText(relative) {
      return relative in files ? files[relative] : null;
    },
  };
}

function dirReader(dir: string): PackReader {
  return {
    exists(relative) {
      return fs.existsSync(path.join(dir, relative));
    },
    readText(relative) {
      try {
        return fs.readFileSync(path.join(dir, relative), "utf8");
      } catch {
        return null;
      }
    },
  };
}

describe("example packs are run-ready", () => {
  const experiencesDir = path.join(__dirname, "..", "examples", "experiences");

  it("every example experience pack loads cleanly from disk", () => {
    for (const pack of fs.readdirSync(experiencesDir)) {
      const result = loadExperiencePack(dirReader(path.join(experiencesDir, pack)));
      expect(result.pack, `${pack}: ${JSON.stringify(result.errors)}`).not.toBeNull();
    }
  });

  it("every example plugin manifest validates", () => {
    const pluginsDir = path.join(__dirname, "..", "examples", "plugins");
    for (const plugin of fs.readdirSync(pluginsDir)) {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(pluginsDir, plugin, "manifest.json"), "utf8")
      );
      const result = validatePluginManifest(manifest);
      expect(result.ok, `${plugin}: ${JSON.stringify(result.errors)}`).toBe(true);
    }
  });
});

describe("loadExperiencePack", () => {
  it("loads a valid pack with its character", () => {
    const result = loadExperiencePack(
      memoryReader({
        "manifest.json": JSON.stringify(VALID_MANIFEST),
        "characters/whiskers.json": JSON.stringify(VALID_CHARACTER),
        "images/creature.svg": "<svg />",
      })
    );
    expect(result.errors).toEqual([]);
    expect(result.pack).not.toBeNull();
    expect(result.pack!.manifest.id).toBe("test-pack");
    expect(result.pack!.characters).toHaveLength(1);
    expect(result.pack!.characters[0].character.displayName).toBe("Whiskers");
    expect(result.pack!.missingAssets).toEqual([]);
  });

  it("reports a missing manifest", () => {
    const result = loadExperiencePack(memoryReader({}));
    expect(result.pack).toBeNull();
    expect(result.errors).toEqual([{ path: "manifest.json", message: "Missing manifest.json" }]);
  });

  it("rejects invalid manifest JSON", () => {
    const result = loadExperiencePack(memoryReader({ "manifest.json": "{not json" }));
    expect(result.pack).toBeNull();
    expect(result.errors[0].path).toBe("manifest.json");
    expect(result.errors[0].message).toMatch(/Invalid JSON/);
  });

  it("rejects a manifest that fails schema validation", () => {
    const bad = { ...VALID_MANIFEST, id: "Not Kebab!" };
    const result = loadExperiencePack(memoryReader({ "manifest.json": JSON.stringify(bad) }));
    expect(result.pack).toBeNull();
    expect(result.errors.some((e) => e.path === "id")).toBe(true);
  });

  it("reports assets that do not exist", () => {
    const result = loadExperiencePack(
      memoryReader({
        "manifest.json": JSON.stringify(VALID_MANIFEST),
        "characters/whiskers.json": JSON.stringify(VALID_CHARACTER),
      })
    );
    expect(result.pack).toBeNull();
    expect(result.errors.some((e) => e.path === "assets.images/creature.svg")).toBe(true);
  });

  it("reports a referenced character file that does not exist", () => {
    const result = loadExperiencePack(
      memoryReader({
        "manifest.json": JSON.stringify(VALID_MANIFEST),
        "images/creature.svg": "<svg />",
      })
    );
    expect(result.pack).toBeNull();
    expect(result.errors.some((e) => e.path === "characters.characters/whiskers.json")).toBe(true);
  });

  it("rejects an invalid character manifest", () => {
    const badCharacter = { ...VALID_CHARACTER, behavior: { nope: true } };
    const result = loadExperiencePack(
      memoryReader({
        "manifest.json": JSON.stringify(VALID_MANIFEST),
        "characters/whiskers.json": JSON.stringify(badCharacter),
        "images/creature.svg": "<svg />",
      })
    );
    expect(result.pack).toBeNull();
    expect(
      result.errors.some((e) => e.path.startsWith("characters.characters/whiskers.json"))
    ).toBe(true);
  });
});
