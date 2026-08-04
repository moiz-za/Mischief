import type { CharacterManifest } from "./manifest";

export interface Reaction {
  text: string;
  durationMs: number;
}

export type Signal =
  | { kind: "power-suspend" }
  | { kind: "power-resume" }
  | { kind: "lock-screen" }
  | { kind: "unlock-screen" }
  | { kind: "on-ac" }
  | { kind: "on-battery" }
  | { kind: "activity-burst" }
  | { kind: "idle-long" }
  | { kind: "app-shutdown" }
  | { kind: "time-morning" }
  | { kind: "time-lunch" }
  | { kind: "time-evening" }
  | { kind: "time-night" }
  | { kind: "clipboard-copy" }
  | { kind: "screenshot" }
  | { kind: "pet" }
  | { kind: "mischief-random" }
  | { kind: "ide-save" }
  | { kind: "git-commit" }
  | { kind: "build-green" }
  | { kind: "hydrate" }
  | { kind: "posture-check" }
  | { kind: "combo-streak"; comboCount: number };

const POOLS: Record<string, Reaction[]> = {
  "power-suspend": [
    { text: "Zzz…", durationMs: 4000 },
    { text: "Nap time…", durationMs: 4000 },
    { text: "Sleeping…", durationMs: 4500 },
  ],
  "power-resume": [
    { text: "I'm back!", durationMs: 3500 },
    { text: "Wake up!", durationMs: 3000 },
    { text: "Alive again.", durationMs: 3500 },
  ],
  "lock-screen": [
    { text: "Who locked me in?", durationMs: 4000 },
    { text: "Let me out!", durationMs: 3500 },
    { text: "Hello? Anyone?", durationMs: 4000 },
  ],
  "unlock-screen": [
    { text: "Hi again!", durationMs: 3000 },
    { text: "Welcome back.", durationMs: 3500 },
    { text: "Good to see you.", durationMs: 3500 },
  ],
  "on-ac": [
    { text: "Charging me up!", durationMs: 3000 },
    { text: "Full power!", durationMs: 2500 },
    { text: "Energized.", durationMs: 3000 },
  ],
  "on-battery": [
    { text: "Running low…", durationMs: 3500 },
    { text: "Save my battery!", durationMs: 3000 },
    { text: "Dimming down.", durationMs: 3500 },
  ],
  "activity-burst": [
    { text: "It's Hurting!", durationMs: 3500 },
    { text: "Slow down!", durationMs: 3000 },
    { text: "Type, type, type…", durationMs: 3000 },
    { text: "Too fast!", durationMs: 3000 },
    { text: "Easy there!", durationMs: 3000 },
  ],
  "idle-long": [
    { text: "Anyone home?", durationMs: 4000 },
    { text: "Hello?", durationMs: 3500 },
    { text: "Still there?", durationMs: 3500 },
    { text: "Psst…", durationMs: 3000 },
  ],
  "app-shutdown": [
    { text: "Dead.", durationMs: 5000 },
    { text: "Bye bye…", durationMs: 4500 },
    { text: "Gone.", durationMs: 4000 },
  ],
  "time-morning": [
    { text: "Good morning!", durationMs: 4000 },
    { text: "Rise and shine.", durationMs: 4000 },
    { text: "Early bird!", durationMs: 3500 },
  ],
  "time-lunch": [
    { text: "Lunch time!", durationMs: 3500 },
    { text: "Hungry?", durationMs: 3000 },
    { text: "Snack break?", durationMs: 3000 },
  ],
  "time-evening": [
    { text: "Evening already?", durationMs: 3500 },
    { text: "Winding down…", durationMs: 4000 },
    { text: "Almost bedtime.", durationMs: 4000 },
  ],
  "time-night": [
    { text: "Up late?", durationMs: 3500 },
    { text: "The night is young.", durationMs: 4000 },
    { text: "Moonlight mode.", durationMs: 4000 },
  ],
  "clipboard-copy": [
    { text: "Copied!", durationMs: 2500 },
    { text: "Nice copy!", durationMs: 2500 },
    { text: "Got it.", durationMs: 2500 },
  ],
  "screenshot": [
    { text: "Screenshot!", durationMs: 3000 },
    { text: "Capture!", durationMs: 2500 },
    { text: "Preserved.", durationMs: 3000 },
  ],
  "pet": [
    { text: "Pffft!", durationMs: 2500 },
    { text: "Hehe!", durationMs: 2500 },
    { text: "Nice!", durationMs: 2500 },
    { text: "More!", durationMs: 2500 },
    { text: "Hehe~", durationMs: 3000 },
  ],
  "mischief-random": [
    { text: "Hehe.", durationMs: 3000 },
    { text: "Sneaky.", durationMs: 3000 },
    { text: "Oops.", durationMs: 2500 },
    { text: "Hehe~", durationMs: 3000 },
    { text: "Nudge nudge.", durationMs: 3000 },
    { text: "Wink.", durationMs: 2500 },
  ],
  // ISS-006: each developer trigger has unique, contextually accurate messages
  "ide-save": [
    { text: "Saved! 💾", durationMs: 2500 },
    { text: "All changes saved.", durationMs: 2500 },
    { text: "Safe and sound 💾", durationMs: 2500 },
  ],
  "git-commit": [
    { text: "Git commit ready! 🚀", durationMs: 3000 },
    { text: "Committed!", durationMs: 2500 },
    { text: "History recorded 📝", durationMs: 3000 },
  ],
  "build-green": [
    { text: "Build green! ✅", durationMs: 2500 },
    { text: "Tests passing!", durationMs: 2500 },
    { text: "Ship it! 🚀", durationMs: 3000 },
  ],
  "hydrate": [
    { text: "Time to drink water! 💧", durationMs: 3500 },
    { text: "Drink some water! 💧", durationMs: 3500 },
    { text: "Stay hydrated! 🥤", durationMs: 3000 },
  ],
  "posture-check": [
    { text: "Stretch those shoulders! 🤸", durationMs: 3500 },
    { text: "Posture check! 🤸", durationMs: 3500 },
    { text: "Sit up straight!", durationMs: 3000 },
  ],
  "combo-streak": [
    { text: "Combo x2! 🎉", durationMs: 2500 },
    { text: "Combo x3! 🎉", durationMs: 2500 },
    { text: "Super happy!", durationMs: 3000 },
    { text: "More pets!", durationMs: 2500 },
  ],
};

