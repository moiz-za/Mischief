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
 * Compute the top-left position of an overlay window so the mascot stays near
 * the cursor without covering it: the window is placed on whichever side of the
 * cursor has the most room in the display's work area, held a comfortable gap
 * away, and clamped so it never leaves the screen. This keeps the cursor and
 * whatever is underneath it clickable.
 */
export function followPosition(
  cursor: Point,
  workArea: Rect,
  options: OverlayPlacementOptions
): Point {
  const { size, cursorGap } = options;

  // Candidate positions: place the full window on one side of the cursor.
  const right = workArea.x + workArea.width;
  const bottom = workArea.y + workArea.height;
  const room = {
    above: cursor.y - workArea.y,
    below: bottom - cursor.y,
    left: cursor.x - workArea.x,
    right: right - cursor.x,
  };
  const need = size + cursorGap;

  const candidates: Array<{ room: number; x: number; y: number }> = [];
  const add = (side: keyof typeof room, x: number, y: number): void => {
    if (room[side] >= need) candidates.push({ room: room[side], x, y });
  };
  // Ties prefer above, then below, then right, then left, so behavior is
  // stable and the companion stays on the side the user is not using.
  add("above", cursor.x - size / 2, cursor.y - size - cursorGap);
  add("below", cursor.x - size / 2, cursor.y + cursorGap);
  add("right", cursor.x + cursorGap, cursor.y - size / 2);
  add("left", cursor.x - size - cursorGap, cursor.y - size / 2);

  const chosen = candidates.sort((a, b) => b.room - a.room || 0)[0] ?? {
    room: 0,
    x: cursor.x - size / 2,
    y: cursor.y - size - cursorGap,
  };

  return {
    x: Math.round(clamp(chosen.x, workArea.x, right - size)),
    y: Math.round(clamp(chosen.y, workArea.y, bottom - size)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
