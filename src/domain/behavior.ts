import type { CharacterManifest } from "./manifest";

/**
 * The Behavior Engine (spec §60, §24-27): decides what a character does from
 * context signals — time, user activity, state, desktop context, randomness.
 *
 * - Intensity levels (Silent/Calm/Normal/Playful/Chaos) gate automatic
 *   behaviors; Silent only allows user-initiated reactions (petting).
 * - Personalities (Friendly/Curious/Lazy/Energetic/Mischievous) shape timing
 *   and which behaviors get favored.
 * - Free-choice behaviors are picked by weighted randomness with cooldowns;
 *   contextual behaviors (sleep, yawn, pet-excitement) take priority.
 */

export type Intensity = "silent" | "calm" | "normal" | "playful" | "chaos";
export type Personality = "friendly" | "curious" | "lazy" | "energetic" | "mischievous";
export type Mood = "sleepy" | "curious" | "playful" | "focused" | "neutral" | "excited";

export interface ContextSignals {
  /** Epoch ms timestamp. */
  now: number;
  /** Local hour 0..23. */
  hour: number;
  /** Seconds the user has been inactive. */
  idleSeconds: number;
  /** User interacted within the last ~2s. */
  userJustActive: boolean;
  /** Ms since the last pet/click, or null if never petted. */
  pettedMsAgo: number | null;
  /** The runtime is already animating the window (wander/sleep); don't double-move. */
  overlayBusy: boolean;
  /** Interactive (petting) mode is enabled. */
  interactive: boolean;
}

export interface BehaviorDef {
  id: string;
  /** Animation key the renderer maps to a visual. */
  anim: string;
  mood: Mood;
  /** Character animations (weighted free choice) vs system behaviors. */
  kind: "character" | "system";
  /** Free-choice selection weight. */
  weight: number;
  minSeconds: number;
  maxSeconds: number;
  cooldownSeconds: number;
  /** Minimum intensity required to auto-trigger. */
  requires: Intensity;
  /** The window should wander while this behavior is active. */
  moves: boolean;
  /** User-initiated reactions are allowed even in Silent mode. */
  manual?: boolean;
}

export interface BehaviorSelection {
  behavior: BehaviorDef;
  durationSeconds: number;
}

export interface BehaviorEngineOptions {
  character: CharacterManifest | null;
  intensity?: Intensity;
  personality?: Personality;
  random?: () => number;
}

interface IntensityConfig {
  rank: number;
  sleepAfterSeconds: number;
  yawnAfterSeconds: number;
  cooldownScale: number;
  wanderChance: number;
}

interface PersonalityConfig {
  sleepMultiplier: number;
  wanderWeight: number;
}

const INTENSITY_CONFIG: Record<Intensity, IntensityConfig> = {
  silent: {
    rank: 0,
    sleepAfterSeconds: Number.POSITIVE_INFINITY,
    yawnAfterSeconds: Number.POSITIVE_INFINITY,
    cooldownScale: Number.POSITIVE_INFINITY,
    wanderChance: 0,
  },
  calm: {
    rank: 1,
    sleepAfterSeconds: 600,
    yawnAfterSeconds: 240,
    cooldownScale: 3,
    wanderChance: 0.4,
  },
  normal: {
    rank: 2,
    sleepAfterSeconds: 300,
    yawnAfterSeconds: 120,
    cooldownScale: 1.5,
    wanderChance: 1,
  },
  playful: {
    rank: 3,
    sleepAfterSeconds: 120,
    yawnAfterSeconds: 60,
    cooldownScale: 1,
    wanderChance: 1.6,
  },
  chaos: {
    rank: 4,
    sleepAfterSeconds: 45,
    yawnAfterSeconds: 30,
    cooldownScale: 0.6,
    wanderChance: 2.2,
  },
};

