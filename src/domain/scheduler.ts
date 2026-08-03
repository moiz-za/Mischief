/**
 * Minimal periodic ticker for the runtime. Wraps setInterval so scheduling is
 * testable with fake timers and cancellable.
 */
export interface Ticker {
  readonly running: boolean;
  start(): void;
  stop(): void;
}

export function createTicker(fn: () => void, intervalMs: number): Ticker {
  let handle: NodeJS.Timeout | null = null;

  return {
    get running() {
      return handle !== null;
    },
    start() {
      if (handle !== null) return;
      handle = setInterval(fn, intervalMs);
    },
    stop() {
      if (handle === null) return;
      clearInterval(handle);
      handle = null;
    },
  };
}
