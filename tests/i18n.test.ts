import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { createI18n, validateLocaleShape, type Messages } from "../src/domain/i18n";

const LOCALES_DIR = path.join(__dirname, "..", "localization");

function loadLocales(): Record<string, Messages> {
  const locales: Record<string, Messages> = {};
  for (const file of fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json"))) {
    const name = path.basename(file, ".json");
    locales[name] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), "utf8"));
  }
  return locales;
}

describe("validateLocaleShape", () => {
  it("all delivered locales match the base key tree exactly", () => {
    for (const file of fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json"))) {
      const locale = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), "utf8"));
      const result = validateLocaleShape(locale);
      expect(result.ok, `${file}: ${JSON.stringify(result.errors)}`).toBe(true);
    }
  });

  it("flags missing keys", () => {
    const result = validateLocaleShape({ app: { name: "X" } });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "app.tagline")).toBe(true);
  });

  it("flags extra keys", () => {
    const result = validateLocaleShape({ ...loadLocales()["en-US"], bogus: "x" });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "bogus")).toBe(true);
  });
});

describe("createI18n", () => {
  const locales = loadLocales();

  it("defaults to en-US and resolves nested keys", () => {
    const i18n = createI18n(locales);
    expect(i18n.language).toBe("en-US");
    expect(i18n.t("app.name")).toBe("Mischief");
    expect(i18n.t("tray.quit")).toBe("Quit Mischief");
  });

  it("switches language", () => {
    const i18n = createI18n(locales);
    i18n.setLanguage("es");
    expect(i18n.language).toBe("es");
    expect(i18n.t("tray.show")).toBe(locales["es"].tray.show);
  });

  it("ignores unknown languages and stays on the current locale", () => {
    const i18n = createI18n(locales);
    i18n.setLanguage("klingon");
    expect(i18n.language).toBe("en-US");
  });

  it("returns the key when a path is missing", () => {
    const i18n = createI18n(locales);
    expect(i18n.t("tray.nope" as never)).toBe("tray.nope");
  });

  it("interpolates placeholders", () => {
    const i18n = createI18n({
      "en-US": {
        app: { name: "Mischief", tagline: "Hi {name}!" },
        tray: { show: "s", settings: "t", quit: "q" },
        settings: { title: "t", intensity: "i", theme: "h", language: "l", save: "v" },
        creature: { label: "c", statusIdle: "i", statusWandering: "w" },
      },
    });
    expect(i18n.t("app.tagline", { name: "Moiz" })).toBe("Hi Moiz!");
  });

  it("returns the key as a fallback when the base locale is absent", () => {
    const i18n = createI18n({});
    expect(i18n.t("app.name")).toBe("app.name");
  });
});
