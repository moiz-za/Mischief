import { describe, expect, it } from "vitest";
import { followPosition, type OverlayPlacementOptions } from "../src/domain/overlay";

const OPTIONS: OverlayPlacementOptions = { size: 96, cursorGap: 10 };
const WORK_AREA = { x: 0, y: 0, width: 1440, height: 900 };

describe("followPosition", () => {
  it("never places the window over the cursor (keeps a full gap)", () => {
    const cursor = { x: 720, y: 450 };
    const { x, y } = followPosition(cursor, WORK_AREA, OPTIONS);
    const coversCursor =
      x <= cursor.x && cursor.x < x + OPTIONS.size && y <= cursor.y && cursor.y < y + OPTIONS.size;
    expect(coversCursor).toBe(false);
    // Window sits fully beside the cursor on the side with the most room.
    expect(x).toBe(720 + OPTIONS.cursorGap); // right side has the most room
    expect(y).toBe(402);
  });

  it("picks the side with the most room", () => {
    // Cursor on the far left: tons of room to the right.
    const right = followPosition({ x: 5, y: 450 }, WORK_AREA, OPTIONS);
    expect(right.x).toBe(5 + OPTIONS.cursorGap);
    expect(right.y).toBe(402);
    // Cursor on the far right: tons of room to the left.
    const left = followPosition({ x: 1439, y: 450 }, WORK_AREA, OPTIONS);
    expect(left.x).toBe(1439 - OPTIONS.size - OPTIONS.cursorGap);
    expect(left.y).toBe(402);
    // Cursor near the top edge: more room below.
    const below = followPosition({ x: 720, y: 20 }, WORK_AREA, OPTIONS);
    expect(below.y).toBe(20 + OPTIONS.cursorGap);
    // Cursor near the bottom edge: more room above.
    const above = followPosition({ x: 720, y: 890 }, WORK_AREA, OPTIONS);
    expect(above.y).toBe(890 - OPTIONS.size - OPTIONS.cursorGap);
  });

  it("clamps to the work area so the whole window stays on screen", () => {
    const result = followPosition({ x: 720, y: 450 }, WORK_AREA, OPTIONS);
    expect(result.x).toBeGreaterThanOrEqual(WORK_AREA.x);
    expect(result.x).toBeLessThanOrEqual(WORK_AREA.x + WORK_AREA.width - OPTIONS.size);
    expect(result.y).toBeGreaterThanOrEqual(WORK_AREA.y);
    expect(result.y).toBeLessThanOrEqual(WORK_AREA.y + WORK_AREA.height - OPTIONS.size);
  });

  it("respects a multi-display work area offset", () => {
    const secondary = { x: 1440, y: 0, width: 1920, height: 1080 };
    const { x, y } = followPosition({ x: 1600, y: 540 }, secondary, OPTIONS);
    // Secondary display: more room to the right of the cursor.
    expect(x).toBe(1600 + OPTIONS.cursorGap);
    expect(y).toBe(540 - OPTIONS.size / 2);
  });

  it("keeps the whole window on screen when the work area is smaller than the cursor region", () => {
    const tiny = { x: 0, y: 0, width: 100, height: 100 };
    const { x, y } = followPosition({ x: 50, y: 50 }, tiny, OPTIONS);
    expect(x).toBeGreaterThanOrEqual(tiny.x);
    expect(x).toBeLessThanOrEqual(tiny.x + tiny.width - OPTIONS.size);
    expect(y).toBeGreaterThanOrEqual(tiny.y);
    expect(y).toBeLessThanOrEqual(tiny.y + tiny.height - OPTIONS.size);
  });

  it("prefers the side with the largest amount of room", () => {
    // Huge horizontal margin, small vertical margin -> go sideways, not up.
    const wide = { x: 0, y: 0, width: 4000, height: 200 };
    const { x, y } = followPosition({ x: 2000, y: 100 }, wide, OPTIONS);
    expect(x).toBe(2000 + OPTIONS.cursorGap);
    expect(y).toBe(100 - OPTIONS.size / 2);
    // Huge vertical margin, tiny horizontal -> go vertical.
    const tall = { x: 0, y: 0, width: 300, height: 4000 };
    const { x: tx, y: ty } = followPosition({ x: 150, y: 2000 }, tall, OPTIONS);
    expect(ty).toBe(2000 - OPTIONS.size - OPTIONS.cursorGap);
    expect(tx).toBe(150 - OPTIONS.size / 2);
  });

  it("clamps negative offsets caused by tiny margins", () => {
    // Cursor near the top with only a sliver of room: still fully visible.
    const { x, y } = followPosition({ x: 720, y: 2 }, WORK_AREA, OPTIONS);
    expect(y).toBeGreaterThanOrEqual(WORK_AREA.y);
    expect(y).toBeLessThanOrEqual(WORK_AREA.y + WORK_AREA.height - OPTIONS.size);
    expect(x).toBeGreaterThanOrEqual(WORK_AREA.x);
    expect(x).toBeLessThanOrEqual(WORK_AREA.x + WORK_AREA.width - OPTIONS.size);
  });
});
