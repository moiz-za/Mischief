import { afterEach, describe, expect, it } from "vitest";
import enUS from "../src/domain/locale/en-US.json";
import {
  DEFAULT_LOCALE,
  availableLocales,
  getLocale,
  registerLocale,
  setLocale,
  t,
  type LocaleKey,
} from "../src/domain/locale";

afterEach(() => {
  setLocale(DEFAULT_LOCALE);
});

describe("t", () => {
  it("returns the value for a known key", () => {
    expect(t("tray.show")).toBe("Show Mischief");
    expect(t("window.settings")).toBe("Mischief Settings");
  });

  it("falls back to English for a key missing from the active locale", () => {
    registerLocale("xx-XX", { "tray.quit": "Quitter" });
    setLocale("xx-XX");
    expect(t("tray.quit")).toBe("Quitter");
    expect(t("tray.show")).toBe(enUS["tray.show"]);
  });

  it("interpolates {placeholders} from the variables argument", () => {
    expect(t("tray.tooltip", { name: "Kumo", species: "cat" })).toBe("Kumo (cat) - Mischief");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(t("tray.tooltip", { name: "Kumo" })).toBe("Kumo ({species}) - Mischief");
  });

  it("returns the key itself when it is missing from every dictionary", () => {
    const unknownKey = "does.not.exist" as unknown as LocaleKey;
    expect(t(unknownKey)).toBe("does.not.exist");
  });
});

describe("setLocale", () => {
  it("falls back to the default locale for an unknown one", () => {
    setLocale("zz-ZZ");
    expect(getLocale()).toBe(DEFAULT_LOCALE);
  });
});

describe("registerLocale", () => {
  it("lists registered locales including the default", () => {
    registerLocale("yy-YY", { "tray.quit": "Bye" });
    expect(availableLocales()).toContain(DEFAULT_LOCALE);
    expect(availableLocales()).toContain("yy-YY");
  });
});
