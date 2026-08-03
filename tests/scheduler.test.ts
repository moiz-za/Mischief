import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTicker } from "../src/domain/scheduler";

describe("createTicker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts paused and invokes fn on interval after start", () => {
    const fn = vi.fn();
    const ticker = createTicker(fn, 1000);
    expect(ticker.running).toBe(false);
    ticker.start();
    expect(ticker.running).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stop halts further ticks", () => {
    const fn = vi.fn();
    const ticker = createTicker(fn, 1000);
    ticker.start();
    vi.advanceTimersByTime(2500);
    ticker.stop();
    expect(ticker.running).toBe(false);
    const calls = fn.mock.calls.length;
    vi.advanceTimersByTime(5000);
    expect(fn.mock.calls.length).toBe(calls);
  });

  it("start is idempotent", () => {
    const fn = vi.fn();
    const ticker = createTicker(fn, 1000);
    ticker.start();
    ticker.start();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stop on an idle ticker is a no-op", () => {
    const ticker = createTicker(vi.fn(), 1000);
    expect(() => ticker.stop()).not.toThrow();
  });
});
