import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import {
  POOLS,
  PERSONALITY_POOLS,
  pickReaction,
  reset,
  type Signal,
} from "../src/domain/reactions";
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
  beforeEach(() => reset());

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
    const result = pickReaction({ kind: "unknown" } as unknown as Signal, ZEN_CHARACTER);
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

  it("anti-repeat: consecutive picks never repeat the same line", () => {
    let prev = "";
    for (let i = 0; i < 60; i++) {
      const result = pickReaction({ kind: "pet" });
      expect(result.text).not.toBe(prev);
      prev = result.text;
    }
  });

  it("anti-repeat: no consecutive repeat holds over many picks", () => {
    // The strongest guarantee the picker makes: never the same line twice in a
    // row, even across many picks and pool cycles.
    let prev = "";
    for (let i = 0; i < 100; i++) {
      const result = pickReaction({ kind: "pet" });
      expect(result.text).not.toBe(prev);
      prev = result.text;
    }
  });

  it("anti-repeat: character speech also avoids immediate repeats", () => {
    let prev = "";
    for (let i = 0; i < 30; i++) {
      const result = pickReaction({ kind: "pet" }, ZEN_CHARACTER);
      expect(result.text).not.toBe(prev);
      prev = result.text;
    }
  });

  it("behavior signal resolves to a behavior-specific pool", () => {
    const result = pickReaction({ kind: "behavior", behavior: "spin" });
    expect(result.text).toBeTruthy();
    const spinPool = POOLS["behavior:spin"].map((r) => r.text);
    expect(spinPool).toContain(result.text);
  });

  it("behavior signal falls back to empty for unknown behavior", () => {
    const result = pickReaction({ kind: "behavior", behavior: "dance" });
    expect(result.text).toBeTruthy();
  });

  it("deep-focus signal has non-empty reactions", () => {
    const result = pickReaction({ kind: "deep-focus" });
    expect(result.text).toBeTruthy();
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("weekend signal has non-empty reactions", () => {
    const result = pickReaction({ kind: "weekend" });
    expect(result.text).toBeTruthy();
    expect(result.durationMs).toBeGreaterThan(0);
  });
});

describe("speech species-safety", () => {
  // These tokens belong to specific species. If they appear in the *global*
  // (fallback) pools, any companion could say a line that doesn't match its
  // species — e.g. a ghost saying "my paw hurts" (ISS-0xx).
  const speciesSpecificTokens = ["paw", "claw", "paws", "claws", "hoof", "beak", "snout"];

  it("generic pools never contain species-specific body-part tokens", () => {
    for (const [signal, pool] of Object.entries(POOLS) as [string, { text: string }[]][]) {
      for (const line of pool) {
        const lower = line.text.toLowerCase();
        for (const token of speciesSpecificTokens) {
          expect(lower.includes(token), `${signal} → "${line.text}" mentions "${token}"`).toBe(
            false
          );
        }
      }
    }
  });

  it("every built-in companion has species-appropriate speech for common signals", () => {
    const charactersDir = join(__dirname, "..", "examples", "experiences");
    let checked = 0;
    for (const packDir of readdirSync(charactersDir)) {
      const charsDir = join(charactersDir, packDir, "characters");
      const entries = (() => {
        try {
          return readdirSync(charsDir).filter((f) => f.endsWith(".json"));
        } catch {
          return [];
        }
      })();
      for (const file of entries) {
        const manifest = JSON.parse(
          readFileSync(join(charsDir, file), "utf8")
        ) as CharacterManifest;
        // Each built-in companion must carry its own speech so its bubbles
        // always match its species instead of leaking another species' lines.
        expect(manifest.speech, `${packDir}/${file} should define speech`).toBeTruthy();
        const species = manifest.species.toLowerCase();
        const speech = Object.values(manifest.speech ?? {});
        // No other-species body-part tokens leak into this companion's speech,
        // except its own species (e.g. a cat may say "paw").
        for (const pool of speech) {
          for (const line of pool) {
            const lower = line.toLowerCase();
            for (const token of speciesSpecificTokens) {
              if (lower.includes(token)) {
                const ownSpeciesHasToken =
                  /cat|canine|dog|fox|bear|otter|hedgehog|dino|dragon|capybara|raccoon/.test(
                    species
                  );
                expect(
                  ownSpeciesHasToken,
                  `${packDir}/${file} "${line}" mentions "${token}" but species is "${species}"`
                ).toBe(true);
              }
            }
          }
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(19);
  });
});

describe("personality speech", () => {
  beforeEach(() => reset());

  it("all five personalities have pools for the common signals", () => {
    for (const personality of ["friendly", "curious", "lazy", "energetic", "mischievous"]) {
      for (const signal of ["pet", "mischief-random", "idle-long", "activity-burst"]) {
        const pool = PERSONALITY_POOLS[personality]?.[signal];
        expect(pool, `${personality}/${signal} should have a pool`).toBeTruthy();
        expect(pool!.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("custom companion without speech gets personality-flavored lines", () => {
    const character: CharacterManifest = {
      id: "my-pet",
      species: "custom-imported",
      displayName: "My Pet",
      author: "You",
      animations: {
        idle: { fps: 8, duration: 1200, loop: true },
      },
      behavior: { weightedDecision: true, idleWeight: 1 },
      personality: "mischievous",
      voice: { enabled: false },
      sounds: [],
      // no `speech` — falls back to personality pools
    };
    for (let i = 0; i < 20; i++) {
      const result = pickReaction({ kind: "pet" }, character);
      expect(PERSONALITY_POOLS.mischievous.pet).toContain(result.text);
    }
  });

  it("built-in companion speech still takes precedence over personality pools", () => {
    const result = pickReaction({ kind: "pet" }, ZEN_CHARACTER);
    expect(ZEN_CHARACTER.speech!.pet!.includes(result.text)).toBe(true);
  });

  it("unknown personality falls back to the neutral generic pool", () => {
    const character: CharacterManifest = {
      id: "odd",
      species: "custom-imported",
      displayName: "Odd",
      author: "You",
      animations: {
        idle: { fps: 8, duration: 1200, loop: true },
      },
      behavior: { weightedDecision: true, idleWeight: 1 },
      personality: "nonexistent",
      voice: { enabled: false },
      sounds: [],
    };
    const result = pickReaction({ kind: "pet" }, character);
    expect(POOLS.pet.map((r) => r.text)).toContain(result.text);
  });
});
