import type { CharacterManifest } from "./manifest";

export interface Reaction {
  text: string;
  durationMs: number;
}

export type BehaviorName =
  "sleep" | "wander" | "hide" | "peek" | "spin" | "pounce" | "sneak" | "dance";

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
  | { kind: "combo-streak"; comboCount: number }
  | { kind: "deep-focus" }
  | { kind: "weekend" }
  // The behavior engine tells the bubble layer which animation is running so
  // the companion can comment on its own playful deeds (ISS-036).
  | { kind: "behavior"; behavior: BehaviorName };

export const POOLS: Record<string, Reaction[]> = {
  "power-suspend": [
    { text: "Zzz…", durationMs: 3000 },
    { text: "Nap time…", durationMs: 3000 },
    { text: "Sleeping…", durationMs: 3000 },
    { text: "Powering down…", durationMs: 3000 },
    { text: "Night night…", durationMs: 3000 },
    { text: "Dream mode on.", durationMs: 3000 },
    { text: "See you at boot.", durationMs: 3000 },
    { text: "Shutting my eyes.", durationMs: 3000 },
  ],
  "power-resume": [
    { text: "I'm back!", durationMs: 3000 },
    { text: "Wake up!", durationMs: 3000 },
    { text: "Alive again.", durationMs: 3000 },
    { text: "Reboot complete.", durationMs: 3000 },
    { text: "Ready!", durationMs: 3000 },
    { text: "Good to be awake.", durationMs: 3000 },
    { text: "Booted up.", durationMs: 3000 },
    { text: "Back online!", durationMs: 3000 },
  ],
  "lock-screen": [
    { text: "Who locked me in?", durationMs: 3000 },
    { text: "Let me out!", durationMs: 3000 },
    { text: "Hello? Anyone?", durationMs: 3000 },
    { text: "Hello??", durationMs: 3000 },
    { text: "Trapped again…", durationMs: 3000 },
    { text: "Knock knock? Anyone?", durationMs: 3000 },
  ],
  "unlock-screen": [
    { text: "Hi again!", durationMs: 3000 },
    { text: "Welcome back.", durationMs: 3000 },
    { text: "Good to see you.", durationMs: 3000 },
    { text: "Freed!", durationMs: 3000 },
    { text: "There you are!", durationMs: 3000 },
    { text: "Sunlight!", durationMs: 3000 },
    { text: "You're back!", durationMs: 3000 },
  ],
  "on-ac": [
    { text: "Charging me up!", durationMs: 3000 },
    { text: "Full power!", durationMs: 3000 },
    { text: "Energized.", durationMs: 3000 },
    { text: "Juice flowing!", durationMs: 3000 },
    { text: "Plugged in!", durationMs: 3000 },
    { text: "Power surge!", durationMs: 3000 },
  ],
  "on-battery": [
    { text: "Running low…", durationMs: 3000 },
    { text: "Save my battery!", durationMs: 3000 },
    { text: "Dimming down.", durationMs: 3000 },
    { text: "Hmm, power low.", durationMs: 3000 },
    { text: "On the last bar.", durationMs: 3000 },
    { text: "Battery mode.", durationMs: 3000 },
  ],
  "activity-burst": [
    { text: "It's Hurting!", durationMs: 3000 },
    { text: "Slow down!", durationMs: 3000 },
    { text: "Type, type, type…", durationMs: 3000 },
    { text: "Too fast!", durationMs: 3000 },
    { text: "Easy there!", durationMs: 3000 },
    { text: "Keyboard go brrr", durationMs: 3000 },
    { text: "Whew, dizzy!", durationMs: 3000 },
    { text: "Your fingers are on fire!", durationMs: 3000 },
    { text: "Whoa, grinding!", durationMs: 3000 },
    { text: "So much motion!", durationMs: 3000 },
  ],
  "idle-long": [
    { text: "Anyone home?", durationMs: 3000 },
    { text: "Hello?", durationMs: 3000 },
    { text: "Still there?", durationMs: 3000 },
    { text: "Psst…", durationMs: 3000 },
    { text: "Am I a ghost now?", durationMs: 3000 },
    { text: "I'm bored. Extremely.", durationMs: 3000 },
    { text: "Hello..?", durationMs: 3000 },
    { text: "Are you alive out there?", durationMs: 3000 },
    { text: "I'm counting ceiling pixels.", durationMs: 3000 },
    { text: "Wakey wakey.", durationMs: 3000 },
  ],
  "app-shutdown": [
    { text: "Dead.", durationMs: 3000 },
    { text: "Bye bye…", durationMs: 3000 },
    { text: "Gone.", durationMs: 3000 },
    { text: "See you later.", durationMs: 3000 },
    { text: "Off to the void.", durationMs: 3000 },
  ],
  "time-morning": [
    { text: "Good morning!", durationMs: 3000 },
    { text: "Rise and shine.", durationMs: 3000 },
    { text: "Early bird!", durationMs: 3000 },
    { text: "New day!", durationMs: 3000 },
    { text: "Bright and early!", durationMs: 3000 },
    { text: "Coffee time?", durationMs: 3000 },
  ],
  "time-lunch": [
    { text: "Lunch time!", durationMs: 3000 },
    { text: "Hungry?", durationMs: 3000 },
    { text: "Snack break?", durationMs: 3000 },
    { text: "Food time?", durationMs: 3000 },
    { text: "Yum yum time.", durationMs: 3000 },
  ],
  "time-evening": [
    { text: "Evening already?", durationMs: 3000 },
    { text: "Winding down…", durationMs: 3000 },
    { text: "Almost bedtime.", durationMs: 3000 },
    { text: "Cozy hours.", durationMs: 3000 },
    { text: "The day flew by.", durationMs: 3000 },
  ],
  "time-night": [
    { text: "Up late?", durationMs: 3000 },
    { text: "The night is young.", durationMs: 3000 },
    { text: "Moonlight mode.", durationMs: 3000 },
    { text: "Burning the midnight oil.", durationMs: 3000 },
    { text: "Night owl!", durationMs: 3000 },
    { text: "Stars are out.", durationMs: 3000 },
  ],
  "clipboard-copy": [
    { text: "Copied!", durationMs: 3000 },
    { text: "Nice copy!", durationMs: 3000 },
    { text: "Got it.", durationMs: 3000 },
    { text: "Sneaky paste incoming…", durationMs: 3000 },
    { text: "My memory is gold.", durationMs: 3000 },
    { text: "You've got some skills.", durationMs: 3000 },
    { text: "Clipboard secured.", durationMs: 3000 },
  ],
  screenshot: [
    { text: "Screenshot!", durationMs: 3000 },
    { text: "Capture!", durationMs: 3000 },
    { text: "Preserved.", durationMs: 3000 },
    { text: "Say cheese!", durationMs: 3000 },
    { text: "Smile!", durationMs: 3000 },
    { text: "Hold still!", durationMs: 3000 },
    { text: "Picture time!", durationMs: 3000 },
  ],
  pet: [
    { text: "Pffft!", durationMs: 3000 },
    { text: "Hehe!", durationMs: 3000 },
    { text: "Nice!", durationMs: 3000 },
    { text: "More!", durationMs: 3000 },
    { text: "Hehe~", durationMs: 3000 },
    { text: "You found my spot!", durationMs: 3000 },
    { text: "Again again!", durationMs: 3000 },
    { text: "That's the spot!", durationMs: 3000 },
    { text: "Mmm!", durationMs: 3000 },
    { text: "Another one!", durationMs: 3000 },
  ],
  "mischief-random": [
    { text: "Hehe.", durationMs: 3000 },
    { text: "Sneaky.", durationMs: 3000 },
    { text: "Oops.", durationMs: 3000 },
    { text: "Hehe~", durationMs: 3000 },
    { text: "Nudge nudge.", durationMs: 3000 },
    { text: "Wink.", durationMs: 3000 },
    { text: "I hid your cursor.", durationMs: 3000 },
    { text: "Did you see that? No?", durationMs: 3000 },
    { text: "I touched the power button… jk!", durationMs: 3000 },
    { text: "Your tabs are fine. Probably.", durationMs: 3000 },
    { text: "Whoopsie!", durationMs: 3000 },
    { text: "Nothing to see here.", durationMs: 3000 },
  ],
  "ide-save": [
    { text: "Saved! 💾", durationMs: 3000 },
    { text: "All changes saved.", durationMs: 3000 },
    { text: "Safe and sound 💾", durationMs: 3000 },
    { text: "Your work is safe. For now.", durationMs: 3000 },
    { text: "Committed to disk.", durationMs: 3000 },
    { text: "File locked in.", durationMs: 3000 },
    { text: "Snap! Saved.", durationMs: 3000 },
  ],
  "git-commit": [
    { text: "Git commit ready! 🚀", durationMs: 3000 },
    { text: "Committed!", durationMs: 3000 },
    { text: "History recorded 📝", durationMs: 3000 },
    { text: "Another commit saved my soul.", durationMs: 3000 },
    { text: "Git me! Committed.", durationMs: 3000 },
    { text: "Version bumped.", durationMs: 3000 },
  ],
  "build-green": [
    { text: "Build green! ✅", durationMs: 3000 },
    { text: "Tests passing!", durationMs: 3000 },
    { text: "Ship it! 🚀", durationMs: 3000 },
    { text: "No red squiggles today.", durationMs: 3000 },
    { text: "Green machine!", durationMs: 3000 },
    { text: "All systems go!", durationMs: 3000 },
    { text: "Pipeline clean.", durationMs: 3000 },
  ],
  hydrate: [
    { text: "Time to drink water! 💧", durationMs: 3000 },
    { text: "Drink some water! 💧", durationMs: 3000 },
    { text: "Stay hydrated! 🥤", durationMs: 3000 },
    { text: "Sip, sip, hydrate!", durationMs: 3000 },
    { text: "Water break!", durationMs: 3000 },
    { text: "Hydration station!", durationMs: 3000 },
  ],
  "posture-check": [
    { text: "Stretch those shoulders! 🤸", durationMs: 3000 },
    { text: "Posture check! 🤸", durationMs: 3000 },
    { text: "Sit up straight!", durationMs: 3000 },
    { text: "Give your back a break.", durationMs: 3000 },
    { text: "Shoulders down. Chin up!", durationMs: 3000 },
  ],
  "combo-streak": [
    { text: "Combo x2! 🎉", durationMs: 3000 },
    { text: "Combo x3! 🎉", durationMs: 3000 },
    { text: "Super happy!", durationMs: 3000 },
    { text: "More pets!", durationMs: 3000 },
    { text: "On a roll!", durationMs: 3000 },
    { text: "You're spoiling me!", durationMs: 3000 },
  ],
  "deep-focus": [
    { text: "You're in the zone! Keep it up!", durationMs: 3000 },
    { text: "Deep focus detected. Impressive!", durationMs: 3000 },
    { text: "Look at you, locked in!", durationMs: 3000 },
    { text: "The zone is your home.", durationMs: 3000 },
    { text: "So focused!", durationMs: 3000 },
    { text: "Flow state engaged!", durationMs: 3000 },
  ],
  weekend: [
    { text: "Weekend! Time to relax!", durationMs: 3000 },
    { text: "Happy weekend!", durationMs: 3000 },
    { text: "No rush today!", durationMs: 3000 },
    { text: "Weekend vibes!", durationMs: 3000 },
    { text: "Time off at last!", durationMs: 3000 },
    { text: "Enjoy the weekend!", durationMs: 3000 },
  ],
  "behavior:sleep": [
    { text: "Zzz…", durationMs: 3000 },
    { text: "Nighty night.", durationMs: 3000 },
    { text: "Dreaming of you.", durationMs: 3000 },
    { text: "Shhh… sleeping.", durationMs: 3000 },
  ],
  "behavior:wander": [
    { text: "Exploring!", durationMs: 3000 },
    { text: "Where should I go?", durationMs: 3000 },
    { text: "Wandering about.", durationMs: 3000 },
    { text: "Taking a stroll.", durationMs: 3000 },
  ],
  "behavior:hide": [
    { text: "Pssst, I'm hiding!", durationMs: 3000 },
    { text: "You can't see me!", durationMs: 3000 },
    { text: "Catch me if you can!", durationMs: 3000 },
    { text: "Shhh… gone!", durationMs: 3000 },
    { text: "Hiding spot! Hehe.", durationMs: 3000 },
  ],
  "behavior:peek": [
    { text: "Peek-a-boo!", durationMs: 3000 },
    { text: "I see you!", durationMs: 3000 },
    { text: "Boo!", durationMs: 3000 },
    { text: "Just peeking~", durationMs: 3000 },
  ],
  "behavior:spin": [
    { text: "Wheee!", durationMs: 3000 },
    { text: "Spinning!", durationMs: 3000 },
    { text: "Dizzy!", durationMs: 3000 },
    { text: "Round and round!", durationMs: 3000 },
    { text: "Twirl time!", durationMs: 3000 },
  ],
  "behavior:pounce": [
    { text: "Rawr! Pounce!", durationMs: 3000 },
    { text: "Gotcha!", durationMs: 3000 },
    { text: "Boing!", durationMs: 3000 },
    { text: "Pounce!", durationMs: 3000 },
    { text: "Leap!", durationMs: 3000 },
  ],
  "behavior:sneak": [
    { text: "Sneaking…", durationMs: 3000 },
    { text: "Stealth mode!", durationMs: 3000 },
    { text: "Quiet as a mouse.", durationMs: 3000 },
    { text: "Ninja sneaks!", durationMs: 3000 },
    { text: "Shhh, sneaky.", durationMs: 3000 },
  ],
  "behavior:dance": [
    { text: "Dance time!", durationMs: 3000 },
    { text: "Groove on!", durationMs: 3000 },
    { text: "Shake it!", durationMs: 3000 },
    { text: "Move to the beat!", durationMs: 3000 },
    { text: "Party time!", durationMs: 3000 },
  ],
};

