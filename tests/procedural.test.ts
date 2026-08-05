import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPANION_META,
  MOTION_STATES,
  motionFor,
  sanitizeCompanionMeta,
  type CompanionMeta,
} from "../src/domain/procedural";

const META: CompanionMeta = { cutout: true, face: { x: 0.5, y: 0.3 } };

describe("sanitizeCompanionMeta", () => {
  it("returns defaults for garbage input", () => {
    expect(sanitizeCompanionMeta(null)).toEqual(DEFAULT_COMPANION_META);
    expect(sanitizeCompanionMeta("nope")).toEqual(DEFAULT_COMPANION_META);
    expect(sanitizeCompanionMeta(undefined)).toEqual(DEFAULT_COMPANION_META);
  });

  it("passes through valid fields and clamps the face anchor", () => {
    const meta = sanitizeCompanionMeta({ cutout: true, face: { x: 1.7, y: -0.4 } });
    expect(meta.cutout).toBe(true);
    expect(meta.face).toEqual({ x: 1, y: 0 });
  });

  it("fills missing face with defaults", () => {
    expect(sanitizeCompanionMeta({ cutout: true }).face).toEqual({ x: 0.5, y: 0.3 });
    expect(sanitizeCompanionMeta({ cutout: false }).face).toBeNull();
  });
});

describe("motionFor", () => {
  it("returns finite motion for every state", () => {
    for (const state of MOTION_STATES) {
      for (const t of [0, 0.1, 1.7, 10.9]) {
        const frame = motionFor(state, t, META);
        for (const key of ["dx", "dy", "rotate", "scaleX", "scaleY", "opacity"] as const) {
          const value = frame.motion[key];
          expect(Number.isFinite(value), `${state}@${t} ${key}`).toBe(true);
          expect(value).toBeGreaterThan(-100);
          // rotate is a degree angle (spin performs full 360° turns).
          expect(value).toBeLessThan(key === "rotate" ? 361 : 100);
        }
      }
    }
  });

  it("is deterministic for identical inputs", () => {
    for (const state of MOTION_STATES) {
      expect(motionFor(state, 1.23, META)).toEqual(motionFor(state, 1.23, META));
    }
  });

  it("emits expected effect cues per state", () => {
    expect(motionFor("happy", 0.1, META).effects.some((e) => e.kind === "hearts")).toBe(true);
    expect(motionFor("pet", 0.1, META).effects.some((e) => e.kind === "hearts")).toBe(true);
    expect(motionFor("sleep", 0.1, META).effects.some((e) => e.kind === "zzz")).toBe(true);
    expect(motionFor("sad", 0.1, META).effects.some((e) => e.kind === "tears")).toBe(true);
    expect(motionFor("yawn", 0.1, META).effects.some((e) => e.kind === "mouth")).toBe(false);
    expect(motionFor("yawn", 0.5, META).effects.some((e) => e.kind === "mouth")).toBe(true);
    expect(motionFor("idle", 0.01, META).effects.some((e) => e.kind === "blink")).toBe(true);
  });

  it("produces livelier motion for run than walk", () => {
    const walk = motionFor("walk", 0.25, META).motion;
    const run = motionFor("run", 0.25, META).motion;
    expect(Math.abs(run.rotate)).toBeGreaterThan(Math.abs(walk.rotate));
    expect(Math.abs(run.dy)).toBeGreaterThan(Math.abs(walk.dy));
  });

  it("keeps scale positive (no flipping)", () => {
    for (const state of MOTION_STATES) {
      for (const t of [0.05, 0.3, 0.6, 0.95]) {
        const { scaleX, scaleY } = motionFor(state, t, META).motion;
        expect(scaleX, `${state}@${t}`).toBeGreaterThan(0);
        expect(scaleY, `${state}@${t}`).toBeGreaterThan(0);
      }
    }
  });

  it("works without companion metadata (non-cutout fallback)", () => {
    const frame = motionFor("idle", 0.5, DEFAULT_COMPANION_META);
    expect(Number.isFinite(frame.motion.dy)).toBe(true);
  });

  it("spin rotates through a full turn", () => {
    expect(motionFor("spin", 0, META).motion.rotate).toBe(0);
    expect(motionFor("spin", 0.5, META).motion.rotate).toBeGreaterThan(100);
  });

  it("pounce lunges forward and returns", () => {
    const start = motionFor("pounce", 0, META).motion;
    expect(Math.abs(start.dx)).toBeLessThan(1);
    const mid = motionFor("pounce", 0.3, META).motion;
    expect(mid.dx).toBeGreaterThan(2);
    // End of the lunge cycle settles back to near-zero displacement.
    const end = motionFor("pounce", 1.05, META).motion;
    expect(Math.abs(end.dx)).toBeLessThan(2);
  });

  it("hide crouches low and drops opacity", () => {
    const frame = motionFor("hide", 0.2, META);
    expect(frame.motion.scaleY).toBeLessThan(0.7);
    expect(frame.motion.opacity).toBeLessThan(0.9);
  });

  it("sneak keeps a low crouched profile", () => {
    for (const t of [0.1, 0.4, 0.7, 1.0]) {
      const { scaleY, dy } = motionFor("sneak", t, META).motion;
      expect(scaleY).toBeLessThan(1);
      expect(dy).toBeGreaterThan(0);
    }
  });

  it("dance bounces vertically with side-to-side sway", () => {
    const a = motionFor("dance", 0.05, META).motion;
    const b = motionFor("dance", 0.4, META).motion;
    expect(a.dy).toBeLessThan(0);
    expect(Math.sign(a.dx)).not.toBe(Math.sign(b.dx));
  });

  it("peek rises above its resting height", () => {
    const frame = motionFor("peek", 0.25, META).motion;
    expect(frame.dy).toBeLessThan(0);
  });
});
