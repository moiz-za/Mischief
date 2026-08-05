// Renders demo GIFs of a companion using the app's real procedural motion
// engine (src/domain/procedural.ts) and GIF encoder (src/domain/gif.ts).
//
// Main-process safe: rasterizes the SVG via Electron nativeImage, then applies
// the same translate/rotate/scale used by the overlay in pure JS (bilinear).
//
//   node_modules/.bin/electron scripts/make-demo-gifs.js
const { app, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "assets", "demos");
const SPRITE = path.join(
  __dirname,
  "..",
  "examples",
  "experiences",
  "cat-companion",
  "images",
  "whiskers.svg"
);
const FRAME_W = 192;
const FRAME_H = 192;

// Bilinear sample of an RGBA image (u,v in 0..1, y-down from top-left).
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

// Renders a frame given a motion {dx,dy,rotate,scaleX,scaleY,opacity}.
function renderFrame(src, motion) {
  const W = FRAME_W;
  const H = FRAME_H;
  const pivotY = motionState === "spin" ? H * 0.5 : H * 0.92;
  const px = W / 2 + motion.dx;
  const py = pivotY + motion.dy;
  const rad = (motion.rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const scale = Math.min(W / src.width, H / src.height) * 0.9;
  const sw = src.width * scale * motion.scaleX;
  const sh = src.height * scale * motion.scaleY;

  const out = new Uint8Array(W * H * 4);
  const pxRGBA = [0, 0, 0, 0];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Inverse transform: output pixel -> source pixel.
      const dx = x - px;
      const dy = y - py;
      const rx = dx * cos + dy * sin;
      const ry = -dx * sin + dy * cos;
      const u = (rx + sw / 2) / sw;
      const v = (ry + sh / 2) / sh;
      const o = (y * W + x) * 4;
      if (u < 0 || u > 1 || v < 0 || v > 1) {
        out[o + 3] = 0;
        continue;
      }
      sample(src, u, v, pxRGBA);
      out[o] = pxRGBA[0];
      out[o + 1] = pxRGBA[1];
      out[o + 2] = pxRGBA[2];
      out[o + 3] = pxRGBA[3] * motion.opacity;
    }
  }
  return out;
}

const { motionFor } = require("../dist/domain/procedural.js");

let src = null;
let motionState = "idle";

const META = { face: null, anchor: { x: 0.5, y: 0.9 } };

function renderGif(state, seconds, delayCs, outFile) {
  motionState = state;
  const { encodeGif } = require("../dist/domain/gif.js");
  const frames = [];
  const fps = 20;
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    const frame = motionFor(state, t, META);
    frames.push({ bgra: renderFrame(src, frame.motion) });
  }
  const gif = encodeGif(frames, {
    width: FRAME_W,
    height: FRAME_H,
    delayCs,
    loop: 0,
    unpremultiply: false,
  });
  fs.writeFileSync(outFile, gif);
  console.log("wrote", outFile, `(${frames.length} frames)`);
}

app.whenReady().then(() => {
  try {
    console.log("[demo] ready, rasterizing sprite...");
    // nativeImage can't decode SVG directly; rasterize to PNG first via sips.
    const rasterPath = path.join(OUT_DIR, "_sprite.png");
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const { execFileSync } = require("child_process");
    execFileSync(
      "sips",
      ["-s", "format", "png", "--resampleWidth", String(FRAME_W), SPRITE, "--out", rasterPath],
      {
        stdio: "ignore",
      }
    );
    const img = nativeImage.createFromPath(rasterPath);
    if (img.isEmpty()) throw new Error("failed to rasterize sprite");
    const size = img.getSize();
    console.log("[demo] sprite size:", size);
    const raw = img.toBitmap(); // BGRA
    const rgba = new Uint8Array(size.width * size.height * 4);
    for (let i = 0, j = 0; i < raw.length; i += 4, j += 4) {
      rgba[j] = raw[i + 2]; // R
      rgba[j + 1] = raw[i + 1]; // G
      rgba[j + 2] = raw[i]; // B
      rgba[j + 3] = raw[i + 3]; // A
    }
    src = { width: size.width, height: size.height, data: rgba };
    renderGif("idle", 2.4, 9, path.join(OUT_DIR, "whiskers-idle.gif"));
    renderGif("spin", 2.4, 9, path.join(OUT_DIR, "whiskers-spin.gif"));
    renderGif("dance", 2.4, 9, path.join(OUT_DIR, "whiskers-dance.gif"));
    renderGif("hide", 2.4, 9, path.join(OUT_DIR, "whiskers-hide.gif"));
    console.log("[demo] done");
  } catch (err) {
    console.error("[demo] ERROR:", err);
  }
  app.exit(0);
});