const PERSONALITY_CONFIG: Record<Personality, PersonalityConfig> = {
  friendly: { sleepMultiplier: 1.2, wanderWeight: 0.8 },
  curious: { sleepMultiplier: 1, wanderWeight: 1.4 },
  lazy: { sleepMultiplier: 0.6, wanderWeight: 0.5 },
  energetic: { sleepMultiplier: 1.6, wanderWeight: 1.7 },
  mischievous: { sleepMultiplier: 1, wanderWeight: 1.3 },
};

export const PET_REACTION_WINDOW_MS = 4000;

const MOVEMENT_ANIMS = new Set([
  "walk",
  "waddle",
  "stroll",
  "float",
  "glide",
  "fly",
  "sneak",
  "run",
  "pounce",
  "jump",
]);
const HIGH_ENERGY_ANIMS = new Set([
  "pounce",
  "jump",
  "run",
  "spin",
  "bounce",
  "dance",
  "zoom",
  "sneak",
]);

const SLEEP: BehaviorDef = {
  id: "sleep",
  anim: "sleep",
  mood: "sleepy",
  kind: "system",
  weight: 0,
  minSeconds: 25,
  maxSeconds: 90,
  cooldownSeconds: 300,
  requires: "calm",
  moves: false,
};
const YAWN: BehaviorDef = {
  id: "yawn",
  anim: "yawn",
  mood: "sleepy",
  kind: "system",
  weight: 0,
  minSeconds: 3,
  maxSeconds: 6,
  cooldownSeconds: 90,
  requires: "calm",
  moves: false,
};
const EXCITED: BehaviorDef = {
  id: "excited",
  anim: "happy",
  mood: "excited",
  kind: "system",
  weight: 0,
  minSeconds: 3,
  maxSeconds: 5,
  cooldownSeconds: 25,
  requires: "calm",
  moves: false,
  manual: true,
};

// Playful system behaviors: these run for every companion, including
// user-imported ones that have no animation weights of their own, so custom
// characters stay lively too. Each has a long cooldown so they stay special.
const HIDE: BehaviorDef = {
  id: "hide",
  anim: "hide",
  mood: "curious",
  kind: "system",
  weight: 0.6,
  minSeconds: 6,
  maxSeconds: 12,
  cooldownSeconds: 240,
  requires: "calm",
  moves: true,
};
const PEEK: BehaviorDef = {
  id: "peek",
  anim: "peek",
  mood: "curious",
  kind: "system",
  weight: 0.6,
  minSeconds: 3,
  maxSeconds: 6,
  cooldownSeconds: 90,
  requires: "calm",
  moves: false,
};
const SPIN: BehaviorDef = {
  id: "spin",
  anim: "spin",
  mood: "playful",
  kind: "system",
  weight: 0.6,
  minSeconds: 3,
  maxSeconds: 6,
  cooldownSeconds: 120,
  requires: "calm",
  moves: false,
};
const POUNCE: BehaviorDef = {
  id: "pounce",
  anim: "pounce",
  mood: "playful",
  kind: "system",
  weight: 0.6,
  minSeconds: 4,
  maxSeconds: 8,
  cooldownSeconds: 180,
  requires: "playful",
  moves: true,
};
const SNEAK: BehaviorDef = {
  id: "sneak",
  anim: "sneak",
  mood: "curious",
  kind: "system",
  weight: 0.6,
  minSeconds: 6,
  maxSeconds: 14,
  cooldownSeconds: 150,
  requires: "playful",
  moves: true,
};
const DANCE: BehaviorDef = {
  id: "dance",
  anim: "dance",
  mood: "excited",
  kind: "system",
  weight: 0.6,
  minSeconds: 4,
  maxSeconds: 9,
  cooldownSeconds: 150,
  requires: "normal",
  moves: false,
};

const SYSTEM_PLAYFUL_BEHAVIORS: BehaviorDef[] = [HIDE, PEEK, SPIN, POUNCE, SNEAK, DANCE];

