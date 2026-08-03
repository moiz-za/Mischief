import { describe, expect, it } from "vitest";
import { compareVersions, isCompatible, parseVersion } from "../src/domain/version";

describe("parseVersion", () => {
  it("parses a full semantic version", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("parses a prerelease version", () => {
    expect(parseVersion("1.2.3-beta.1").prerelease).toBe("beta.1");
  });

  it("rejects malformed versions", () => {
    expect(() => parseVersion("v1.2.3")).toThrow();
    expect(() => parseVersion("1.2")).toThrow();
  });
});

describe("compareVersions", () => {
  it("compares stable versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
    expect(compareVersions("1.1.0", "1.0.9")).toBe(1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("0.9.0", "1.0.0")).toBe(-1);
  });

  it("treats prereleases as lower than stable", () => {
    expect(compareVersions("1.0.0-beta", "1.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.0-rc")).toBe(1);
  });
});

describe("isCompatible", () => {
  it("accepts versions within range", () => {
    expect(isCompatible("1.2.0", "1.0.0", "2.0.0")).toBe(true);
    expect(isCompatible("1.0.0", "1.0.0")).toBe(true);
  });

  it("rejects versions outside range", () => {
    expect(isCompatible("0.9.0", "1.0.0")).toBe(false);
    expect(isCompatible("2.1.0", "1.0.0", "2.0.0")).toBe(false);
  });
});
