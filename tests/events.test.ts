import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../src/domain/events";

describe("EventBus", () => {
  it("dispatches typed payloads to listeners", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on("CharacterClicked", listener);
    bus.emit("CharacterClicked", { characterId: "whiskers", x: 10, y: 20 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ characterId: "whiskers", x: 10, y: 20 });
  });

  it("supports multiple listeners per event", () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("CharacterSpawned", a);
    bus.on("CharacterSpawned", b);
    bus.emit("CharacterSpawned", { characterId: "c" });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes a listener", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    const off = bus.on("CharacterMoved", listener);
    off();
    bus.emit("CharacterMoved", { characterId: "c", x: 1, y: 2 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not notify listeners of other events", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on("CharacterSleeping", listener);
    bus.emit("CharacterMoved", { characterId: "c", x: 1, y: 2 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores emissions with no listeners", () => {
    const bus = new EventBus();
    expect(() => bus.emit("RuntimeStarted", { version: "0.1.2" })).not.toThrow();
  });

  it("reports listener counts and clears", () => {
    const bus = new EventBus();
    bus.on("CharacterSpeaking", vi.fn());
    expect(bus.listenerCount("CharacterSpeaking")).toBe(1);
    bus.clear();
    expect(bus.listenerCount("CharacterSpeaking")).toBe(0);
  });

  it("snapshots listeners so removing one during dispatch is safe", () => {
    const bus = new EventBus();
    const selfRemoving = vi.fn();
    const second = vi.fn();
    const off = bus.on("CharacterRemoved", () => {
      selfRemoving();
      off();
    });
    bus.on("CharacterRemoved", second);
    bus.emit("CharacterRemoved", { characterId: "c" });
    expect(selfRemoving).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("dispatches CustomPetImported with the new companion's info", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on("CustomPetImported", listener);
    bus.emit("CustomPetImported", { characterId: "buddy", displayName: "Buddy" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ characterId: "buddy", displayName: "Buddy" });
  });
});
