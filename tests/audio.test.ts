import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

const AUDIO_FILE = path.join(__dirname, "..", "src", "renderer", "audio.renderer.js");
const content = fs.readFileSync(AUDIO_FILE, "utf8");

describe("audio.renderer.js", () => {
  let mockAudioContext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 0,
      destination: {},
      suspend: vi.fn(),
      resume: vi.fn(),
      state: "running",
    }));

    (global as unknown as Record<string, unknown>).AudioContext = mockAudioContext as unknown as typeof AudioContext;
    (global as unknown as Record<string, unknown>).webkitAudioContext = mockAudioContext as unknown as typeof AudioContext;

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("defines a soundMap with entries for all signal kinds", () => {
    const signalKinds = [
      "pet",
      "mischief-random",
      "combo-streak",
      "power-suspend",
      "power-resume",
      "lock-screen",
      "unlock-screen",
      "on-ac",
      "on-battery",
      "activity-burst",
      "idle-long",
      "app-shutdown",
      "time-morning",
      "time-lunch",
      "time-evening",
      "time-night",
      "clipboard-copy",
      "screenshot",
      "ide-save",
      "git-commit",
      "build-green",
      "hydrate",
      "posture-check",
    ];

    for (const kind of signalKinds) {
      const hasKey = content.includes(`${kind}:`) || content.includes(`"${kind}":`);
      expect(hasKey).toBe(true);
    }
  });

  it("defines all sound effect functions", () => {
    const functions = ["purr", "chime", "mischief", "combo", "power", "timeGreeting"];
    for (const fn of functions) {
      expect(content).toContain(`function ${fn}()`);
    }
  });

  it("includes muted flag check before playing tones", () => {
    expect(content).toContain("muted");
    expect(content).toContain("if (muted) return");
  });

  it("registers onPlaySound listener when window.mischief is available", () => {
    expect(content).toContain("onPlaySound");
    expect(content).toContain("playSound");
  });

  it("registers onMuted listener when window.mischief is available", () => {
    expect(content).toContain("onMuted");
    expect(content).toContain("setMuted");
  });

  it("uses AudioContext with createOscillator and createGain", () => {
    expect(content).toContain("createOscillator");
    expect(content).toContain("createGain");
  });

  it("uses exponentialRampToValueAtTime for gain envelope", () => {
    expect(content).toContain("exponentialRampToValueAtTime");
  });

  it("purr uses low frequencies (90 and 110 Hz)", () => {
    expect(content).toContain("playTone(90");
    expect(content).toContain("playTone(110");
  });

  it("chime uses high frequency (880 Hz)", () => {
    expect(content).toContain("playTone(880");
  });

  it("combo uses ascending arpeggio frequencies", () => {
    expect(content).toContain("playTone(523");
    expect(content).toContain("playTone(659");
    expect(content).toContain("playTone(784");
  });
});