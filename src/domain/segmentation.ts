/**
 * Offline background removal and trim for pet photos (Custom Pet Import
 * Engine, Phase 1). Pure + testable: operates on raw RGBA rasters only, with
 * no I/O and no Electron, so the main process can run it safely and the tests
 * can feed it synthetic buffers.
 *
 * Strategy (no ML model, ~0 bytes added):
 *  - `cutout` grows a background region inward from the image borders using a
 *    seeded flood fill. A pixel is background when it is reachable from the
 *    border and its weighted color distance to the running background mean
 *    stays under `tolerance`. Inset subjects (pets) are never reachable and so
 *    keep their alpha.
 *  - `applyTrim` gives the user brush strokes (`keep` / `remove`) to fix up the
 *    result: remove strokes flood out of foreground regions, keep strokes
 *    flood out of background regions.
 *  - `dropSmallForegroundComponents` removes leftover noise specks.
 *
 * Alpha is "straight" (non-premultiplied) throughout; see `premultiplyCopy`
 * for conversion to the BGRA-pre-multiplied form Electron's nativeImage wants.
 */

export interface Raster {
  width: number;
  height: number;
  /** Straight RGBA, length = width * height * 4. */
  rgba: Uint8ClampedArray;
}

export interface Stroke {
  /** Normalized 0..1 coordinates on the canvas. */
  x: number;
  y: number;
  /** Normalized brush radius. */
  radius: number;
}

export interface CutoutOptions {
  /** Max weighted color distance (0..~255) for a pixel to count as background. */
  tolerance?: number;
  /** Stop expanding after this many background pixels (resource-conscious). */
  maxBackgroundPixels?: number;
  /** Drop foreground components smaller than this many pixels (noise). */
  minComponentPixels?: number;
}

export function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
}

/** Fraction of pixels with alpha > 0. 1 = nothing removed, 0 = everything removed. */
export function foregroundRatio(raster: Raster): number {
  const { rgba, width, height } = raster;
  let opaque = 0;
  const total = width * height;
  for (let i = 0; i < total; i++) {
    if (rgba[i * 4 + 3] > 0) opaque++;
  }
  return total === 0 ? 0 : opaque / total;
}

/**
 * Border-seeded flood fill that clears the background to transparent.
 * Returns a new raster; the input is untouched.
 */
export function cutout(raster: Raster, options: CutoutOptions = {}): Raster {
  const { width, height, rgba } = raster;
  const tolerance = options.tolerance ?? 30;
  const maxBackgroundPixels = options.maxBackgroundPixels ?? width * height;
  const total = width * height;

  const out = new Uint8ClampedArray(rgba);
  const isBackground = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const push = (i: number): void => {
    if (isBackground[i]) return;
    isBackground[i] = 1;
    queue[tail++] = i;
  };

  const pushNeighbors = (i: number): void => {
    const x = i % width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (i >= width) push(i - width);
    if (i < total - width) push(i + width);
  };

  // Seed every border pixel.
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    push(y * width);
    push(y * width + width - 1);
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  let processed = 0;

  while (head < tail && processed < maxBackgroundPixels) {
    const i = queue[head++];
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const a = rgba[i * 4 + 3];

    if (a > 0 && count > 0) {
      const mr = sumR / count;
      const mg = sumG / count;
      const mb = sumB / count;
      if (colorDistance(r, g, b, mr, mg, mb) > tolerance) continue;
    }

    // Background: clear alpha, fold opaque pixels into the running mean.
    out[i * 4 + 3] = 0;
    if (a > 0) {
      sumR += r;
      sumG += g;
      sumB += b;
      count++;
    }
    pushNeighbors(i);
    processed++;
  }

  if ((options.minComponentPixels ?? 0) > 0) {
    return dropSmallForegroundComponents(width, height, out, options.minComponentPixels ?? 0);
  }
  return { width, height, rgba: out };
}

