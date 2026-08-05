import { parseVersion } from "./version";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
}

export interface Compatibility {
  platforms: string[];
}

export interface ExperienceManifest {
  id: string;
  name: string;
  version: string;
  category: string;
  author: string;
  license: string;
  description: string;
  tags: string[];
  minimumRuntimeVersion: string;
  assets: string[];
  characters: string[];
  animations: string[];
  audio: string[];
  configuration: Record<string, unknown>;
  compatibility: Compatibility;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  license: string;
  description: string;
  sdkVersion: string;
  runtimeVersion: string;
  permissions: string[];
  dependencies: string[];
  entrypoint: string;
  icon: string;
  homepage: string;
  repository: string;
  tags: string[];
}

export interface AnimationDecl {
  fps: number;
  duration: number;
  loop: boolean;
}

export interface CharacterManifest {
  id: string;
  species: string;
  displayName: string;
  author: string;
  animations: Record<string, AnimationDecl>;
  behavior: { weightedDecision: boolean } & Record<string, number | boolean>;
  personality: string;
  voice: { enabled: boolean };
  sounds: string[];
  speech?: Record<string, string[]>;
}

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WEIGHT_FIELD = /^[a-zA-Z][a-zA-Z0-9]*Weight$/;
const SUPPORTED_PLATFORMS = new Set(["windows", "macos", "linux"]);

const EXPERIENCE_KEYS = new Set([
  "id",
  "name",
  "version",
  "category",
  "author",
  "license",
  "description",
  "tags",
  "minimumRuntimeVersion",
  "assets",
  "characters",
  "animations",
  "audio",
  "configuration",
  "compatibility",
]);

const PLUGIN_KEYS = new Set([
  "id",
  "name",
  "version",
  "author",
  "license",
  "description",
  "sdkVersion",
  "runtimeVersion",
  "permissions",
  "dependencies",
  "entrypoint",
  "icon",
  "homepage",
  "repository",
  "tags",
  "documentation",
  "support",
  "issues",
  "changelog",
  "checksum",
  "signature",
]);

const CHARACTER_KEYS = new Set([
  "id",
  "species",
  "displayName",
  "author",
  "animations",
  "behavior",
  "personality",
  "voice",
  "sounds",
  "speech",
]);

const ANIMATION_KEYS = new Set(["fps", "duration", "loop"]);

export function validateExperienceManifest(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const obj = requireRecord(input, "manifest", issues);
  if (obj) {
    rejectUnknownKeys(obj, EXPERIENCE_KEYS, "", issues);
    expectKebabId(obj.id, "id", issues);
    expectNonEmptyString(obj.name, "name", issues);
    expectSemver(obj.version, "version", issues);
    expectNonEmptyString(obj.category, "category", issues);
    expectNonEmptyString(obj.author, "author", issues);
    expectNonEmptyString(obj.license, "license", issues);
    expectNonEmptyString(obj.description, "description", issues);
    expectStringArray(obj.tags, "tags", issues);
    expectSemver(obj.minimumRuntimeVersion, "minimumRuntimeVersion", issues);
    expectStringArray(obj.assets, "assets", issues);
    expectStringArray(obj.characters, "characters", issues);
    expectStringArray(obj.animations, "animations", issues);
    expectStringArray(obj.audio, "audio", issues);
    expectRecord(obj.configuration, "configuration", issues);
    expectCompatibility(obj.compatibility, "compatibility", issues);
  }
  return result(issues);
}

export function validatePluginManifest(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const obj = requireRecord(input, "plugin", issues);
  if (obj) {
    rejectUnknownKeys(obj, PLUGIN_KEYS, "", issues);
    expectKebabId(obj.id, "id", issues);
    expectNonEmptyString(obj.name, "name", issues);
    expectSemver(obj.version, "version", issues);
    expectNonEmptyString(obj.author, "author", issues);
    expectNonEmptyString(obj.license, "license", issues);
    expectNonEmptyString(obj.description, "description", issues);
    expectSemver(obj.sdkVersion, "sdkVersion", issues);
    expectSemver(obj.runtimeVersion, "runtimeVersion", issues);
    expectStringArray(obj.permissions, "permissions", issues);
    expectStringArray(obj.dependencies, "dependencies", issues);
    expectNonEmptyString(obj.entrypoint, "entrypoint", issues);
    expectNonEmptyString(obj.icon, "icon", issues);
    expectNonEmptyString(obj.homepage, "homepage", issues);
    expectNonEmptyString(obj.repository, "repository", issues);
    expectStringArray(obj.tags, "tags", issues);
    for (const key of [
      "documentation",
      "support",
      "issues",
      "changelog",
      "checksum",
      "signature",
    ]) {
      if (obj[key] !== undefined) expectNonEmptyString(obj[key], key, issues);
    }
  }
  return result(issues);
}

