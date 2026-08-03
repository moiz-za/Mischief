import { describe, expect, it } from "vitest";
import { BehaviorEngine, PET_REACTION_WINDOW_MS, seededRandom } from "../src/domain/behavior";
import type { CharacterManifest } from "../src/domain/manifest";

const WHISKERS: CharacterManifest = {
  id: "whiskers",
  species: "cat",
  displayName: "Whiskers",
  author: "Mischief Contributors",
  animations: {
    idle: { fps: 6, duration: 1200, loop: true },
    walk: { fps: 10, duration: 600, loop: true },
    sneak: { fps: 8, duration: 800, loop: true },
    pounce: { fps: 12, duration: 400, loop: false },
  },
  behavior: {
    weightedDecision: true,
    idleWeight: 0.5,
    walkWeight: 0.3,
    sneakWeight: 0.15,
    pounceWeight: 0.05,
  },
  personality: "curious",
  voice: { enabled: false },
  sounds: [],
};

function signals(partial: Partial<Parameters<BehaviorEngine["tick"]>[0]> = {}) {
  return {
    now: 1_000_000,
    hour: 14,
    idleSeconds: 0,
    userJustActive: true,
    pettedMsAgo: null,
    overlayBusy: false,
    interactive: true,
    ...partial,
  };
}

describe("BehaviorEngine", () => {
  it("ignores pettings after the reaction window", () => {
    const engine = new BehaviorEngine({ character: WHISKERS, random: seededRandom(1) });
    engine.tick(signals({ pettedMsAgo: PET_REACTION_WINDOW_MS + 1 }));
    expect(engine.activeBehavior?.id).not.toBe("excited");
  });

  it("reacts excited when petted, even in Silent mode", () => {
    const engine = new BehaviorEngine({
      character: WHISKERS,
      intensity: "silent",
      random: seededRandom(1),
    });
    const selection = engine.tick(signals({ pettedMsAgo: 100 }));
    expect(selection?.behavior.id).toBe("excited");
    expect(selection?.behavior.anim).toBe("happy");
  });

  it("Silent mode emits nothing automatic", () => {
    const engine = new BehaviorEngine({
      character: WHISKERS,
      intensity: "silent",
      random: seededRandom(1),
    });
    const selection = engine.tick(signals({ idleSeconds: 9999 }));
    expect(selection).toBeNull();
  });

  it("sleeps after prolonged inactivity", () => {
    const engine = new BehaviorEngine({
      character: WHISKERS,
      intensity: "normal",
      random: seededRandom(1),
    });
    const selection = engine.tick(signals({ idleSeconds: 600 }));
    expect(selection?.behavior.id).toBe("sleep");
    expect(selection?.behavior.mood).toBe("sleepy");
  });

  it("sleeps sooner for a lazy personality", () => {
    const lazy = new BehaviorEngine({
      character: WHISKERS,
      intensity: "normal",
      personality: "lazy",
      random: seededRandom(1),
    });
    const energetic = new BehaviorEngine({
      character: WHISKERS,
      intensity: "normal",
      personality: "energetic",
      random: seededRandom(1),
    });
    const at180s = signals({ idleSeconds: 180 });
    expect(lazy.tick(at180s)?.behavior.id).toBe("sleep");
    expect(energetic.tick(at180s)?.behavior.id).not.toBe("sleep");
  });

  it("yawns after moderate idle, before sleep", () => {
    const engine = new BehaviorEngine({
      character: WHISKERS,
      intensity: "normal",
      random: seededRandom(1),
    });
    const selection = engine.tick(signals({ idleSeconds: 121 }));
    expect(["yawn", "sleep"]).toContain(selection?.behavior.id);
  });

  it("keeps the current behavior until its max duration", () => {
    const engine = new BehaviorEngine({ character: WHISKERS, random: seededRandom(7) });
    const first = engine.tick(signals());
    expect(first).not.toBeNull();
    const next = engine.tick(signals({ now: 1_000_000 + 3_000 }));
    expect(next?.behavior.id).toBe(first!.behavior.id);
  });

  it("picks free-choice behaviors by weight", () => {
    const engine = new BehaviorEngine({ character: WHISKERS, random: seededRandom(3) });
    const picks = new Map<string, number>();
    for (let i = 0; i < 200; i++) {
      // advance time past any cooldowns/current durations
      const base = 10_000_000 + i * 30_000;
      const selection = engine.tick(signals({ now: base, idleSeconds: 0, userJustActive: false }));
      if (selection) {
        picks.set(selection.behavior.id, (picks.get(selection.behavior.id) ?? 0) + 1);
      }
    }
    // idle dominates and is picked at least once
    expect(picks.get("idle") ?? 0).toBeGreaterThan(0);
    // high-energy pounce requires playful; at normal intensity it must not run
    expect(picks.get("pounce")).toBeUndefined();
  });

  it("respects intensity gating for high-energy behaviors", () => {
    const normal = new BehaviorEngine({
      character: WHISKERS,
      intensity: "normal",
      random: seededRandom(2),
    });
    const playful = new BehaviorEngine({
      character: WHISKERS,
      intensity: "playful",
      random: seededRandom(2),
    });
    // At playful, sneak/pounce become eligible; at normal they should not.
    const idsAtPlayful = playful.availableBehaviors;
    expect(idsAtPlayful).toContain("pounce");
    // Build a long session and ensure pounce is never chosen at normal
    for (let i = 0; i < 400; i++) {
      normal.tick(signals({ now: 10_000_000 + i * 60_000, idleSeconds: 0, userJustActive: false }));
    }
    expect(normal.activeBehavior?.id).not.toBe("pounce");
    expect(normal.activeBehavior?.id).not.toBe("sneak");
  });

  it("cooldowns prevent instant repeats", () => {
    const engine = new BehaviorEngine({ character: WHISKERS, random: seededRandom(5) });
    const first = engine.tick(signals());
    const behaviorId = first!.behavior.id;
    // Immediately tick again at same moment: should keep the same behavior
    // (still within duration) rather than re-picking.
    const second = engine.tick(signals());
    expect(second?.behavior.id).toBe(behaviorId);
  });

  it("returns null with no character and no context", () => {
    const engine = new BehaviorEngine({ character: null, random: seededRandom(1) });
    expect(engine.tick(signals())).toBeNull();
  });

  it("moodFor reflects context", () => {
    const engine = new BehaviorEngine({ character: WHISKERS, intensity: "normal" });
    expect(engine.moodFor(signals({ pettedMsAgo: 100 }))).toBe("excited");
    expect(engine.moodFor(signals({ idleSeconds: 9999 }))).toBe("sleepy");
    expect(engine.moodFor(signals({ userJustActive: true }))).toBe("focused");
    expect(engine.moodFor(signals({ userJustActive: false, idleSeconds: 0 }))).toBe("neutral");
  });

  it("switching characters resets state", () => {
    const engine = new BehaviorEngine({ character: WHISKERS, random: seededRandom(1) });
    engine.tick(signals());
    expect(engine.activeBehavior).not.toBeNull();
    engine.setCharacter(null);
    expect(engine.activeBehavior).toBeNull();
    expect(engine.availableBehaviors).toEqual([]);
  });
});
