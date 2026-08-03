import { GifWriter } from "omggif";

/**
 * Pure-JS GIF encoding for the "capture a moment" share loop.
 *
 * Input is raw BGRA pixel data (as returned by Electron's `nativeImage.toBitmap()`).
 * A palette is built from the unique colors across all frames (our sprites have
 * few colors, so this is near-lossless); if a frame exceeds 255 colors we fall
 * back to nearest-color mapping. Transparency is preserved as a palette slot.
 */

export interface RawFrame {
  /** BGRA pixels, width * height * 4. */
  bgra: Uint8Array;
}

export interface GifEncodeOptions {
  width: number;
  height: number;
  /** Frame delay in centiseconds (1/100 s). Default 10. */
  delayCs?: number;
  /** Loop count; 0 loops forever. Default 0. */
  loop?: number;
  /** Input alpha is premultiplied (macOS getBitmap). Default true. */
  unpremultiply?: boolean;
}

const MAX_PALETTE = 256;
const TRANSPARENT_THRESHOLD = 128;

export function encodeGif(frames: RawFrame[], options: GifEncodeOptions): Buffer {
  const width = options.width;
  const height = options.height;
  const delayCs = options.delayCs ?? 10;
  const loop = options.loop ?? 0;
  const unpremultiply = options.unpremultiply ?? true;

  if (frames.length === 0) {
    throw new Error("Cannot encode an empty GIF");
  }
  const pixelCount = width * height;
  for (const frame of frames) {
    if (frame.bgra.length !== pixelCount * 4) {
      throw new Error("Frame size does not match the declared dimensions");
    }
  }

  // Collect unique opaque colors (frequency-sorted for the fallback path).
  const colorCounts = new Map<number, number>();
  for (const frame of frames) {
    for (let p = 0; p < frame.bgra.length; p += 4) {
      if (frame.bgra[p + 3] < TRANSPARENT_THRESHOLD) continue;
      const [r, g, b] = readRgb(frame.bgra, p, unpremultiply);
      const key = (r << 16) | (g << 8) | b;
      colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
    }
  }

  // Reserve one palette slot for transparency; cap opaque colors at 255.
  const entries = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PALETTE - 1);
  const opaqueCount = entries.length;
  const transparentIndex = opaqueCount;
  const paletteSize = nextPowerOfTwo(Math.max(2, opaqueCount + 1));

  const colorList: Array<[number, number, number]> = [];
  const colorIndex = new Map<number, number>();
  for (const [key] of entries) {
    colorIndex.set(key, colorList.length);
    colorList.push([(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff]);
  }
  const palette = new Array<number>(paletteSize).fill(0);
  for (let i = 0; i < colorList.length; i++) {
    const [r, g, b] = colorList[i];
    palette[i] = (r << 16) | (g << 8) | b;
  }

  // Quantize each frame to palette indices.
  const indexFrames = frames.map((frame) => {
    const indexed = new Uint8Array(pixelCount);
    let out = 0;
    for (let p = 0; p < frame.bgra.length; p += 4) {
      if (frame.bgra[p + 3] < TRANSPARENT_THRESHOLD) {
        indexed[out++] = transparentIndex;
        continue;
      }
      const [r, g, b] = readRgb(frame.bgra, p, unpremultiply);
      const key = (r << 16) | (g << 8) | b;
      const known = colorIndex.get(key);
      indexed[out++] = known !== undefined ? known : nearestIndex(r, g, b, colorList);
    }
    return indexed;
  });

  // Encode. omggif needs a pre-sized buffer; 4 MiB is ample for short sprites.
  const buffer = Buffer.alloc(4 * 1024 * 1024);
  const writer = new GifWriter(buffer, width, height, { loop, palette });
  for (const indexed of indexFrames) {
    writer.addFrame(0, 0, width, height, indexed, {
      transparent: transparentIndex,
      delay: delayCs,
    });
  }
  return Buffer.from(buffer.slice(0, writer.end()));
}

function readRgb(
  bgra: Uint8Array,
  offset: number,
  unpremultiply: boolean
): [number, number, number] {
  // Electron nativeImage.getBitmap() is BGRA: b, g, r, a.
  const b = bgra[offset];
  const g = bgra[offset + 1];
  let r = bgra[offset + 2];
  const a = bgra[offset + 3];
  if (unpremultiply && a !== 255) {
    r = Math.min(255, Math.round((r * 255) / a));
  }
  return [r, g, b];
}

function nearestIndex(
  r: number,
  g: number,
  b: number,
  colorList: Array<[number, number, number]>
): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < colorList.length; i++) {
    const dr = r - colorList[i][0];
    const dg = g - colorList[i][1];
    const db = b - colorList[i][2];
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

function nextPowerOfTwo(n: number): number {
  let power = 1;
  while (power < n) power <<= 1;
  return power;
}
