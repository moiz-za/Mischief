import type { ValidationIssue } from "./manifest";
import { parseThemeManifest, validateThemeManifest } from "./manifest";

export interface ThemeTokens {
  [token: string]: string;
}

export interface Theme {
  id: string;
  name: string;
  author: string;
  tokens: ThemeTokens;
}

export interface ThemeLoadResult {
  theme: Theme | null;
  errors: ValidationIssue[];
}

export function loadTheme(text: string): ThemeLoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      theme: null,
      errors: [{ path: "theme", message: `Invalid JSON: ${(error as Error).message}` }],
    };
  }
  const theme = parseThemeManifest(parsed);
  if (!theme) {
    return { theme: null, errors: validateThemeManifest(parsed).errors };
  }
  return { theme, errors: [] };
}

/**
 * Map theme tokens to CSS custom properties for runtime application
 * (e.g. `{ background: "#0f172a" }` -> `{ "--mischief-background": "#0f172a" }`).
 */
export function themeToCssVariables(tokens: ThemeTokens): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [name, value] of Object.entries(tokens)) {
    variables[`--mischief-${name}`] = value;
  }
  return variables;
}
