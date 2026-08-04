import { describe, expect, it } from "vitest";
import { pickReaction, type Signal } from "../src/domain/reactions";
import type { CharacterManifest } from "../src/domain/manifest";

const ZEN_CHARACTER: CharacterManifest = {
  id: "zen",
  species: "red-panda",
  displayName: "Zen",
  author: "Mischief Contributors",
  animations: {
    idle: { fps: 8, duration: 1200, loop: true },
    walk: { fps: 10, duration: 600, loop: true },
    run: { fps: 12, duration: 400, loop: true },
    happy: { fps: 10, duration: 500, loop: true },
    sad: { fps: 6, duration: 1000, loop: true },
    sleep: { fps: 4, duration: 1500, loop: true },
    yawn: { fps: 8, duration: 800, loop: false },
  },
  behavior: {
    weightedDecision: true,
    idleWeight: 0.4,
    walkWeight: 0.25,
    happyWeight: 0.15,
    runWeight: 0.1,
    sadWeight: 0.05,
    sleepWeight: 0.05,
  },
  personality: "lazy",
  voice: { enabled: false },
  sounds: [],
  speech: {
    pet: ["Zen pet!", "Zen purr!", "Zen nudge!"],
    "mischief-random": ["Zen sneaks...", "Zen giggles."],
  },
};



describe("pickReaction", () => {
  it("falls back to global pool when no character is provided", () => {
    const result = pickReaction({ kind: "pet" });
    expect(result.text).toBeTruthy();
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("falls back to global pool when character has no speech for the signal", () => {
    const result = pickReaction({ kind: "power-suspend" }, ZEN_CHARACTER);
    expect(result.text).toBeTruthy();
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("uses character-specific speech pool when available", () => {
    const result = pickReaction({ kind: "pet" }, ZEN_CHARACTER);
    expect(result.text).toBeTruthy();
    const zenPetPool = ZEN_CHARACTER.speech!.pet!;
    expect(zenPetPool).toContain(result.text);
  });

  it("uses character-specific speech pool for mischief-random", () => {
    const result = pickReaction({ kind: "mischief-random" }, ZEN_CHARACTER);
    expect(result.text).toBeTruthy();
    const zenPool = ZEN_CHARACTER.speech!["mischief-random"]!;
    expect(zenPool).toContain(result.text);
  });

  it("returns empty reaction for unknown signal kind", () => {
    const result = pickReaction({ kind: "unknown" } as unknown as Signal);
    expect(result.text).toBe("");
    expect(result.durationMs).toBe(0);
  });

  it("returns empty reaction for unknown signal kind even with character", () => {
    const result = pickReaction(
      { kind: "unknown" } as unknown as Signal,
      ZEN_CHARACTER
    );
    expect(result.text).toBe("");
    expect(result.durationMs).toBe(0);
  });

  it("combo-streak signal accepts comboCount", () => {
    const result = pickReaction({ kind: "combo-streak", comboCount: 3 });
    expect(result.text).toBeTruthy();
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("all new signal kinds have non-empty reactions", () => {
    const newSignals: Signal[] = [
      { kind: "ide-save" },
      { kind: "git-commit" },
      { kind: "build-green" },
      { kind: "hydrate" },
      { kind: "posture-check" },
      { kind: "combo-streak", comboCount: 2 },
    ];
    for (const signal of newSignals) {
      const result = pickReaction(signal);
      expect(result.text).toBeTruthy();
      expect(result.durationMs).toBeGreaterThan(0);
    }
  });

  it("character speech pool takes precedence over global pool", () => {
    const result = pickReaction({ kind: "pet" }, ZEN_CHARACTER);
    expect(ZEN_CHARACTER.speech!.pet!.includes(result.text)).toBe(true);
  });

  it("returns a valid reaction from global pool for signals with no character speech", () => {
    const result = pickReaction({ kind: "clipboard-copy" }, ZEN_CHARACTER);
    expect(result.text).toBeTruthy();
    expect(result.durationMs).toBeGreaterThan(0);
  });
});