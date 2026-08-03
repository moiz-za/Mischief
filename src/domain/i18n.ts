import type { ValidationIssue } from "./manifest";

export interface Messages {
  app: { name: string; tagline: string };
  tray: { show: string; settings: string; quit: string };
  settings: { title: string; intensity: string; theme: string; language: string; save: string };
  creature: { label: string; statusIdle: string; statusWandering: string };
}

export type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? K | `${K}.${NestedKeyOf<T[K]>}` : never }[keyof T]
  : never;

export type MessageKey = NestedKeyOf<Messages>;

export type LocaleMap = Record<string, Messages>;

export interface I18n {
  language: string;
  t(key: MessageKey, params?: Record<string, string | number>): string;
  setLanguage(language: string): void;
}

const MESSAGE_TREE: Messages = {
  app: { name: "", tagline: "" },
  tray: { show: "", settings: "", quit: "" },
  settings: { title: "", intensity: "", theme: "", language: "", save: "" },
  creature: { label: "", statusIdle: "", statusWandering: "" },
};

export function createI18n(locales: LocaleMap, fallbackLanguage = "en-US"): I18n {
  const knownLanguages = Object.keys(locales);
  let currentLanguage = knownLanguages.includes(fallbackLanguage)
    ? fallbackLanguage
    : (knownLanguages[0] ?? fallbackLanguage);

  function resolveMessages(): Messages | undefined {
    return locales[currentLanguage] ?? locales[fallbackLanguage];
  }

  function t(key: MessageKey, params?: Record<string, string | number>): string {
    const messages = resolveMessages();
    if (!messages) return key;
    const value = readPath(messages, key);
    if (value === undefined) return key;
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match
      );
    }
    return value;
  }

  return {
    get language() {
      return currentLanguage;
    },
    t,
    setLanguage(lang: string) {
      if (locales[lang]) {
        currentLanguage = lang;
      }
    },
  };
}

/**
 * Verify a locale object has exactly the same key tree as the base Messages
 * shape (spec: localization files are isolated; keys must match exactly).
 */
export function validateLocaleShape(messages: unknown): { ok: boolean; errors: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  if (!isRecord(messages)) {
    return { ok: false, errors: [{ path: "locale", message: "Expected a locale object" }] };
  }
  validateShape(messages, MESSAGE_TREE, "", errors);
  return { ok: errors.length === 0, errors };
}

function readPath(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateShape(
  actual: unknown,
  template: unknown,
  path: string,
  errors: ValidationIssue[]
): void {
  if (!isRecord(actual)) {
    errors.push({ path: path || "locale", message: `Expected an object at "${path || "locale"}"` });
    return;
  }
  const templateRecord = template as Record<string, unknown>;
  for (const key of Object.keys(templateRecord)) {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in actual)) {
      errors.push({ path: childPath, message: `Missing localization key` });
      continue;
    }
    if (isRecord(templateRecord[key])) {
      validateShape(actual[key], templateRecord[key], childPath, errors);
    } else if (typeof actual[key] !== "string") {
      errors.push({ path: childPath, message: "Expected a string" });
    }
  }
  for (const key of Object.keys(actual)) {
    if (!(key in templateRecord)) {
      errors.push({
        path: path ? `${path}.${key}` : key,
        message: `Unknown localization key "${key}"`,
      });
    }
  }
}
