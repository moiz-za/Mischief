import { describe, expect, it } from "vitest";
import {
  applyTrim,
  colorDistance,
  connectedComponents,
  cutout,
  dropSmallForegroundComponents,
  foregroundRatio,
  premultiplyCopy,
  rgbaToBgra,
  type Raster,
} from "../src/domain/segmentation";

function solid(width: number, height: number, r: number, g: number, b: number, a = 255): Raster {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  }
  return { width, height, rgba };
}

function pixel(raster: Raster, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const i = (y * raster.width + x) * 4;
  return { r: raster.rgba[i], g: raster.rgba[i + 1], b: raster.rgba[i + 2], a: raster.rgba[i + 3] };
}

/** Red background with an inset green square (8x8, margin 8 on a 24x24 canvas). */
function subjectFixture(): Raster {
  const raster = solid(24, 24, 220, 40, 40);
  for (let y = 8; y < 16; y++) {
    for (let x = 8; x < 16; x++) {
      const i = (y * 24 + x) * 4;
      raster.rgba[i] = 40;
      raster.rgba[i + 1] = 200;
      raster.rgba[i + 2] = 40;
    }
  }
  return raster;
}

describe("colorDistance", () => {
  it("is zero for identical colors and grows with difference", () => {
    expect(colorDistance(0, 0, 0, 0, 0, 0)).toBe(0);
    expect(colorDistance(255, 255, 255, 255, 255, 255)).toBe(0);
    const far = colorDistance(255, 255, 255, 0, 0, 0);
    expect(far).toBeGreaterThan(200);
  });
});

describe("cutout", () => {
  it("removes a uniform border background and keeps an inset foreground", () => {
    const result = cutout(subjectFixture(), { tolerance: 40 });
    // Corners cleared.
    expect(pixel(result, 0, 0).a).toBe(0);
    expect(pixel(result, 23, 0).a).toBe(0);
    // Border-adjacent red cleared.
    expect(pixel(result, 5, 12).a).toBe(0);
    // Inset green square preserved.
    expect(pixel(result, 8, 8).a).toBe(255);
    expect(pixel(result, 15, 15).a).toBe(255);
    expect(foregroundRatio(result)).toBeCloseTo(64 / 576, 3);
  });

  it("respects tolerance: too far colors are kept as foreground", () => {
    const result = cutout(subjectFixture(), { tolerance: 5 });
    // Green is far from red; it must survive.
    expect(pixel(result, 8, 8).a).toBe(255);
    // Red border still removed.
    expect(pixel(result, 0, 0).a).toBe(0);
  });

  it("handles gradient-ish backgrounds without eating the subject", () => {
    const raster = solid(24, 24, 60, 60, 120);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const i = (y * 24 + x) * 4;
        raster.rgba[i] = 60 + y; // vertical gradient blue-ish
        raster.rgba[i + 2] = 120 + y;
      }
    }
    for (let y = 8; y < 16; y++) {
      for (let x = 8; x < 16; x++) {
        const i = (y * 24 + x) * 4;
        raster.rgba[i] = 200;
        raster.rgba[i + 1] = 200;
        raster.rgba[i + 2] = 20;
      }
    }
    const result = cutout(raster, { tolerance: 60 });
    expect(pixel(result, 0, 0).a).toBe(0);
    expect(pixel(result, 12, 12).a).toBe(255);
  });

  it("does not mutate its input", () => {
    const input = subjectFixture();
    const before = input.rgba[0];
    cutout(input, { tolerance: 40 });
    expect(input.rgba[0]).toBe(before);
  });

  it("respects maxBackgroundPixels (resource cap)", () => {
    const result = cutout(subjectFixture(), { tolerance: 40, maxBackgroundPixels: 10 });
    // Only a few border pixels processed; foreground untouched.
    expect(pixel(result, 8, 8).a).toBe(255);
    expect(pixel(result, 0, 0).a).toBe(0);
  });

  it("despeckles tiny foreground islands when asked", () => {
    const raster = solid(24, 24, 220, 40, 40);
    // One 6x6 subject and one 1-pixel spec.
    for (let y = 8; y < 14; y++) {
      for (let x = 8; x < 14; x++) {
        const i = (y * 24 + x) * 4;
        raster.rgba[i] = 40;
        raster.rgba[i + 1] = 200;
        raster.rgba[i + 2] = 40;
      }
    }
    const i = (2 * 24 + 2) * 4;
    raster.rgba[i] = 40;
    raster.rgba[i + 1] = 200;
    raster.rgba[i + 2] = 40;
    const result = cutout(raster, { tolerance: 40, minComponentPixels: 5 });
    expect(pixel(result, 9, 9).a).toBe(255);
    expect(pixel(result, 2, 2).a).toBe(0);
  });
});