export function validateCharacterManifest(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const obj = requireRecord(input, "character", issues);
  if (obj) {
    rejectUnknownKeys(obj, CHARACTER_KEYS, "", issues);
    expectKebabId(obj.id, "id", issues);
    expectNonEmptyString(obj.species, "species", issues);
    expectNonEmptyString(obj.displayName, "displayName", issues);
    expectNonEmptyString(obj.author, "author", issues);
    expectAnimations(obj.animations, "animations", issues);
    expectBehavior(obj.behavior, "behavior", issues);
    expectNonEmptyString(obj.personality, "personality", issues);
    expectVoice(obj.voice, "voice", issues);
    expectStringArray(obj.sounds, "sounds", issues);
    if (obj.speech !== undefined) {
      const speech = requireRecord(obj.speech, "speech", issues);
      if (speech) {
        for (const [key, value] of Object.entries(speech)) {
          if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
            issues.push({
              path: `speech.${key}`,
              message: "Expected an array of strings",
            });
          }
        }
      }
    }
  }
  return result(issues);
}

export function parseExperienceManifest(input: unknown): ExperienceManifest | null {
  return validateExperienceManifest(input).ok ? (input as ExperienceManifest) : null;
}

export function parsePluginManifest(input: unknown): PluginManifest | null {
  return validatePluginManifest(input).ok ? (input as PluginManifest) : null;
}

export function parseCharacterManifest(input: unknown): CharacterManifest | null {
  return validateCharacterManifest(input).ok ? (input as CharacterManifest) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

function result(errors: ValidationIssue[]): ValidationResult {
  return { ok: errors.length === 0, errors };
}

function requireRecord(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  issues.push({ path, message: `Expected an object, got ${describe(value)}` });
  return null;
}

function expectNonEmptyString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push({ path, message: `Expected a non-empty string, got ${describe(value)}` });
  }
}

function expectStringArray(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    issues.push({ path, message: `Expected an array of strings, got ${describe(value)}` });
  }
}

function expectRecord(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): Record<string, unknown> | null {
  return requireRecord(value, path, issues);
}

function expectBoolean(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "boolean") {
    issues.push({ path, message: `Expected a boolean, got ${describe(value)}` });
  }
}

function expectNumber(value: unknown, path: string, issues: ValidationIssue[], min?: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || (min !== undefined && value < min)) {
    issues.push({
      path,
      message: `Expected a finite number${min !== undefined ? ` >= ${min}` : ""}, got ${describe(value)}`,
    });
  }
}

function expectSemver(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string") {
    issues.push({ path, message: `Expected a semantic version string, got ${describe(value)}` });
    return;
  }
  try {
    parseVersion(value);
  } catch {
    issues.push({ path, message: `"${value}" is not a valid semantic version` });
  }
}

function expectKebabId(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string") {
    issues.push({ path, message: `Expected a kebab-case id string, got ${describe(value)}` });
    return;
  }
  if (!KEBAB_CASE.test(value)) {
    issues.push({
      path,
      message: `"${value}" is not kebab-case (lowercase letters, digits, and hyphens)`,
    });
  }
}

function rejectUnknownKeys(
  obj: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  issues: ValidationIssue[]
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      issues.push({ path: path ? `${path}.${key}` : key, message: `Unknown field "${key}"` });
    }
  }
}

function expectCompatibility(value: unknown, path: string, issues: ValidationIssue[]): void {
  const compat = requireRecord(value, path, issues);
  if (!compat) return;
  rejectUnknownKeys(compat, new Set(["platforms"]), path, issues);
  if (!Array.isArray(compat.platforms) || compat.platforms.length === 0) {
    issues.push({ path: `${path}.platforms`, message: "Expected a non-empty array of platforms" });
    return;
  }
  for (const platform of compat.platforms) {
    if (typeof platform !== "string" || !SUPPORTED_PLATFORMS.has(platform)) {
      issues.push({
        path: `${path}.platforms`,
        message: `"${String(platform)}" is not a supported platform (windows, macos, linux)`,
      });
    }
  }
}

function expectAnimations(value: unknown, path: string, issues: ValidationIssue[]): void {
  const animations = requireRecord(value, path, issues);
  if (!animations) return;
  for (const [name, decl] of Object.entries(animations)) {
    const declPath = `${path}.${name}`;
    const anim = requireRecord(decl, declPath, issues);
    if (!anim) continue;
    rejectUnknownKeys(anim, ANIMATION_KEYS, declPath, issues);
    expectNumber(anim.fps, `${declPath}.fps`, issues, 1);
    expectNumber(anim.duration, `${declPath}.duration`, issues, 1);
    expectBoolean(anim.loop, `${declPath}.loop`, issues);
  }
}

function expectBehavior(value: unknown, path: string, issues: ValidationIssue[]): void {
  const behavior = requireRecord(value, path, issues);
  if (!behavior) return;
  expectBoolean(behavior.weightedDecision, `${path}.weightedDecision`, issues);
  for (const key of Object.keys(behavior)) {
    if (key === "weightedDecision") continue;
    if (!WEIGHT_FIELD.test(key)) {
      issues.push({
        path: `${path}.${key}`,
        message: `Unknown behavior field "${key}" (expected "weightedDecision" or "<behavior>Weight")`,
      });
      continue;
    }
    expectNumber(behavior[key], `${path}.${key}`, issues, 0);
  }
}

function expectVoice(value: unknown, path: string, issues: ValidationIssue[]): void {
  const voice = requireRecord(value, path, issues);
  if (!voice) return;
  rejectUnknownKeys(voice, new Set(["enabled"]), path, issues);
  expectBoolean(voice.enabled, `${path}.enabled`, issues);
}