// --- Anti-repeat picking ---------------------------------------------------
// Each pool keeps a recent-history of previously shown indexes so the same
// line (or the same few lines) doesn't pop up over and over. We only reuse a
// line once every other option in its pool has been shown, which makes the
// companion feel far less repetitive. (ISS-036)
const recents = new Map<string, number[]>();

const RECENT_LIMIT = 3;

function recordRecent(key: string, index: number): void {
  const list = recents.get(key) ?? [];
  list.push(index);
  if (list.length > RECENT_LIMIT) list.shift();
  recents.set(key, list);
}

function reset(): void {
  recents.clear();
}

// Returns candidate indexes weighted toward variety: prefers lines not shown
// in the recent window. Falls back to avoiding only the immediately previous
// line when the pool is tiny and everything was just shown, so the companion
// never says the exact same line twice in a row.
function pickVariantIndex(key: string, size: number, rng: () => number): number {
  if (size <= 1) return 0;
  const recent = recents.get(key) ?? [];
  const fresh: number[] = [];
  for (let i = 0; i < size; i++) if (!recent.includes(i)) fresh.push(i);
  if (fresh.length > 0) {
    return fresh[Math.floor(rng() * fresh.length)];
  }
  const last = recent[recent.length - 1];
  const candidates: number[] = [];
  for (let i = 0; i < size; i++) if (i !== last) candidates.push(i);
  if (candidates.length === 0) return last;
  return candidates[Math.floor(rng() * candidates.length)];
}

