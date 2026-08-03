import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { loadTheme, themeToCssVariables } from "../src/domain/theme";

const SAMPLES_DIR = path.join(__dirname, "..", "samples", "themes");

describe("loadTheme", () => {
  it("loads the delivered theme samples", () => {
    for (const file of fs.readdirSync(SAMPLES_DIR).filter((f) => f.endsWith(".json"))) {
      const text = fs.readFileSync(path.join(SAMPLES_DIR, file), "utf8");
      const result = loadTheme(text);
      expect(result.errors, file).toEqual([]);
      expect(result.theme).not.toBeNull();
      expect(result.theme!.tokens.background).toBeTruthy();
    }
  });

  it("rejects invalid JSON", () => {
    const result = loadTheme("{nope");
    expect(result.theme).toBeNull();
    expect(result.errors[0].message).toMatch(/Invalid JSON/);
  });

  it("rejects a theme failing schema validation", () => {
    const result = loadTheme(JSON.stringify({ id: "x", name: "X" }));
    expect(result.theme).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("themeToCssVariables", () => {
  it("prefixes tokens with --mischief-", () => {
    const variables = themeToCssVariables({ background: "#0f172a", accent: "#4ade80" });
    expect(variables).toEqual({
      "--mischief-background": "#0f172a",
      "--mischief-accent": "#4ade80",
    });
  });
});