export class BehaviorEngine {
  private characterBehaviors: BehaviorDef[] = [];
  private intensity: Intensity;
  private personality: Personality;
  private random: () => number;
  private current: { behavior: BehaviorDef; startedAt: number } | null = null;
  private cooldowns = new Map<string, number>();
  private character: CharacterManifest | null;

  constructor(options: BehaviorEngineOptions) {
    this.character = options.character ?? null;
    this.intensity = options.intensity ?? "normal";
    this.personality = options.personality ?? "curious";
    this.random = options.random ?? Math.random;
    this.characterBehaviors = this.buildCharacterBehaviors(this.character);
  }

  setCharacter(character: CharacterManifest | null): void {
    this.character = character;
    this.characterBehaviors = this.buildCharacterBehaviors(character);
    this.cooldowns.clear();
    this.current = null;
  }

  setIntensity(intensity: Intensity): void {
    this.intensity = intensity;
  }

  setPersonality(personality: Personality): void {
    this.personality = personality;
  }

  get activeBehavior(): BehaviorDef | null {
    return this.current?.behavior ?? null;
  }

  get availableBehaviors(): string[] {
    return this.characterBehaviors.map((b) => b.id);
  }

  /**
   * Decide the behavior that should be active right now. Returns null when
   * nothing should change the idle state (e.g. Silent mode, or no eligible
   * behavior).
   */
  tick(signals: ContextSignals): BehaviorSelection | null {
    const now = signals.now;
    const intensityCfg = INTENSITY_CONFIG[this.intensity];
    const personalityCfg = PERSONALITY_CONFIG[this.personality];

    // Pet reactions are user-initiated: allowed at every intensity, override all.
    if (signals.pettedMsAgo !== null && signals.pettedMsAgo <= PET_REACTION_WINDOW_MS) {
      return this.switchTo(EXCITED, signals);
    }

    // Silent mode: nothing automatic.
    if (this.intensity === "silent") {
      if (this.current) {
        this.current = null;
      }
      return null;
    }

    // Contextual: sleeping after prolonged inactivity.
    const sleepAfter = intensityCfg.sleepAfterSeconds * personalityCfg.sleepMultiplier;
    if (signals.idleSeconds >= sleepAfter && !signals.overlayBusy) {
      if (this.isOffCooldown(SLEEP, now) || this.current?.behavior.id === "sleep") {
        return this.switchTo(SLEEP, signals);
      }
    }

    // Contextual: a single yawn when the user returns from a short idle.
    const yawnAfter = intensityCfg.yawnAfterSeconds * personalityCfg.sleepMultiplier;
    if (signals.idleSeconds >= yawnAfter && signals.idleSeconds < sleepAfter) {
      if (this.isOffCooldown(YAWN, now) && this.current?.behavior.id !== "yawn") {
        return this.switchTo(YAWN, signals);
      }
    }

    // Keep the current behavior until its max duration elapses.
    if (this.current) {
      const elapsedSeconds = (now - this.current.startedAt) / 1000;
      if (elapsedSeconds < this.current.behavior.maxSeconds) {
        return {
          behavior: this.current.behavior,
          durationSeconds: this.current.behavior.maxSeconds - elapsedSeconds,
        };
      }
    }

    // Free choice among eligible character + system behaviors.
    const eligible = [...this.characterBehaviors, ...SYSTEM_PLAYFUL_BEHAVIORS].filter(
      (b) =>
        b.weight > 0 &&
        this.intensityAllows(b.requires) &&
        this.isOffCooldown(b, now) &&
        this.current?.behavior.id !== b.id
    );
    if (eligible.length > 0) {
      const picked = weightedPick(
        eligible,
        (b) => b.weight * this.effectiveWanderChance(b, intensityCfg, personalityCfg),
        this.random
      );
      return this.switchTo(picked, signals);
    }

    return this.current ? this.toSelection(this.current.behavior, now) : null;
  }

