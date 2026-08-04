import { describe, expect, it } from "vitest";
import { pickSprite, isSafeSpritePath } from "../src/domain/sprite";

describe("pickSprite", () => {
  it("returns null for no assets", () => {
    expect(pickSprite([])).toBeNull();
  });

  it("accepts every supported raster and vector format", () => {
    for (const asset of [
      "images/whiskers.svg",
      "images/buddy.png",
      "images/buddy.jpg",
      "images/buddy.jpeg",
      "images/buddy.webp",
      "images/buddy.gif",
    ]) {
      expect(pickSprite([asset]), asset).toBe(asset);
    }
  });

  it("accepts case-insensitive extensions", () => {
    expect(pickSprite(["images/BUDDY.PNG"])).toBe("images/BUDDY.PNG");
    expect(pickSprite(["images/Buddy.GIF"])).toBe("images/Buddy.GIF");
  });

  it("picks the first valid sprite in manifest order", () => {
    const assets = ["images/creature.png", "images/creature.svg", "images/audio.mp3"];
    expect(pickSprite(assets)).toBe("images/creature.png");
  });

  it("skips non-sprite assets in the manifest", () => {
    expect(pickSprite(["audio/purr.mp3", "images/buddy.svg"])).toBe("images/buddy.svg");
  });

  it("returns null when nothing is a supported sprite", () => {
    expect(pickSprite(["audio/purr.mp3", "fonts/creature.woff2"])).toBeNull();
  });

  it("rejects path traversal", () => {
    expect(pickSprite(["images/../../secret.png"])).toBeNull();
    expect(pickSprite(["../outside.svg"])).toBeNull();
    expect(pickSprite(["images/..%2fescape.svg"])).toBeNull();
  });

  it("rejects absolute paths", () => {
    expect(pickSprite(["/etc/passwd.svg"])).toBeNull();
  });

  it("rejects unsafe characters", () => {
    expect(pickSprite(["images/buddy name.svg"])).toBeNull();
    expect(pickSprite(["images/buddy;rm.png"])).toBeNull();
    expect(pickSprite(["images/buddy?.gif"])).toBeNull();
  });
});

describe("isSafeSpritePath", () => {
  it("accepts safe relative paths with nested directories", () => {
    expect(isSafeSpritePath("images/sub/buddy.svg")).toBe(true);
  });

  it("rejects traversal, absolute, and unsafe paths", () => {
    expect(isSafeSpritePath("a/../b.svg")).toBe(false);
    expect(isSafeSpritePath("/abs.svg")).toBe(false);
    expect(isSafeSpritePath("a b.svg")).toBe(false);
  });
});
