import { INTENSITIES, PERSONALITIES, type Intensity, type Personality } from "./behavior";

/**
 * Persistent user configuration (intensity, personality, and overlay toggles).
 * Values are sanitized on load so corrupt or hand-edited settings never crash
 * the runtime — invalid fields fall back to defaults (spec §85 state machine:
 * no silent failure).
 */
export interface AppConfig {
  /** Installed companion pack to show (fallback: first valid pack). */
  companionId: string;
  intensity: Intensity;
  personality: Personality;
  interactive: boolean;
  followCursor: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  companionId: "cat-companion",
  intensity: "normal",
  personality: "curious",
  interactive: false,
  followCursor: true,
};

export function sanitizeConfig(input: unknown): AppConfig {
  const partial = isRecord(input) ? input : {};
  return {
    companionId:
      typeof partial.companionId === "string" && partial.companionId.length > 0
        ? partial.companionId
        : DEFAULT_CONFIG.companionId,
    intensity: isIntensity(partial.intensity) ? partial.intensity : DEFAULT_CONFIG.intensity,
    personality: isPersonality(partial.personality)
      ? partial.personality
      : DEFAULT_CONFIG.personality,
    interactive:
      typeof partial.interactive === "boolean" ? partial.interactive : DEFAULT_CONFIG.interactive,
    followCursor:
      typeof partial.followCursor === "boolean"
        ? partial.followCursor
        : DEFAULT_CONFIG.followCursor,
  };
}

export function parseConfig(text: string): AppConfig {
  try {
    return sanitizeConfig(JSON.parse(text));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function serializeConfig(config: AppConfig): string {
  return JSON.stringify(config, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIntensity(value: unknown): value is Intensity {
  return typeof value === "string" && (INTENSITIES as string[]).includes(value);
}

function isPersonality(value: unknown): value is Personality {
  return typeof value === "string" && (PERSONALITIES as string[]).includes(value);
}