  /** Mood derived purely from context, used for status text. */
  moodFor(signals: ContextSignals): Mood {
    if (signals.pettedMsAgo !== null && signals.pettedMsAgo <= PET_REACTION_WINDOW_MS)
      return "excited";
    const cfg = INTENSITY_CONFIG[this.intensity];
    if (
      signals.idleSeconds >=
      cfg.sleepAfterSeconds * PERSONALITY_CONFIG[this.personality].sleepMultiplier
    ) {
      return "sleepy";
    }
    if (signals.userJustActive) return "focused";
    return this.current?.behavior.mood ?? "neutral";
  }

  private buildCharacterBehaviors(character: CharacterManifest | null): BehaviorDef[] {
    if (!character) return [];
    const weightFields = character.behavior;
    const behaviors: BehaviorDef[] = [];
    for (const anim of Object.keys(character.animations)) {
      const weightField = `${anim}Weight`;
      const weight =
        typeof weightFields[weightField] === "number" ? (weightFields[weightField] as number) : 0.1;
      const moves = MOVEMENT_ANIMS.has(anim);
      const requires = HIGH_ENERGY_ANIMS.has(anim) ? "playful" : moves ? "calm" : "normal";
      behaviors.push({
        id: anim,
        anim,
        mood: moves ? "playful" : "neutral",
        kind: "character",
        weight,
        minSeconds: 4,
        maxSeconds: moves ? 14 : 18,
        cooldownSeconds: moves ? 45 : 90,
        requires,
        moves,
      });
    }
    return behaviors;
  }

  private switchTo(behavior: BehaviorDef, signals: ContextSignals): BehaviorSelection {
    const now = signals.now;
    if (this.current?.behavior.id !== behavior.id) {
      this.current = { behavior, startedAt: now };
    }
    const scale = INTENSITY_CONFIG[this.intensity].cooldownScale;
    this.cooldowns.set(behavior.id, now + behavior.cooldownSeconds * 1000 * scale);
    return this.toSelection(behavior, now);
  }

  private toSelection(behavior: BehaviorDef, now: number): BehaviorSelection {
    const elapsed =
      this.current && this.current.behavior.id === behavior.id
        ? (now - this.current.startedAt) / 1000
        : 0;
    const min = Math.max(0.5, behavior.minSeconds - elapsed);
    const max = Math.max(min, behavior.maxSeconds - elapsed);
    const durationSeconds = randomRange(min, max, this.random);
    return { behavior, durationSeconds };
  }

  private intensityAllows(requires: Intensity): boolean {
    return INTENSITY_CONFIG[this.intensity].rank >= INTENSITY_CONFIG[requires].rank;
  }

  private isOffCooldown(behavior: BehaviorDef, now: number): boolean {
    const availableAt = this.cooldowns.get(behavior.id);
    return availableAt === undefined || now >= availableAt;
  }

  private effectiveWanderChance(
    behavior: BehaviorDef,
    intensityCfg: IntensityConfig,
    personalityCfg: PersonalityConfig
  ): number {
    return behavior.moves ? intensityCfg.wanderChance * personalityCfg.wanderWeight : 1;
  }
}

function weightedPick<T>(items: T[], weightFn: (item: T) => number, random: () => number): T {
  let total = 0;
  for (const item of items) total += Math.max(0, weightFn(item));
  if (total <= 0) return items[0];
  let roll = random() * total;
  for (const item of items) {
    roll -= Math.max(0, weightFn(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function randomRange(min: number, max: number, random: () => number): number {
  return Math.round((min + random() * (max - min)) * 10) / 10;
}

/** Deterministic LCG for reproducible tests. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export const INTENSITIES: Intensity[] = ["silent", "calm", "normal", "playful", "chaos"];
export const PERSONALITIES: Personality[] = [
  "friendly",
  "curious",
  "lazy",
  "energetic",
  "mischievous",
];
