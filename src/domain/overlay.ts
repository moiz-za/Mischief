export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayPlacementOptions {
  size: number;
  cursorGap: number;
}

/**
 * Compute the top-left position of an overlay window so the mascot hovers just
 * above the cursor, clamped to the display's work area so it never leaves the
 * screen.
 */
export function followPosition(
  cursor: Point,
  workArea: Rect,
  options: OverlayPlacementOptions
): Point {
  const x = clamp(
    cursor.x - options.size / 2,
    workArea.x,
    workArea.x + workArea.width - options.size
  );
  const y = clamp(
    cursor.y - options.size - options.cursorGap,
    workArea.y,
    workArea.y + workArea.height - options.size
  );
  return { x: Math.round(x), y: Math.round(y) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
