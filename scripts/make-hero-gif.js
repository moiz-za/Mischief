// Renders a wide hero GIF for the README: several companions side-by-side,
// each running a playful procedural motion (dance/spin/hide/pounce), using the
// app's real motion engine + GIF encoder.
//
//   node_modules/.bin/electron scripts/make-hero-gif.js
const { app, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT = path.join(__dirname, "..", "assets", "demos", "hero.gif");
const OUT_DIR = path.dirname(OUT);

// character: (relative svg path, motion state)
const SLOTS = [
  ["examples/experiences/ghost-companion/images/spectra.svg", "dance"],
  ["examples/experiences/cat-companion/images/whiskers.svg", "spin"],
  ["examples/experiences/robot-companion/images/sparky.svg", "pounce"],
  ["examples/experiences/zen-companion/images/zen.svg", "hide"],
];

const CELL_W = 160;
const CELL_H = 160;
const PAD = 12;
const W = SLOTS.length * CELL_W;
const H = CELL_H + PAD * 2;

const { motionFor } = require("../dist/domain/procedural.js");
const { encodeGif } = require("../dist/domain/gif.js");

function rasterize(svgPath) {
  const png = path.join(OUT_DIR, "_cell.png");
  execFileSync("sips", ["-s", "format", "png", "--resampleWidth", "160", svgPath, "--out", png], {
    stdio: "ignore",
  });
  const img = nativeImage.createFromPath(png);
  const size = img.getSize();
  const raw = img.toBitmap();
  const rgba = new Uint8Array(size.width * size.height * 4);
  for (let i = 0, j = 0; i < raw.length; i += 4, j += 4) {
    rgba[j] = raw[i + 2];
    rgba[j + 1] = raw[i + 1];
    rgba[j + 2] = raw[i];
    rgba[j + 3] = raw[i + 3];
  }
  return { width: size.width, height: size.height, data: rgba };
}

function sample(img, u, v, out) {
  const w = img.width;
  const h = img.height;
  const x = u * (w - 1);
  const y = v * (h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const fx = x - x0;
  const fy = y - y0;
  const at = (xx, yy) => {
    const i = (yy * w + xx) * 4;
    return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
  };
  const [r0, g0, b0, a0] = at(x0, y0);
  const [r1, g1, b1, a1] = at(x1, y0);
  const [r2, g2, b2, a2] = at(x0, y1);
  const [r3, g3, b3, a3] = at(x1, y1);
  const lerp = (a, b, c, d) => (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  out[0] = lerp(r0, r1, r2, r3);
  out[1] = lerp(g0, g1, g2, g3);
  out[2] = lerp(b0, b1, b2, b3);
  out[3] = lerp(a0, a1, a2, a3);
}

function drawCell(canvas, src, motion, offsetX) {
  const CW = CELL_W;
  const CH = CELL_H;
  const px = CW / 2 + motion.dx;
  const py = (motionState === "spin" ? CH * 0.5 : CH * 0.92) + motion.dy;
  const rad = (motion.rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const scale = Math.min(CW / src.width, CH / src.height) * 0.9;
  const sw = src.width * scale * motion.scaleX;
  const sh = src.height * scale * motion.scaleY;
  const tmp = [0, 0, 0, 0];
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      const dx = x - px;
      const dy = y - py;
      const rx = dx * cos + dy * sin;
      const ry = -dx * sin + dy * cos;
      const u = (rx + sw / 2) / sw;
      const v = (ry + sh / 2) / sh;
      const ox = offsetX + x;
      const o = (y * W + ox) * 4;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      sample(src, u, v, tmp);
      const a = (tmp[3] * motion.opacity) / 255;
      const base = canvas[o + 3] / 255;
      // alpha-over onto existing
      const outA = a + base * (1 - a);
      if (outA === 0) continue;
      canvas[o] = Math.round((tmp[0] * a + canvas[o] * base * (1 - a)) / outA);
      canvas[o + 1] = Math.round((tmp[1] * a + canvas[o + 1] * base * (1 - a)) / outA);
      canvas[o + 2] = Math.round((tmp[2] * a + canvas[o + 2] * base * (1 - a)) / outA);
      canvas[o + 3] = Math.round(outA * 255);
    }
  }
}

const META = { face: null, anchor: { x: 0.5, y: 0.9 } };

app.whenReady().then(() => {
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log("[hero] rasterizing sprites...");
    const srcs = SLOTS.map(([svg]) => rasterize(path.join(__dirname, "..", svg)));
    const states = SLOTS.map(([, s]) => s);
    const fps = 20;
    const seconds = 3.0;
    const n = Math.round(seconds * fps);
    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = i / fps;
      const canvas = new Uint8Array(W * H * 4);
      for (let c = 0; c < SLOTS.length; c++) {
        motionState = states[c];
        const motion = motionFor(states[c], t, META).motion;
        drawCell(canvas, srcs[c], motion, c * CELL_W + PAD / 2);
      }
      frames.push({ bgra: canvas });
    }
    const gif = encodeGif(frames, {
      width: W,
      height: H,
      delayCs: 9,
      loop: 0,
      unpremultiply: false,
    });
    fs.writeFileSync(OUT, gif);
    console.log("[hero] wrote", OUT, `(${n} frames, ${W}x${H})`);
  } catch (err) {
    console.error("[hero] ERROR:", err);
  }
  app.exit(0);
});

let motionState = "idle";