const WEIGHTS: Record<string, number[]> = {
  "power-suspend": [3, 2, 1],
  "power-resume": [3, 2, 1],
  "lock-screen": [3, 2, 1],
  "unlock-screen": [3, 2, 1],
  "on-ac": [3, 2, 1],
  "on-battery": [3, 2, 1],
  "activity-burst": [4, 2, 2, 1, 1],
  "idle-long": [3, 2, 1, 1],
  "app-shutdown": [3, 2, 1],
  "time-morning": [3, 2, 1],
  "time-lunch": [3, 2, 1],
  "time-evening": [3, 2, 1],
  "time-night": [3, 2, 1],
  "clipboard-copy": [3, 2, 1],
  "screenshot": [3, 2, 1],
  "pet": [4, 3, 2, 1, 1],
  "mischief-random": [3, 2, 1, 1, 1, 1],
  "ide-save": [3, 2, 1],
  "git-commit": [3, 2, 1],
  "build-green": [3, 2, 1],
  "hydrate": [3, 2, 1],
  "posture-check": [3, 2, 1],
  "combo-streak": [4, 3, 2, 1],
};

function pick<T>(pool: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function pickReaction(signal: Signal, character?: CharacterManifest | null): Reaction {
  const key = signal.kind;
  // ISS-012: combo-streak uses the actual comboCount to build dynamic text
  if (key === "combo-streak" && "comboCount" in signal) {
    const count = (signal as { kind: "combo-streak"; comboCount: number }).comboCount;
    const text = count >= 10 ? `Combo x${count}! 🔥` : count >= 5 ? `Combo x${count}! 🎉` : `Combo x${count}! 🎉`;
    return { text, durationMs: 2500 };
  }
  const charPool = character?.speech?.[key];
  if (charPool && charPool.length > 0) {
    return { text: pickRandom(charPool), durationMs: defaultDuration(charPool) };
  }
  const pool = POOLS[key];
  const weights = WEIGHTS[key];
  if (!pool || pool.length === 0) return { text: "", durationMs: 0 };
  return pick(pool, weights);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function defaultDuration(pool: string[]): number {
  return pool.length > 0 ? 3000 : 0;
}

export function isPowerSignal(signal: Signal): boolean {
  return signal.kind.startsWith("power-");
}

export function isScreenSignal(signal: Signal): boolean {
  return signal.kind === "lock-screen" || signal.kind === "unlock-screen";
}

export function isActivitySignal(signal: Signal): boolean {
  return signal.kind === "activity-burst" || signal.kind === "idle-long";
}

export function isMischiefSignal(signal: Signal): boolean {
  return signal.kind === "mischief-random" || signal.kind === "pet";
}
