/**
 * Procedural motion synthesis for user-imported companion images (Custom Image
 * Import Engine). Pure + testable: given a state, elapsed time, and the
 * companion's metadata, it returns the concrete transforms and effect cues the
 * overlay should draw. The overlay's animation loop is thin glue around this.
 *
 * Any single static image can only be moved as a whole body (no per-limb
 * rigging), so motion is bob/lean/squash/rotate plus anchored procedural
 * overlays (blink, mouth, Zzz, hearts, tears) placed at the user's anchor
 * point.
 */

export interface FaceAnchor {
  /** Normalized 0..1 position of the face/anchor center. */
  x: number;
  y: number;
}

export interface CompanionMeta {
  /** The sprite is a background-removed cutout (renders via the motion canvas). */
  cutout: boolean;
  /** Where expressions/effects anchor, for overlay effects. */
  face: FaceAnchor | null;
}

export type MotionState =
  | "idle"
  | "walk"
  | "run"
  | "happy"
  | "sad"
  | "sleep"
  | "yawn"
  | "pet"
  | "spin"
  | "pounce"
  | "sneak"
  | "dance"
  | "hide"
  | "peek";

export interface MotionFrame {
  dx: number;
  dy: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

export interface EffectCue {
  kind: "blink" | "mouth" | "zzz" | "hearts" | "tears";
  /** Normalized offsets from the face anchor (fraction of canvas). */
  ox: number;
  oy: number;
  /** 0..1 progress within the effect's own cycle. */
  phase: number;
}

export interface ProceduralFrame {
  motion: MotionFrame;
  effects: EffectCue[];
}

export const MOTION_STATES: MotionState[] = [
  "idle",
  "walk",
  "run",
  "happy",
  "sad",
  "sleep",
  "yawn",
  "pet",
  "spin",
  "pounce",
  "sneak",
  "dance",
  "hide",
  "peek",
];

export const DEFAULT_COMPANION_META: CompanionMeta = { cutout: false, face: null };

/** Parses/validates untrusted companion metadata (clamps, fills defaults). */
export function sanitizeCompanionMeta(input: unknown): CompanionMeta {
  if (typeof input !== "object" || input === null) return { ...DEFAULT_COMPANION_META };
  const raw = input as Record<string, unknown>;
  const cutout = raw.cutout === true;
  const faceRaw = raw.face;
  let face: FaceAnchor | null = null;
  if (typeof faceRaw === "object" && faceRaw !== null) {
    const f = faceRaw as Record<string, unknown>;
    const x = typeof f.x === "number" ? clamp01(f.x) : 0.5;
    const y = typeof f.y === "number" ? clamp01(f.y) : 0.3;
    face = { x, y };
  } else if (cutout) {
    // A cutout image needs an anchor for overlay effects; default to upper-center.
    face = { x: 0.5, y: 0.3 };
  }
  return { cutout, face };
}

const TAU = Math.PI * 2;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

function periodic(t: number, hz: number, phase = 0): number {
  return Math.sin(TAU * hz * t + phase);
}

function cycle(t: number, seconds: number): number {
  return (((t % seconds) + seconds) % seconds) / seconds;
}

/**
 * The motion + effects to render for `state` at time `t` (seconds, running
 * continuously). Deterministic for identical inputs.
 */
export function motionFor(state: MotionState, t: number, _meta: CompanionMeta): ProceduralFrame {
  const effects: EffectCue[] = [];
  let motion: MotionFrame;

  switch (state) {
    case "walk":
      motion = {
        dx: periodic(t, 1.2) * 1.5,
        dy: Math.abs(periodic(t, 1.2)) * -3,
        rotate: periodic(t, 1.2) * 3,
        scaleX: 1 + periodic(t, 1.2, Math.PI / 2) * 0.02,
        scaleY: 1 - periodic(t, 1.2, Math.PI / 2) * 0.02,
        opacity: 1,
      };
      break;
    case "run":
      motion = {
        dx: periodic(t, 2.4) * 2,
        dy: Math.abs(periodic(t, 2.4)) * -5,
        rotate: periodic(t, 2.4) * 6,
        scaleX: 1.06 + periodic(t, 2.4, Math.PI / 2) * 0.03,
        scaleY: 0.96 - periodic(t, 2.4, Math.PI / 2) * 0.03,
        opacity: 1,
      };
      break;
    case "happy":
      motion = {
        dx: 0,
        dy: Math.abs(periodic(t, 1.8)) * -8,
        rotate: periodic(t, 1.8) * 8,
        scaleX: 1.06,
        scaleY: 0.94,
        opacity: 1,
      };
      pushHearts(effects, t);
      break;
    case "pet":
      motion = {
        dx: periodic(t, 2.2) * 1,
        dy: Math.abs(periodic(t, 2.2)) * -10,
        rotate: periodic(t, 2.2) * 10,
        scaleX: 1.1,
        scaleY: 0.9,
        opacity: 1,
      };
      pushHearts(effects, t);
      break;
    case "spin": {
      // Full 360° rotations, two per second. Keep the sprite modestly scaled
      // and rotate about the canvas center (see `centerPivot` below) so the
      // corners never swing outside the overlay window and get clipped.
      const rot = (t % 1) * 360;
      motion = {
        dx: 0,
        dy: 0,
        rotate: rot,
        scaleX: 0.75,
        scaleY: 0.75,
        opacity: 1,
      };
      break;
    }
    case "pounce": {
      // Quick forward lunge with a springy recoil.
      const p = cycle(t, 1.1);
      const lunge = Math.sin(Math.PI * p);
      motion = {
        dx: lunge * 14,
        dy: -lunge * 10,
        rotate: lunge * 12,
        scaleX: 1 + lunge * 0.12,
        scaleY: 1 - lunge * 0.16,
        opacity: 1,
      };
      break;
    }
    case "sneak": {
      // Low, slow, wary creep.
      motion = {
        dx: periodic(t, 0.8) * 3,
        dy: Math.abs(periodic(t, 0.8)) * -2 + 3,
        rotate: periodic(t, 0.8) * 4,
        scaleX: 1.04,
        scaleY: 0.92 + periodic(t, 0.8) * 0.02,
        opacity: 1,
      };
      break;
    }
    case "dance": {
      // Bouncy side-to-side shimmy.
      const p = cycle(t, 0.7);
      const bounce = Math.sin(Math.PI * p);
      motion = {
        dx: (p < 0.5 ? -1 : 1) * 6,
        dy: -Math.abs(bounce) * 12,
        rotate: (p < 0.5 ? -1 : 1) * 10,
        scaleX: 1 + bounce * 0.05,
        scaleY: 1 - bounce * 0.1,
        opacity: 1,
      };
      break;
    }
    case "hide": {
      // Duck down behind the bottom edge (bold range: stays parked in a
      // corner). Slides the sprite down so it tucks out of sight instead of
      // squashing flat + fading.
      motion = {
        dx: 0,
        dy: 34 + Math.abs(periodic(t, 0.5)) * 3,
        rotate: 0,
        scaleX: 1,
        scaleY: 0.92,
        opacity: 0.95,
      };
      break;
    }
    case "peek": {
      // Pop up from hiding and glance side to side.
      const up = Math.abs(Math.sin(TAU * 0.5 * t));
      motion = {
        dx: periodic(t, 1.1) * 3,
        dy: -up * 12,
        rotate: periodic(t, 1.1) * 6,
        scaleX: 1 + up * 0.04,
        scaleY: 1 - up * 0.06,
        opacity: 0.95,
      };
      break;
    }
    case "sad":
      motion = {
        dx: 0,
        dy: 2 + Math.sin(TAU * 0.4 * t) * 1,
        rotate: -4,
        scaleX: 0.98,
        scaleY: 0.95,
        opacity: 0.88,
      };
      pushTears(effects, t);
      break;
    case "sleep":
      motion = {
        dx: 0,
        dy: 3,
        rotate: 0,
        scaleX: 0.96,
        scaleY: 0.96 - Math.abs(periodic(t, 0.3)) * 0.03,
        opacity: 0.95,
      };
      pushZzz(effects, t);
      break;
    case "yawn": {
      // One-shot stretch that repeats on its own loop.
      const p = cycle(t, 1.4);
      const stretch = Math.sin(Math.PI * Math.min(1, p / 0.7)) * 0.08;
      motion = {
        dx: 0,
        dy: stretch * 8,
        rotate: 0,
        scaleX: 1 + stretch * 0.6,
        scaleY: 1 - stretch * 0.8,
        opacity: 1,
      };
      if (p > 0.35 && p < 0.6) {
        effects.push({ kind: "mouth", ox: 0, oy: 0.12, phase: (p - 0.35) / 0.25 });
      }
      break;
    }
    case "idle":
    default:
      motion = {
        dx: 0,
        dy: periodic(t, 0.5) * 2,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
      };
      break;
  }

  if (state === "idle" || state === "walk") {
    // Blink roughly every 4s.
    const p = cycle(t, 4);
    if (p < 0.16) effects.push({ kind: "blink", ox: 0, oy: -0.03, phase: p / 0.16 });
  }

  return { motion, effects };
}

function pushHearts(effects: EffectCue[], t: number): void {
  const p = cycle(t, 1.2);
  const side = p < 0.5 ? -0.14 : 0.14;
  effects.push({ kind: "hearts", ox: side, oy: -0.3 * p, phase: p });
}

function pushZzz(effects: EffectCue[], t: number): void {
  const p = cycle(t, 1.3);
  effects.push({ kind: "zzz", ox: 0.24 + 0.06 * p, oy: -0.32 - 0.08 * p, phase: p });
}

function pushTears(effects: EffectCue[], t: number): void {
  const p = cycle(t, 1.5);
  effects.push({ kind: "tears", ox: -0.07, oy: 0.03 + 0.16 * p, phase: p });
  effects.push({ kind: "tears", ox: 0.07, oy: 0.03 + 0.16 * p, phase: p });
}