function pickReaction(signal: Signal, character?: CharacterManifest | null): Reaction {
  const key = signal.kind;
  // ISS-012: combo-streak uses the actual comboCount to build dynamic text
  if (key === "combo-streak" && "comboCount" in signal) {
    const count = (signal as { kind: "combo-streak"; comboCount: number }).comboCount;
    const text = count >= 10 ? `Combo x${count}! 🔥` : `Combo x${count}! 🎉`;
    return { text, durationMs: 2500 };
  }

  // Behavior-aware signals resolve to their dedicated pool (generic or,
  // when provided, a character-specific override).
  let poolKey: string = key;
  if (key === "behavior" && "behavior" in signal) {
    poolKey = `behavior:${(signal as { behavior: string }).behavior}`;
  }

  const charSpeech = character?.speech?.[poolKey];
  if (charSpeech && charSpeech.length > 0) {
    const idx = pickVariantIndex(
      `char:${character.id}:${poolKey}`,
      (charSpeech as string[]).length,
      Math.random
    );
    recordRecent(`char:${character.id}:${poolKey}`, idx);
    return { text: (charSpeech as string[])[idx], durationMs: 3000 };
  }

  const pool = POOLS[poolKey];
  if (!pool || pool.length === 0) return { text: "", durationMs: 0 };
  const idx = pickVariantIndex(poolKey, pool.length, Math.random);
  recordRecent(poolKey, idx);
  const r = pool[idx];
  return { text: r.text, durationMs: r.durationMs };
}

export { pickReaction, reset };

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
