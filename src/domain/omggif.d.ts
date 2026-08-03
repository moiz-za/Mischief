declare module "omggif" {
  export class GifWriter {
    constructor(
      buf: Uint8Array,
      width: number,
      height: number,
      opts?: { loop?: number | null; palette?: number[]; background?: number }
    );
    addFrame(
      x: number,
      y: number,
      w: number,
      h: number,
      indexedPixels: ArrayLike<number>,
      opts?: { palette?: number[]; delay?: number; transparent?: number; disposal?: number }
    ): void;
    end(): number;
  }

  export class GifReader {
    constructor(buf: Uint8Array);
    width: number;
    height: number;
    numFrames(): number;
    decodeAndBlitFrameRGBA(frame: number, output: Uint8Array): void;
  }
}
