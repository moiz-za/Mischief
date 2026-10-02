import enUS from "./en-US.json";

export type LocaleDictionary = Record<string, string>;
export type LocaleKey = keyof typeof enUS;
export type LocaleVariables = Record<string, string | number>;

export const DEFAULT_LOCALE = "en-US";

const dictionaries: Record<string, LocaleDictionary> = {
  [DEFAULT_LOCALE]: enUS,
};

let activeLocale: string = DEFAULT_LOCALE;

/** Registers (or replaces) the dictionary for a locale. */
export function registerLocale(locale: string, dictionary: LocaleDictionary): void {
  dictionaries[locale] = { ...dictionary };
}

/** Locales that currently have a registered dictionary, including the default. */
export function availableLocales(): string[] {
  return Object.keys(dictionaries);
}

/** Selects the active locale, falling back to the default when unknown. */
export function setLocale(locale: string): void {
  activeLocale = locale in dictionaries ? locale : DEFAULT_LOCALE;
}

/** The currently active locale. */
export function getLocale(): string {
  return activeLocale;
}

function interpolate(template: string, variables?: LocaleVariables): string {
  if (!variables) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : placeholder
  );
}

/**
 * Looks up a UI string for the active locale, falling back to the default
 * (en-US) dictionary and then to the key itself. `{name}` placeholders are
 * substituted from `variables`.
 */
export function t(key: LocaleKey, variables?: LocaleVariables): string {
  const template = dictionaries[activeLocale]?.[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  return interpolate(template, variables);
}