describe("connectedComponents", () => {
  it("finds two disconnected foreground islands", () => {
    const components = connectedComponents(
      10,
      10,
      (i) => (i === 5 * 10 + 5) || (i === 8 * 10 + 8)
    );
    expect(components).toHaveLength(2);
    expect(components[0].indices).toHaveLength(1);
    expect(components[1].indices).toHaveLength(1);
  });

  it("merges 4-connected neighbors into one component", () => {
    const components = connectedComponents(10, 10, (i) => {
      const x = i % 10;
      const y = (i - x) / 10;
      return x === 5 && (y === 5 || y === 6);
    });
    expect(components).toHaveLength(1);
    expect(components[0].indices).toHaveLength(2);
  });
});

describe("dropSmallForegroundComponents", () => {
  it("removes only the small component", () => {
    const raster = solid(24, 24, 0, 0, 0, 0);
    for (const p of [5 * 24 + 5, 6 * 24 + 6, 10 * 24 + 10]) {
      const i = p * 4;
      raster.rgba[i + 3] = 255;
    }
    const result = dropSmallForegroundComponents(24, 24, raster.rgba, 3);
    const alphas = [0, 1, 2, 3, 4].map((n) => result.rgba[n * 4 + 3]);
    // 10,10 island (1px) removed; 5,5+6,6 (2px, disconnected) both removed.
    expect(alphas.every((a) => a === 0)).toBe(true);
  });
});

describe("applyTrim", () => {
  it("remove strokes paint their disk transparent", () => {
    const result = cutout(subjectFixture(), { tolerance: 40 });
    const trimmed = applyTrim(result, [], [{ x: 12 / 24, y: 12 / 24, radius: 0.2 }]);
    // Center of the green square is inside the disk -> removed.
    expect(pixel(trimmed, 12, 12).a).toBe(0);
    // A corner of the square (distance ~5.7 > radius 4.8) stays.
    expect(pixel(trimmed, 8, 8).a).toBe(255);
  });

  it("keep strokes paint their disk opaque", () => {
    const result = cutout(subjectFixture(), { tolerance: 40 });
    const trimmed = applyTrim(result, [{ x: 2 / 24, y: 2 / 24, radius: 0.15 }], []);
    // Stroke sits on cleared red background -> restored to opaque.
    expect(pixel(trimmed, 2, 2).a).toBe(255);
    // Far corner stays cleared (outside the disk).
    expect(pixel(trimmed, 20, 20).a).toBe(0);
  });

  it("no-ops without strokes", () => {
    const result = cutout(subjectFixture(), { tolerance: 40 });
    const unchanged = applyTrim(result, [], []);
    expect(unchanged.rgba).toEqual(result.rgba);
  });
});

describe("alpha format helpers", () => {
  it("premultiplies straight alpha", () => {
    const raster: Raster = { width: 1, height: 1, rgba: new Uint8ClampedArray([200, 100, 50, 128]) };
    const pre = premultiplyCopy(raster);
    expect(pre.rgba[0]).toBe(Math.round(200 * 0.5));
    expect(pre.rgba[3]).toBe(128);
  });

  it("leaves opaque and fully transparent pixels untouched", () => {
    const raster: Raster = { width: 2, height: 1, rgba: new Uint8ClampedArray([1, 2, 3, 255, 9, 9, 9, 0]) };
    const pre = premultiplyCopy(raster);
    expect(pre.rgba[0]).toBe(1);
    expect(pre.rgba[7]).toBe(0);
  });

  it("swaps RGBA to BGRA", () => {
    const raster: Raster = { width: 1, height: 1, rgba: new Uint8ClampedArray([10, 20, 30, 255]) };
    expect([...rgbaToBgra(raster)]).toEqual([30, 20, 10, 255]);
  });
});
