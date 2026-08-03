import { describe, expect, it } from "vitest";
import { followPosition, type OverlayPlacementOptions } from "../src/domain/overlay";

const OPTIONS: OverlayPlacementOptions = { size: 96, cursorGap: 10 };
const WORK_AREA = { x: 0, y: 0, width: 1440, height: 900 };

describe("followPosition", () => {
  it("places the window just above the cursor, horizontally centered", () => {
    const { x, y } = followPosition({ x: 720, y: 450 }, WORK_AREA, OPTIONS);
    expect(x).toBe(672);
    expect(y).toBe(344);
  });

  it("clamps to the top of the work area when the cursor is near the top", () => {
    const { y } = followPosition({ x: 720, y: 20 }, WORK_AREA, OPTIONS);
    expect(y).toBe(WORK_AREA.y);
  });

  it("clamps to the left edge when the cursor is near the left", () => {
    const { x } = followPosition({ x: 5, y: 450 }, WORK_AREA, OPTIONS);
    expect(x).toBe(WORK_AREA.x);
  });

  it("clamps to the right edge when the cursor is near the right", () => {
    const { x } = followPosition({ x: 1439, y: 450 }, WORK_AREA, OPTIONS);
    expect(x).toBe(WORK_AREA.x + WORK_AREA.width - OPTIONS.size);
  });

  it("respects a multi-display work area offset", () => {
    const secondary = { x: 1440, y: 0, width: 1920, height: 1080 };
    const { x, y } = followPosition({ x: 1600, y: 540 }, secondary, OPTIONS);
    expect(x).toBe(1552);
    expect(y).toBe(434);
  });

  it("keeps the whole window on screen when the work area is smaller than the cursor region", () => {
    const tiny = { x: 0, y: 0, width: 100, height: 100 };
    const { x, y } = followPosition({ x: 50, y: 50 }, tiny, OPTIONS);
    expect(x).toBeGreaterThanOrEqual(tiny.x);
    expect(x).toBeLessThanOrEqual(tiny.x + tiny.width - OPTIONS.size);
    expect(y).toBeGreaterThanOrEqual(tiny.y);
    expect(y).toBeLessThanOrEqual(tiny.y + tiny.height - OPTIONS.size);
  });
});
