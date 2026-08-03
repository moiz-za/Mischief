import { describe, expect, it } from "vitest";
import { GifReader } from "omggif";
import { encodeGif } from "../src/domain/gif";

function bg(hex: string, alpha = 255): number[] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [b, g, r, alpha];
}

function decode(buf: Buffer): { width: number; height: number; frames: number; rgba: Uint8Array } {
  const reader = new GifReader(new Uint8Array(buf));
  const rgba = new Uint8Array(reader.width * reader.height * 4);
  reader.decodeAndBlitFrameRGBA(0, rgba);
  return { width: reader.width, height: reader.height, frames: reader.numFrames(), rgba };
}

describe("encodeGif", () => {
  it("emits a valid GIF89a with the declared dimensions", () => {
    const buf = encodeGif(
      [
        {
          bgra: Uint8Array.from([
            ...bg("#4ade80"),
            ...bg("#1e293b"),
            ...bg("#1e293b"),
            ...bg("#4ade80"),
          ]),
        },
      ],
      { width: 2, height: 2, unpremultiply: false }
    );
    expect(buf.toString("latin1", 0, 6)).toBe("GIF89a");
    const decoded = decode(buf);
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(2);
    expect(decoded.frames).toBe(1);
  });

  it("encodes frame colors losslessly for few-color sprites", () => {
    const frame = Uint8Array.from([
      ...bg("#ff0000"),
      ...bg("#00ff00"),
      ...bg("#0000ff"),
      ...bg("#ffffff"),
    ]);
    const buf = encodeGif([{ bgra: frame }], { width: 2, height: 2, unpremultiply: false });
    const { rgba } = decode(buf);
    // BGRA->RGBA already applied by the decoder; assert exact colors.
    expect(Array.from(rgba)).toEqual([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
  });

  it("preserves transparency", () => {
    const frame = Uint8Array.from([
      ...bg("#4ade80"),
      ...bg("#000000", 0),
      ...bg("#4ade80"),
      ...bg("#4ade80"),
    ]);
    const buf = encodeGif([{ bgra: frame }], { width: 2, height: 2, unpremultiply: false });
    const { rgba } = decode(buf);
    // Transparent pixel decodes to alpha 0.
    expect(rgba[7]).toBe(0);
    // Opaque pixels keep their color (RGBA order from the decoder).
    expect(Array.from(rgba.slice(0, 4))).toEqual([0x4a, 0xde, 0x80, 255]);
  });

  it("supports multiple frames (animation)", () => {
    const f1 = Uint8Array.from([
      ...bg("#ff0000"),
      ...bg("#ff0000"),
      ...bg("#ff0000"),
      ...bg("#ff0000"),
    ]);
    const f2 = Uint8Array.from([
      ...bg("#0000ff"),
      ...bg("#0000ff"),
      ...bg("#0000ff"),
      ...bg("#0000ff"),
    ]);
    const buf = encodeGif([{ bgra: f1 }, { bgra: f2 }], {
      width: 2,
      height: 2,
      delayCs: 11,
      unpremultiply: false,
    });
    const reader = new GifReader(new Uint8Array(buf));
    expect(reader.numFrames()).toBe(2);
  });

  it("quantizes frames with many colors without crashing", () => {
    const colors: number[] = [];
    for (let i = 0; i < 300; i++) {
      colors.push(...bg(`#${i.toString(16).padStart(2, "0")}0000`));
    }
    // A 300-color frame at 300x1 exceeds the 255-color cap → nearest-color path.
    const frame = Uint8Array.from(colors);
    const buf = encodeGif([{ bgra: frame }], { width: 300, height: 1, unpremultiply: false });
    const decoded = decode(buf);
    expect(decoded.width).toBe(300);
    expect(decoded.height).toBe(1);
  });

  it("rejects empty frame lists and size mismatches", () => {
    expect(() => encodeGif([], { width: 2, height: 2 })).toThrow(/empty GIF/);
    expect(() =>
      encodeGif([{ bgra: Uint8Array.from([0, 0, 0, 255]) }], { width: 2, height: 2 })
    ).toThrow(/dimensions/);
  });

  it("round-trips a real 96x96 sprite-like image", () => {
    const w = 96;
    const h = 96;
    const frame = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        // checkerboard of two colors with a transparent border
        if (x < 8 || y < 8 || x >= w - 8 || y >= h - 8) {
          frame[p + 3] = 0;
        } else if ((x + y) % 2 === 0) {
          frame[p] = 0x80;
          frame[p + 1] = 0xde;
          frame[p + 2] = 0x4a;
          frame[p + 3] = 255;
        } else {
          frame[p] = 0x3b;
          frame[p + 1] = 0x1e;
          frame[p + 2] = 0x29;
          frame[p + 3] = 255;
        }
      }
    }
    const buf = encodeGif([{ bgra: frame }], { width: w, height: h, unpremultiply: false });
    const { width, height, rgba } = decode(buf);
    expect(width).toBe(w);
    expect(height).toBe(h);
    // border pixel transparent
    expect(rgba[3]).toBe(0);
    // interior pixel opaque with expected color
    const interior = (10 * w + 10) * 4;
    expect(rgba[interior]).toBe(0x4a);
    expect(rgba[interior + 1]).toBe(0xde);
    expect(rgba[interior + 2]).toBe(0x80);
    expect(rgba[interior + 3]).toBe(255);
  });
});
