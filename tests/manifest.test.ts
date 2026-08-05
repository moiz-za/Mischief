import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  validateCharacterManifest,
  validateExperienceManifest,
  validatePluginManifest,
} from "../src/domain/manifest";

const FIXTURES = path.join(__dirname, "fixtures");

function readJson(relative: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, relative), "utf8"));
}

describe("validateExperienceManifest", () => {
  it("accepts the valid character pack fixture", () => {
    expect(validateExperienceManifest(readJson("valid-character-pack.json")).ok).toBe(true);
  });

  it("accepts the valid seasonal pack fixture", () => {
    expect(validateExperienceManifest(readJson("valid-seasonal-pack.json")).ok).toBe(true);
  });

  it("rejects a manifest missing a required field", () => {
    const result = validateExperienceManifest(readJson("invalid-missing-required-field.json"));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "id")).toBe(true);
  });

  it("rejects a manifest with an unknown extra field", () => {
    const result = validateExperienceManifest(readJson("invalid-unknown-extra-field.json"));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "illegalField")).toBe(true);
  });

  it("rejects a manifest with a bad version string", () => {
    const result = validateExperienceManifest(readJson("invalid-bad-version-string.json"));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "version")).toBe(true);
  });

  it("rejects a non-object manifest", () => {
    expect(validateExperienceManifest(null).ok).toBe(false);
    expect(validateExperienceManifest([]).ok).toBe(false);
    expect(validateExperienceManifest("manifest").ok).toBe(false);
  });

  it("rejects wrong field types", () => {
    const manifest = readJson("valid-character-pack.json") as Record<string, unknown>;
    expect(validateExperienceManifest({ ...manifest, assets: "images/x.png" }).ok).toBe(false);
    expect(validateExperienceManifest({ ...manifest, version: 1 }).ok).toBe(false);
    expect(validateExperienceManifest({ ...manifest, tags: ["ok", 42] }).ok).toBe(false);
  });

  it("rejects an unsupported platform", () => {
    const manifest = readJson("valid-character-pack.json") as Record<string, unknown>;
    const result = validateExperienceManifest({
      ...manifest,
      compatibility: { platforms: ["windows", "beos"] },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "compatibility.platforms")).toBe(true);
  });

  it("rejects a non-kebab-case id", () => {
    const manifest = readJson("valid-character-pack.json") as Record<string, unknown>;
    expect(validateExperienceManifest({ ...manifest, id: "Not Kebab!" }).ok).toBe(false);
  });
});

describe("validateCharacterManifest", () => {
  it("accepts the delivered example characters", () => {
    const experiences = path.join(__dirname, "..", "examples", "experiences");
    for (const pack of fs.readdirSync(experiences)) {
      const charactersDir = path.join(experiences, pack, "characters");
      if (!fs.existsSync(charactersDir)) continue;
      for (const file of fs.readdirSync(charactersDir).filter((f) => f.endsWith(".json"))) {
        const character = JSON.parse(fs.readFileSync(path.join(charactersDir, file), "utf8"));
        expect(validateCharacterManifest(character).ok, `${pack}/${file}`).toBe(true);
      }
    }
  });

  it("rejects a character with an unknown behavior field", () => {
    const result = validateCharacterManifest({
      id: "c",
      species: "cat",
      displayName: "C",
      author: "x",
      animations: { idle: { fps: 6, duration: 1000, loop: true } },
      behavior: { weightedDecision: true, nope: 0.5 },
      personality: "curious",
      voice: { enabled: false },
      sounds: [],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "behavior.nope")).toBe(true);
  });

  it("accepts per-animation weight fields", () => {
    const result = validateCharacterManifest({
      id: "c",
      species: "cat",
      displayName: "C",
      author: "x",
      animations: { idle: { fps: 6, duration: 1000, loop: true } },
      behavior: { weightedDecision: true, idleWeight: 0.7 },
      personality: "curious",
      voice: { enabled: false },
      sounds: [],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a negative animation weight", () => {
    const result = validateCharacterManifest({
      id: "c",
      species: "cat",
      displayName: "C",
      author: "x",
      animations: { idle: { fps: 6, duration: 1000, loop: true } },
      behavior: { weightedDecision: true, idleWeight: -1 },
      personality: "curious",
      voice: { enabled: false },
      sounds: [],
    });
    expect(result.ok).toBe(false);
  });
});

describe("validatePluginManifest", () => {
  it("accepts the hello-plugin example", () => {
    const plugin = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "..", "examples", "plugins", "hello-plugin", "manifest.json"),
        "utf8"
      )
    );
    expect(validatePluginManifest(plugin).ok).toBe(true);
  });

  it("rejects a plugin manifest using the wrong schema (missing required fields)", () => {
    const result = validatePluginManifest({
      id: "event-logger",
      name: "Event Logger",
      version: "0.1.0",
      author: "Mischief Contributors",
      license: "MIT",
      description: "pre-fix schema",
      main: "src/index.js",
      permissions: ["events:read"],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "entrypoint")).toBe(true);
    expect(result.errors.some((e) => e.path === "main")).toBe(true);
  });
});
