import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, parseConfig, sanitizeConfig, serializeConfig } from "../src/domain/config";

describe("sanitizeConfig", () => {
  it("returns defaults for garbage input", () => {
    expect(sanitizeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(sanitizeConfig("nope")).toEqual(DEFAULT_CONFIG);
    expect(sanitizeConfig([])).toEqual(DEFAULT_CONFIG);
  });

  it("keeps valid fields and falls back per-invalid-field", () => {
    const config = sanitizeConfig({
      companionId: "ghost-companion",
      intensity: "chaos",
      personality: "bogus",
      interactive: 42,
      followCursor: true,
    });
    expect(config.companionId).toBe("ghost-companion");
    expect(config.intensity).toBe("chaos");
    expect(config.personality).toBe(DEFAULT_CONFIG.personality);
    expect(config.interactive).toBe(true);
    expect(config.followCursor).toBe(true);
  });

  it("falls back for an empty or non-string companionId", () => {
    expect(sanitizeConfig({ companionId: "" }).companionId).toBe(DEFAULT_CONFIG.companionId);
    expect(sanitizeConfig({ companionId: 42 }).companionId).toBe(DEFAULT_CONFIG.companionId);
  });

  it("accepts any non-empty companionId (installed packs resolve at runtime)", () => {
    expect(sanitizeConfig({ companionId: "robot-companion" }).companionId).toBe("robot-companion");
  });

  it("accepts all intensity and personality values", () => {
    for (const intensity of ["silent", "calm", "normal", "playful", "chaos"]) {
      expect(sanitizeConfig({ intensity }).intensity).toBe(intensity);
    }
    for (const personality of ["friendly", "curious", "lazy", "energetic", "mischievous"]) {
      expect(sanitizeConfig({ personality }).personality).toBe(personality);
    }
  });
});

describe("parseConfig / serializeConfig", () => {
  it("round-trips a config", () => {
    const config = {
      companionId: "robot-companion" as const,
      intensity: "playful" as const,
      personality: "lazy" as const,
      interactive: true,
      followCursor: false,
      soundEnabled: true,
    };
    expect(parseConfig(serializeConfig(config))).toEqual(config);
  });

  it("falls back to defaults on invalid JSON", () => {
    expect(parseConfig("{not json")).toEqual(DEFAULT_CONFIG);
  });

  it("falls back to defaults on valid JSON with bad values", () => {
    expect(parseConfig('{ "intensity": "extreme" }')).toEqual(DEFAULT_CONFIG);
  });
});
