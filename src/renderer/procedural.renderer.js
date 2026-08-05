// Browser port of src/domain/procedural.ts for the overlay renderer.
//
// The overlay is sandboxed with no require(), so the procedural motion math is
// exposed here as window.MischiefProcedural. Keep this file in sync with
// src/domain/procedural.ts, which is the tested source of truth.
(function () {
  "use strict";

  var TAU = Math.PI * 2;

  function clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }

  function periodic(t, hz, phase) {
    return Math.sin(TAU * hz * t + (phase || 0));
  }

  function cycle(t, seconds) {
    return (((t % seconds) + seconds) % seconds) / seconds;
  }

  function sanitizeCompanionMeta(input) {
    if (typeof input !== "object" || input === null) {
      return { cutout: false, face: null };
    }
    var cutout = input.cutout === true;
    var face = null;
    var faceRaw = input.face;
    if (typeof faceRaw === "object" && faceRaw !== null) {
      face = {
        x: typeof faceRaw.x === "number" ? clamp01(faceRaw.x) : 0.5,
        y: typeof faceRaw.y === "number" ? clamp01(faceRaw.y) : 0.3,
      };
    } else if (cutout) {
      face = { x: 0.5, y: 0.3 };
    }
    return { cutout: cutout, face: face };
  }

  function pushHearts(effects, t) {
    var p = cycle(t, 1.2);
    var side = p < 0.5 ? -0.14 : 0.14;
    effects.push({ kind: "hearts", ox: side, oy: -0.3 * p, phase: p });
  }

  function pushZzz(effects, t) {
    var p = cycle(t, 1.3);
    effects.push({ kind: "zzz", ox: 0.24 + 0.06 * p, oy: -0.32 - 0.08 * p, phase: p });
  }

  function pushTears(effects, t) {
    var p = cycle(t, 1.5);
    effects.push({ kind: "tears", ox: -0.07, oy: 0.03 + 0.16 * p, phase: p });
    effects.push({ kind: "tears", ox: 0.07, oy: 0.03 + 0.16 * p, phase: p });
  }

  function motionFor(state, t, meta) {
    void meta;
    var effects = [];
    var motion;

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
        var rot = (t % 1) * 360;
        motion = {
          dx: 0,
          dy: 0,
          rotate: rot,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
        };
        break;
      }
      case "pounce": {
        var p = cycle(t, 1.1);
        var lunge = Math.sin(Math.PI * p);
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
      case "sneak":
        motion = {
          dx: periodic(t, 0.8) * 3,
          dy: Math.abs(periodic(t, 0.8)) * -2 + 3,
          rotate: periodic(t, 0.8) * 4,
          scaleX: 1.04,
          scaleY: 0.92 + periodic(t, 0.8) * 0.02,
          opacity: 1,
        };
        break;
      case "dance": {
        var dP = cycle(t, 0.7);
        var dRebound = Math.sin(Math.PI * dP);
        motion = {
          dx: (dP < 0.5 ? -1 : 1) * 6,
          dy: -Math.abs(dRebound) * 12,
          rotate: (dP < 0.5 ? -1 : 1) * 10,
          scaleX: 1 + dRebound * 0.05,
          scaleY: 1 - dRebound * 0.1,
          opacity: 1,
        };
        break;
      }
      case "hide":
        motion = {
          dx: 0,
          dy: 6 + Math.abs(periodic(t, 0.5)) * 2,
          rotate: 0,
          scaleX: 1.1,
          scaleY: 0.45 + Math.abs(periodic(t, 0.5)) * 0.08,
          opacity: 0.6,
        };
        break;
      case "peek":
        motion = {
          dx: periodic(t, 1.1) * 3,
          dy: -Math.abs(Math.sin(TAU * 0.5 * t)) * 12,
          rotate: periodic(t, 1.1) * 6,
          scaleX: 1 + Math.abs(Math.sin(TAU * 0.5 * t)) * 0.04,
          scaleY: 1 - Math.abs(Math.sin(TAU * 0.5 * t)) * 0.06,
          opacity: 0.95,
        };
        break;
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
        var p = cycle(t, 1.4);
        var stretch = Math.sin(Math.PI * Math.min(1, p / 0.7)) * 0.08;
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
      var blink = cycle(t, 4);
      if (blink < 0.16) effects.push({ kind: "blink", ox: 0, oy: -0.03, phase: blink / 0.16 });
    }

    return { motion: motion, effects: effects };
  }

  window.MischiefProcedural = {
    motionFor: motionFor,
    sanitizeCompanionMeta: sanitizeCompanionMeta,
    MOTION_STATES: [
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
    ],
  };
})();