export interface Component {
  id: number;
  indices: number[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Connected components of the "solid" mask (default: alpha > 0), 4-connectivity.
 */
export function connectedComponents(
  width: number,
  height: number,
  solid: (i: number) => boolean
): Component[] {
  const total = width * height;
  const visited = new Uint8Array(total);
  const components: Component[] = [];
  const stack: number[] = [];
  let id = 0;

  const isSolid = (i: number): boolean => !visited[i] && solid(i);

  for (let start = 0; start < total; start++) {
    if (!isSolid(start)) continue;
    const indices: number[] = [];
    let minX = start % width;
    let maxX = minX;
    let minY = (start - minX) / width;
    let maxY = minY;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    while (stack.length > 0) {
      const i = stack.pop() as number;
      indices.push(i);
      const x = i % width;
      const y = (i - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && isSolid(i - 1)) {
        visited[i - 1] = 1;
        stack.push(i - 1);
      }
      if (x < width - 1 && isSolid(i + 1)) {
        visited[i + 1] = 1;
        stack.push(i + 1);
      }
      if (i >= width && isSolid(i - width)) {
        visited[i - width] = 1;
        stack.push(i - width);
      }
      if (i < total - width && isSolid(i + width)) {
        visited[i + width] = 1;
        stack.push(i + width);
      }
    }
    components.push({ id: id++, indices, minX, minY, maxX, maxY });
  }
  return components;
}

/** Removes foreground islands smaller than `minPixels` (returns a new raster). */
export function dropSmallForegroundComponents(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
  minPixels: number
): Raster {
  const out = new Uint8ClampedArray(rgba);
  for (const component of connectedComponents(width, height, (i) => out[i * 4 + 3] > 0)) {
    if (component.indices.length < minPixels) {
      for (const i of component.indices) out[i * 4 + 3] = 0;
    }
  }
  return { width, height, rgba: out };
}

/**
 * Applies keep/remove brush strokes to a cutout as a paint: every pixel inside
 * a keep stroke's disk is made opaque; every pixel inside a remove stroke's
 * disk is made transparent. Predictable "brush" semantics (no surprise floods).
 * Returns a new raster.
 */
export function applyTrim(raster: Raster, keepStrokes: Stroke[], removeStrokes: Stroke[]): Raster {
  const { width, height, rgba } = raster;
  const out = new Uint8ClampedArray(rgba);
  if (keepStrokes.length === 0 && removeStrokes.length === 0) return { width, height, rgba: out };

  const maxDim = Math.max(width, height);
  const paint = (strokes: Stroke[], alpha: number): void => {
    for (const stroke of strokes) {
      const cx = Math.round(stroke.x * width);
      const cy = Math.round(stroke.y * height);
      const radius = Math.max(1, Math.round(stroke.radius * maxDim));
      const r2 = radius * radius;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          out[(y * width + x) * 4 + 3] = alpha;
        }
      }
    }
  };

  paint(removeStrokes, 0);
  paint(keepStrokes, 255);
  return { width, height, rgba: out };
}

/**
 * Converts straight (non-premultiplied) alpha into premultiplied form.
 * Returns a new raster. Premultiplied RGBA is what Electron's nativeImage
 * bitmap format expects (swapped to BGRA).
 */
export function premultiplyCopy(raster: Raster): Raster {
  const { width, height, rgba } = raster;
  const out = new Uint8ClampedArray(rgba);
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const a = rgba[i * 4 + 3];
    if (a === 0 || a === 255) continue;
    const f = a / 255;
    out[i * 4] = Math.round(rgba[i * 4] * f);
    out[i * 4 + 1] = Math.round(rgba[i * 4 + 1] * f);
    out[i * 4 + 2] = Math.round(rgba[i * 4 + 2] * f);
  }
  return { width, height, rgba: out };
}

/** RGBA -> BGRA byte swap (matching nativeImage.toBitmap()/createFromBuffer). */
export function rgbaToBgra(raster: Raster): Uint8ClampedArray {
  const { width, height, rgba } = raster;
  const out = new Uint8ClampedArray(width * height * 4);
  const total = width * height;
  for (let i = 0; i < total; i++) {
    out[i * 4] = rgba[i * 4 + 2];
    out[i * 4 + 1] = rgba[i * 4 + 1];
    out[i * 4 + 2] = rgba[i * 4];
    out[i * 4 + 3] = rgba[i * 4 + 3];
  }
  return out;
}
