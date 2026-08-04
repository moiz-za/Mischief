import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  powerMonitor,
  protocol,
  screen,
  shell,
  Tray,
} from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { BehaviorEngine, type BehaviorDef, type ContextSignals } from "./domain/behavior";
import {
  buildCustomCharacter,
  buildCustomPackManifest,
  buildImportedCharacter,
  buildImportedPackManifest,
  companionMetaFromConfiguration,
  displayNameFromFile,
  isCustomImage,
  slugify,
  storedImageName,
} from "./domain/custom-companion";
import { EventBus } from "./domain/events";
import { encodeGif, type RawFrame } from "./domain/gif";
import {
  DEFAULT_CONFIG,
  parseConfig,
  sanitizeConfig,
  serializeConfig,
  type AppConfig,
} from "./domain/config";
import type { CharacterManifest } from "./domain/manifest";
import { followPosition } from "./domain/overlay";
import { loadExperiencePack, type PackReader } from "./domain/pack";
import {
  applyTrim,
  cutout,
  foregroundRatio,
  premultiplyCopy,
  rgbaToBgra,
  type Raster,
  type Stroke,
} from "./domain/segmentation";
import { sanitizeCompanionMeta, type CompanionMeta, type FaceAnchor } from "./domain/procedural";
import { pickReaction, type Signal } from "./domain/reactions";
import { createTicker, type Ticker } from "./domain/scheduler";
import { isSafeSpritePath, pickSprite } from "./domain/sprite";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "mischief-asset",
    privileges: { standard: true, secure: true, corsEnabled: false, supportFetchAPI: true },
  },
]);

let overlay: BrowserWindow | null = null;
let bubbleWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;
let followEnabled = true;
let followPausedByBehavior = false;
let followInterval: NodeJS.Timeout | null = null;
let companion: LoadedCompanion | null = null;
let behaviorEngine: BehaviorEngine;
let behaviorTicker: Ticker | null = null;
let interactive = false;
/** Tracks whether the overlay window currently captures mouse events (pixel-aware hit test). */
let overlayHitActive = false;
/** Activity-burst detection: consecutive polls where idle < 1 s. */
let consecutiveLowIdle = 0;
let lastActivityBurstAt: number | null = null;
let activityPollInterval: NodeJS.Timeout | null = null;
let lastPetAt: number | null = null;
let currentBehavior: BehaviorDef | null = null;
let wanderTimer: NodeJS.Timeout | null = null;
let wandering = false;
let config: AppConfig = { ...DEFAULT_CONFIG };

const events = new EventBus();

const OVERLAY_SIZE = 96;
const CURSOR_GAP = 10;
const EXPERIENCE_DIR = path.join(__dirname, "renderer", "experiences");
const PACK_ORDER = [
  "zen-companion",
  "kumo-companion",
  "astra-companion",
  "barnaby-companion",
  "pippin-companion",
  "pocus-companion",
  "byte-companion",
  "nami-companion",
  "pixel-rex-companion",
  "lumina-companion",
  "mochi-companion",
  "voxel-companion",
  "bramble-companion",
  "sola-companion",
  "cat-companion",
  "ghost-companion",
  "robot-companion",
  "pixel-buddy",
];
const CUSTOM_COMPANIONS_DIR = "custom-companions";

interface CompanionDescriptor {
  packId: string;
  displayName: string;
  species: string;
  /** Sprite asset path inside the pack, e.g. "images/whiskers.svg". */
  spritePath: string;
  character: CharacterManifest;
  /** True for user-added companions (stored in userData, removable). */
  custom: boolean;
  /** Companion metadata (cutout + anchor); defaults for regular packs. */
  meta: CompanionMeta;
}

interface LoadedCompanion extends CompanionDescriptor {
  /** Overlay URL: mischief-asset://<packId>/<spritePath>. */
  sprite: string;
}

function customCompanionsDir(): string {
  return path.join(app.getPath("userData"), CUSTOM_COMPANIONS_DIR);
}

function createDirReader(baseDir: string): PackReader {
  return {
    exists(relative) {
      return fs.existsSync(path.join(baseDir, relative));
    },
    readText(relative) {
      try {
        return fs.readFileSync(path.join(baseDir, relative), "utf8");
      } catch {
        return null;
      }
    },
  };
}

function tryLoadCompanionDir(dir: string, packId: string, custom: boolean): CompanionDescriptor | null {
  const result = loadExperiencePack(createDirReader(dir));
  if (!result.pack) return null;
  const character = result.pack.characters[0];
  if (!character) return null;
  const spritePath = pickSprite(result.pack.manifest.assets);
  if (!spritePath) return null;
  return {
    packId,
    displayName: character.character.displayName,
    species: character.character.species,
    spritePath,
    character: character.character,
    custom,
    meta: companionMetaFromConfiguration(result.pack.manifest.configuration),
  };
}

function enumerateCompanions(): CompanionDescriptor[] {
  const companions: CompanionDescriptor[] = [];
  for (const packId of PACK_ORDER) {
    const dir = path.join(EXPERIENCE_DIR, packId);
    if (!fs.existsSync(dir)) continue;
    const descriptor = tryLoadCompanionDir(dir, packId, false);
    if (descriptor) companions.push(descriptor);
  }
  const customDir = customCompanionsDir();
  if (fs.existsSync(customDir)) {
    for (const packId of fs.readdirSync(customDir)) {
      const dir = path.join(customDir, packId);
      if (!fs.statSync(dir).isDirectory()) continue;
      const descriptor = tryLoadCompanionDir(dir, packId, true);
      if (descriptor) companions.push(descriptor);
    }
  }
  return companions;
}

function loadCompanion(packId?: string): LoadedCompanion | null {
  const companions = enumerateCompanions();
  const chosen = (packId && companions.find((c) => c.packId === packId)) || companions[0];
  if (!chosen) return null;
  return { ...chosen, sprite: `mischief-asset://${chosen.packId}/${chosen.spritePath}` };
}

// --- Custom ("add your own image") companions ------------------------------

function resolvePackAsset(packId: string, rel: string): string | null {
  if (!isSafeSpritePath(rel)) return null;
  const roots = [path.join(EXPERIENCE_DIR, packId), path.join(customCompanionsDir(), packId)];
  for (const root of roots) {
    const file = path.resolve(root, rel);
    if (!file.startsWith(path.resolve(root) + path.sep)) continue;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

function registerAssetProtocol(): void {
  protocol.handle("mischief-asset", (request) => {
    const url = new URL(request.url);
    const packId = url.hostname;
    if (!/^[a-zA-Z0-9.-]+$/.test(packId)) return new Response("bad pack id", { status: 400 });
    const file = resolvePackAsset(packId, url.pathname.replace(/^\/+/, ""));
    if (!file) return new Response("not found", { status: 404 });
    return new Response(fs.readFileSync(file), {
      headers: { "content-type": mimeFor(file) },
    });
  });
}

function uniqueCustomId(baseId: string): string {
  let id = baseId;
  let n = 2;
  while (fs.existsSync(path.join(customCompanionsDir(), id))) {
    id = `${baseId}-${n}`;
    n++;
  }
  return id;
}

function ensureCustomCompanion(sourcePath: string): CompanionDescriptor | null {
  const baseName = path.basename(sourcePath);
  if (!isCustomImage(baseName)) return null;
  const id = uniqueCustomId(slugify(baseName));
  const dir = path.join(customCompanionsDir(), id);
  fs.mkdirSync(path.join(dir, "images"), { recursive: true });
  fs.mkdirSync(path.join(dir, "characters"), { recursive: true });

  const imageName = storedImageName(id, baseName);
  const displayName = displayNameFromFile(baseName);
  fs.copyFileSync(sourcePath, path.join(dir, "images", imageName));
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify(buildCustomPackManifest(id, displayName, imageName), null, 2)
  );
  fs.writeFileSync(
    path.join(dir, "characters", `${id}.json`),
    JSON.stringify(buildCustomCharacter(id, displayName), null, 2)
  );

  const descriptor = tryLoadCompanionDir(dir, id, true);
  if (!descriptor) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return descriptor;
}

function removeCustomCompanion(packId: string): boolean {
  const dir = path.join(customCompanionsDir(), packId);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  if (companion?.packId === packId) {
    swapCompanion(packId);
  }
  return true;
}

function companionListPayload(): Array<{
  packId: string;
  displayName: string;
  species: string;
  sprite: string;
  custom: boolean;
  meta: CompanionMeta;
}> {
  return enumerateCompanions().map(({ packId, displayName, species, spritePath, custom, meta }) => ({
    packId,
    displayName,
    species,
    sprite: `mischief-asset://${packId}/${spritePath}`,
    custom,
    meta,
  }));
}

// --- Custom image import pipeline --------------------------------------------
//
// Decode/encode is done with Electron's nativeImage (pure-JS, no native deps);
// the pixel math (cutout/trim) runs in the pure domain modules above. Any
// image — a pet, a person, a logo, a plant — can be imported; animated GIFs
// skip the cutout editor and are added as-is.

const IMPORT_MAX_DIMENSION = 512;
const IMPORT_CUTOUT_MIN_COMPONENT = 48;
/** Below this kept ratio the cutout removed (almost) everything: keep original. */
const IMPORT_CUTOUT_FALLBACK_RATIO = 0.08;
const MAX_EDITOR_STROKES = 2000;

interface PendingImport {
  sourcePath: string;
  raster: Raster;
  baseName: string;
}

interface EditorRequest {
  /** Run background removal at all (else only brush trims apply). */
  cut: boolean;
  tolerance: number;
  keep: Stroke[];
  remove: Stroke[];
  face: FaceAnchor | null;
}

let pendingImport: PendingImport | null = null;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const clamp01 = (v: number): number => clamp(v, 0, 1);

/** Decodes an image file into a straight-alpha RGBA raster, capped at 512px. */
function decodeRaster(file: string): Raster | null {
  let image = nativeImage.createFromPath(file);
  if (image.isEmpty()) return null;
  const size = image.getSize();
  if (size.width > IMPORT_MAX_DIMENSION || size.height > IMPORT_MAX_DIMENSION) {
    const scale = IMPORT_MAX_DIMENSION / Math.max(size.width, size.height);
    image = image.resize({
      width: Math.max(1, Math.round(size.width * scale)),
      height: Math.max(1, Math.round(size.height * scale)),
    });
  }
  const { width, height } = image.getSize();
  const bgra = image.toBitmap();
  if (bgra.length !== width * height * 4) return null;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const a = bgra[i * 4 + 3];
    const o = i * 4;
    if (a === 0 || a === 255) {
      rgba[o] = bgra[o + 2];
      rgba[o + 1] = bgra[o + 1];
      rgba[o + 2] = bgra[o];
      rgba[o + 3] = a;
    } else {
      const f = 255 / a;
      rgba[o] = Math.round(Math.min(255, bgra[o + 2] * f));
      rgba[o + 1] = Math.round(Math.min(255, bgra[o + 1] * f));
      rgba[o + 2] = Math.round(Math.min(255, bgra[o] * f));
      rgba[o + 3] = a;
    }
  }
  return { width, height, rgba };
}

/** Encodes a straight-alpha RGBA raster to a PNG buffer. */
function encodeRasterPng(raster: Raster): Buffer | null {
  const premultiplied = premultiplyCopy(raster);
  const bgra = rgbaToBgra(premultiplied);
  const image = nativeImage.createFromBuffer(Buffer.from(bgra.buffer, bgra.byteOffset, bgra.byteLength), {
    width: raster.width,
    height: raster.height,
  });
  if (image.isEmpty()) return null;
  return image.toPNG();
}

function dataUrl(png: Buffer): string {
  return `data:image/png;base64,${png.toString("base64")}`;
}

function sanitizeStrokes(input: unknown): Stroke[] {
  if (!Array.isArray(input)) return [];
  const strokes: Stroke[] = [];
  for (const entry of input) {
    if (strokes.length >= MAX_EDITOR_STROKES) break;
    if (typeof entry !== "object" || entry === null) continue;
    const s = entry as Record<string, unknown>;
    const x = typeof s.x === "number" ? clamp01(s.x) : 0;
    const y = typeof s.y === "number" ? clamp01(s.y) : 0;
    const radius = typeof s.radius === "number" ? clamp(s.radius, 0.01, 0.5) : 0.02;
    strokes.push({ x, y, radius });
  }
  return strokes;
}

function sanitizeEditorRequest(payload: unknown): EditorRequest | null {
  if (typeof payload !== "object" || payload === null) return null;
  const raw = payload as Record<string, unknown>;
  const cut = raw.cut !== false;
  const tolerance = typeof raw.tolerance === "number" ? clamp(raw.tolerance, 0, 255) : 30;
  const keep = sanitizeStrokes(raw.keep);
  const remove = sanitizeStrokes(raw.remove);
  let face: FaceAnchor | null = null;
  const faceRaw = raw.face;
  if (typeof faceRaw === "object" && faceRaw !== null) {
    const f = faceRaw as Record<string, unknown>;
    if (typeof f.x === "number" && typeof f.y === "number") {
      face = { x: clamp01(f.x), y: clamp01(f.y) };
    }
  }
  return { cut, tolerance, keep, remove, face };
}

/** Runs cutout + trim for a live editor preview. */
function processImportRaster(raster: Raster, request: EditorRequest): Raster {
  if (!request.cut) return applyTrim(raster, request.keep, request.remove);
  const cut = cutout(raster, {
    tolerance: request.tolerance,
    minComponentPixels: IMPORT_CUTOUT_MIN_COMPONENT,
  });
  return applyTrim(cut, request.keep, request.remove);
}

/** Writes a validated imported-companion pack to userData and returns its descriptor. */
function ensureImportedCompanion(
  sourcePath: string,
  png: Buffer,
  meta: CompanionMeta
): CompanionDescriptor | null {
  const baseName = path.basename(sourcePath);
  if (!isCustomImage(baseName)) return null;
  const id = uniqueCustomId(slugify(baseName));
  const dir = path.join(customCompanionsDir(), id);
  fs.mkdirSync(path.join(dir, "images"), { recursive: true });
  fs.mkdirSync(path.join(dir, "characters"), { recursive: true });

  const imageName = `${id}.png`;
  const displayName = displayNameFromFile(baseName);
  fs.writeFileSync(path.join(dir, "images", imageName), png);
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify(buildImportedPackManifest(id, displayName, imageName, meta), null, 2)
  );
  fs.writeFileSync(
    path.join(dir, "characters", `${id}.json`),
    JSON.stringify(buildImportedCharacter(id, displayName), null, 2)
  );

  const descriptor = tryLoadCompanionDir(dir, id, true);
  if (!descriptor) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return descriptor;
}

function createImportEditorWindow(): BrowserWindow {
  const editor = new BrowserWindow({
    width: 680,
    height: 720,
    resizable: false,
    title: "Import Companion",
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  editor.setMenuBarVisibility(false);
  hardenWebContents(editor);
  editor.loadFile(path.join(__dirname, "renderer", "import-editor.html"));
  return editor;
}

function hardenWebContents(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
}

function createOverlay(): void {
  const { workArea } = screen.getPrimaryDisplay();
  const margin = 12;

  overlay = new BrowserWindow({
    x: workArea.x + workArea.width - OVERLAY_SIZE - margin,
    y: workArea.y + workArea.height - OVERLAY_SIZE - margin,
    width: OVERLAY_SIZE,
    height: OVERLAY_SIZE,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  hardenWebContents(overlay);
  overlay.loadFile(path.join(__dirname, "renderer", "overlay.html"), {
    query: companion && companion.sprite ? { sprite: companion.sprite } : {},
  });
  overlay.webContents.once("did-finish-load", () => {
    if (overlay && !overlay.isDestroyed()) {
      overlay.webContents.send("mischief:interactive", interactive);
    }
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Always click-through, but forward mouse-move events so the overlay can
  // pixel-hit-test the cursor and only capture input over the character body.
  overlay.setIgnoreMouseEvents(true, { forward: true });

  overlay.on("closed", () => {
    overlay = null;
  });

   events.emit("CharacterSpawned", { characterId: companion?.packId ?? "builtin" });
}

// --- Reaction bubbles -------------------------------------------------------

function createBubbleWindow(): void {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) return;
  bubbleWindow = new BrowserWindow({
    width: 220,
    height: 80,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  hardenWebContents(bubbleWindow);
  bubbleWindow.loadFile(path.join(__dirname, "renderer", "bubble.html"));
  bubbleWindow.setIgnoreMouseEvents(true);
  bubbleWindow.setAlwaysOnTop(true, "screen-saver");
  bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  bubbleWindow.on("closed", () => {
    bubbleWindow = null;
  });
}

function positionBubble(): void {
  if (!bubbleWindow || bubbleWindow.isDestroyed() || !overlay || overlay.isDestroyed()) return;
  const [bx, by] = overlay.getPosition();
  const [bw, bh] = overlay.getSize();
  const bubbleW = 220;
  const bubbleH = 80;
  const x = bx + Math.round((bw - bubbleW) / 2);
  const y = by - bubbleH - 10;
  bubbleWindow.setPosition(Math.max(0, x), Math.max(0, y));
}

function showBubble(text: string, durationMs: number): void {
  createBubbleWindow();
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    positionBubble();
    bubbleWindow.show();
    bubbleWindow.webContents.send("mischief:bubble", { text, durationMs });
  }
}

function emitReaction(signal: Signal): void {
  if (!interactive) return;
  const reaction = pickReaction(signal);
  if (!reaction.text) return;
  showBubble(reaction.text, reaction.durationMs);
}

function detectActivityBurst(): void {
  const idleSeconds = powerMonitor.getSystemIdleTime();
  if (idleSeconds < 1) {
    consecutiveLowIdle++;
    if (consecutiveLowIdle >= 3) {
      const now = Date.now();
      if (lastActivityBurstAt === null || now - lastActivityBurstAt > 8000) {
        lastActivityBurstAt = now;
        emitReaction({ kind: "activity-burst" });
      }
    }
  } else {
    consecutiveLowIdle = 0;
  }
}

function followCursorTick(): void {
  if (!overlay || overlay.isDestroyed()) return;
  const point = screen.getCursorScreenPoint();
  const { workArea } = screen.getDisplayNearestPoint(point);
  const position = followPosition(point, workArea, {
    size: OVERLAY_SIZE,
    cursorGap: CURSOR_GAP,
  });
  overlay.setPosition(position.x, position.y);
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    positionBubble();
  }
}

function applyFollow(): void {
  if (followInterval) {
    clearInterval(followInterval);
    followInterval = null;
  }
  if (followEnabled && !followPausedByBehavior) {
    followInterval = setInterval(followCursorTick, 33);
  }
}

function setFollowEnabled(enabled: boolean): void {
  followEnabled = enabled;
  applyFollow();
}

function pauseFollow(): void {
  followPausedByBehavior = true;
  applyFollow();
}

function resumeFollow(): void {
  followPausedByBehavior = false;
  applyFollow();
}

// --- Behavior engine wiring -------------------------------------------------

function collectSignals(): ContextSignals {
  const idleSeconds = powerMonitor.getSystemIdleTime();
  return {
    now: Date.now(),
    hour: new Date().getHours(),
    idleSeconds,
    userJustActive: idleSeconds < 2,
    pettedMsAgo: lastPetAt === null ? null : Date.now() - lastPetAt,
    overlayBusy: wandering,
    interactive,
  };
}

function behaviorTick(): void {
  if (!overlay || overlay.isDestroyed()) return;
  const selection = behaviorEngine.tick(collectSignals());
  if (!selection) return;
  if (currentBehavior === selection.behavior) return;
  currentBehavior = selection.behavior;
  console.log(`[Mischief] Behavior: ${selection.behavior.anim}`);
  applyBehaviorChange(selection.behavior);
  sendBehavior(selection.behavior);
}

function applyBehaviorChange(behavior: BehaviorDef): void {
  if (behavior.moves && !wandering) {
    wander();
  } else if (behavior.id === "sleep") {
    stopWander();
    pauseFollow();
    parkInCorner();
    events.emit("CharacterSleeping", { characterId: companion?.packId ?? "builtin" });
  } else {
    stopWander();
    resumeFollow();
  }
  events.emit("CharacterMoved", {
    characterId: companion?.packId ?? "builtin",
    x: overlay?.getPosition()[0] ?? 0,
    y: overlay?.getPosition()[1] ?? 0,
  });
}

function sendBehavior(behavior: BehaviorDef): void {
  if (!overlay || overlay.isDestroyed()) return;
  overlay.webContents.send("mischief:behavior", {
    anim: behavior.anim,
    mood: behavior.mood,
  });
}

function wander(): void {
  if (!overlay || overlay.isDestroyed()) return;
  pauseFollow();
  wandering = true;
  const [startX, startY] = overlay.getPosition();
  const { workArea } = screen.getDisplayNearestPoint({ x: startX, y: startY });
  const margin = 8;
  const minX = workArea.x + margin;
  const minY = workArea.y + margin;
  const maxX = workArea.x + workArea.width - OVERLAY_SIZE - margin;
  const maxY = workArea.y + workArea.height - OVERLAY_SIZE - margin;
  const targetX = Math.round(minX + Math.random() * Math.max(0, maxX - minX));
  const targetY = Math.round(minY + Math.random() * Math.max(0, maxY - minY));
  const durationMs = Math.min(8000, Math.max(2500, (currentBehavior?.maxSeconds ?? 8) * 1000));
  const steps = Math.max(2, Math.ceil(durationMs / 33));
  let step = 0;

  if (wanderTimer) clearInterval(wanderTimer);
  wanderTimer = setInterval(() => {
    if (!overlay || overlay.isDestroyed()) {
      stopWander();
      return;
    }
    step++;
    const t = Math.min(1, step / steps);
    const ease = 1 - Math.pow(1 - t, 3);
    overlay.setPosition(
      Math.round(startX + (targetX - startX) * ease),
      Math.round(startY + (targetY - startY) * ease)
    );
    if (step >= steps) {
      stopWander();
      resumeFollow();
    }
  }, 33);
}

function stopWander(): void {
  if (wanderTimer) {
    clearInterval(wanderTimer);
    wanderTimer = null;
  }
  wandering = false;
}

function parkInCorner(): void {
  if (!overlay || overlay.isDestroyed()) return;
  const { workArea } = screen.getPrimaryDisplay();
  const margin = 12;
  overlay.setPosition(
    workArea.x + workArea.width - OVERLAY_SIZE - margin,
    workArea.y + workArea.height - OVERLAY_SIZE - margin
  );
}

// --- Moment capture ---------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function captureGif(): Promise<void> {
  if (!overlay || overlay.isDestroyed()) return;
  const frames: RawFrame[] = [];
  let frameWidth = OVERLAY_SIZE;
  let frameHeight = OVERLAY_SIZE;
  const frameCount = 12;
  for (let i = 0; i < frameCount; i++) {
    if (!overlay || overlay.isDestroyed()) break;
    const image = await overlay.webContents.capturePage();
    const { width, height } = image.getSize();
    const bgra = image.toBitmap();
    if (bgra.length === width * height * 4) {
      frameWidth = width;
      frameHeight = height;
      frames.push({ bgra });
    }
    if (i < frameCount - 1) await sleep(110);
  }
  if (frames.length < 2) return;
  const gif = encodeGif(frames, { width: frameWidth, height: frameHeight, delayCs: 11, loop: 0 });
  await writeMomentFile(gif, "gif");
}

async function captureSnapshot(): Promise<void> {
  if (!overlay || overlay.isDestroyed()) return;
  const image = await overlay.webContents.capturePage();
  await writeMomentFile(image.toPNG(), "png");
}

async function writeMomentFile(data: Buffer, ext: "gif" | "png"): Promise<string> {
  const dir = path.join(os.homedir(), "Pictures", "Mischief");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `mischief-${stamp}.${ext}`);
  fs.writeFileSync(file, data);
  shell.showItemInFolder(file);
  return file;
}

// --- Configuration ----------------------------------------------------------

function settingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadConfig(): void {
  try {
    config = parseConfig(fs.readFileSync(settingsPath(), "utf8"));
  } catch {
    config = { ...DEFAULT_CONFIG };
  }
}

function persistConfig(): void {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), serializeConfig(config), { mode: 0o600 });
  } catch (error) {
    console.warn("[Mischief] Could not persist settings:", error);
  }
}

function applyConfig(next: AppConfig): void {
  const companionChanged = next.companionId !== companion?.packId;
  config = next;
  behaviorEngine?.setIntensity(next.intensity);
  behaviorEngine?.setPersonality(next.personality);
  if (interactive !== next.interactive) setInteractive(next.interactive);
  if (followEnabled !== next.followCursor) setFollowEnabled(next.followCursor);
  if (companionChanged) swapCompanion(next.companionId);
}

function swapCompanion(packId: string): void {
  const next = loadCompanion(packId);
  if (!next || next.packId === companion?.packId) return;
  if (companion) {
    events.emit("CharacterRemoved", { characterId: companion.packId });
  }
  companion = next;
  config.companionId = next.packId;
  behaviorEngine?.setCharacter(next.character);
  if (overlay && !overlay.isDestroyed()) {
    overlay.webContents.send("mischief:sprite", { url: next.sprite, meta: next.meta });
  }
  tray?.setToolTip(`${next.displayName} (${next.species}) - Mischief`);
  events.emit("CharacterSpawned", { characterId: next.packId });
  console.log(`[Mischief] Switched companion to "${next.displayName}" (${next.packId})`);
}

function openSettings(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 500,
    height: 700,
    resizable: false,
    title: "Mischief Settings",
    backgroundColor: "#0B0F19",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWindow.setMenuBarVisibility(false);
  hardenWebContents(settingsWindow);
  settingsWindow.loadFile(path.join(__dirname, "renderer", "settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

// --- Tray & menus -----------------------------------------------------------

function createTray(): void {
  const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "tray", "icon.png"));
  tray = new Tray(icon);
  tray.setToolTip(
    companion ? `${companion.displayName} (${companion.species}) - Mischief` : "Mischief"
  );
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show Mischief",
        click: () => {
          if (!overlay || overlay.isDestroyed()) {
            createOverlay();
          }
          overlay?.show();
        },
      },
      {
        label: "Follow cursor",
        type: "checkbox",
        checked: followEnabled,
        click: (item) => setFollowEnabled(item.checked),
      },
      {
        label: "Interactive (pet me)",
        type: "checkbox",
        checked: interactive,
        click: (item) => setInteractive(item.checked),
      },
      { type: "separator" },
      {
        label: "Capture moment (GIF)",
        click: () => {
          void captureGif();
        },
      },
      {
        label: "Capture snapshot (PNG)",
        click: () => {
          void captureSnapshot();
        },
      },
      { type: "separator" },
      {
        label: "Settings...",
        click: () => openSettings(),
      },
      { type: "separator" },
      { label: "Quit Mischief", click: () => app.quit() },
    ])
  );
}

function setInteractive(enabled: boolean): void {
  interactive = enabled;
  overlayHitActive = false;
  if (overlay && !overlay.isDestroyed()) {
    // Always click-through first; the pixel hit test drives capture in
    // interactive mode. Decorative mode stays fully click-through.
    overlay.setIgnoreMouseEvents(true, { forward: true });
    overlay.webContents.send("mischief:interactive", interactive);
  }
}

function createApplicationMenu(): void {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [isMac ? { role: "close" as const } : { role: "quit" as const }],
    },
    { role: "editMenu" as const },
    { role: "viewMenu" as const },
    { role: "windowMenu" as const },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- IPC --------------------------------------------------------------------

ipcMain.on("mischief:pet", (_event, payload: { x: number; y: number } | undefined) => {
   lastPetAt = Date.now();
   events.emit("CharacterClicked", {
     characterId: companion?.packId ?? "builtin",
     x: payload?.x ?? 0,
     y: payload?.y ?? 0,
   });
   if (!interactive) return;
   const selection = behaviorEngine.tick(collectSignals());
   if (selection && selection.behavior !== currentBehavior) {
     currentBehavior = selection.behavior;
     applyBehaviorChange(selection.behavior);
     sendBehavior(selection.behavior);
   }
 });

// Pixel-aware click-through: the overlay reports when the cursor is over an
// opaque pixel of the character, and only then does the window capture input.
// Transparent areas stay click-through, so the companion never blocks clicks.
ipcMain.on("mischief:overlay:hit", (_event, active: unknown) => {
  if (!interactive || !overlay || overlay.isDestroyed()) return;
  const wantCapture = active === true;
  if (wantCapture === overlayHitActive) return;
  overlayHitActive = wantCapture;
  overlay.setIgnoreMouseEvents(!wantCapture);
});

ipcMain.handle("mischief:settings:get", () => config);

ipcMain.handle("mischief:companions:list", () => companionListPayload());

ipcMain.handle("mischief:companions:import", async () => {
  const result = await dialog.showOpenDialog({
    title: "Choose a companion image",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const sourcePath = result.filePaths[0];
  const baseName = path.basename(sourcePath);
  if (!isCustomImage(baseName)) return null;

  // Animated GIFs can't be cut out: import the original as-is.
  const ext = baseName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "gif") {
    const descriptor = ensureCustomCompanion(sourcePath);
    if (!descriptor) return null;
    if (descriptor.packId !== config.companionId) {
      applyConfig(sanitizeConfig({ ...config, companionId: descriptor.packId }));
      persistConfig();
    }
    return companionListPayload();
  }

  // Raster images open the cutout editor (cutout optional, see editor toggle).
  const raster = decodeRaster(sourcePath);
  if (!raster) {
    const descriptor = ensureCustomCompanion(sourcePath);
    if (!descriptor) return null;
    if (descriptor.packId !== config.companionId) {
      applyConfig(sanitizeConfig({ ...config, companionId: descriptor.packId }));
      persistConfig();
    }
    return companionListPayload();
  }
  pendingImport = { sourcePath, raster, baseName };
  const editor = createImportEditorWindow();
  await new Promise<void>((resolve) => {
    editor.once("closed", () => resolve());
  });
  pendingImport = null;
  return companionListPayload();
});

ipcMain.handle("mischief:companions:remove", (_event, packId: unknown) => {
  if (typeof packId !== "string") return false;
  const removed = removeCustomCompanion(packId);
  if (removed) persistConfig();
  return removed;
});

ipcMain.handle("mischief:companion:meta", () => {
  if (!companion) return null;
  return { url: companion.sprite, meta: companion.meta };
});

ipcMain.handle("mischief:import-editor:get", () => {
  if (!pendingImport) return null;
  const png = encodeRasterPng(pendingImport.raster);
  if (!png) return null;
  return {
    sourcePath: pendingImport.sourcePath,
    width: pendingImport.raster.width,
    height: pendingImport.raster.height,
    previewDataUrl: dataUrl(png),
  };
});

ipcMain.handle("mischief:import-editor:preview", (_event, payload: unknown) => {
  if (!pendingImport) return null;
  const request = sanitizeEditorRequest(payload);
  if (!request) return null;
  const processed = processImportRaster(pendingImport.raster, request);
  const png = encodeRasterPng(processed);
  if (!png) return null;
  return {
    previewDataUrl: dataUrl(png),
    keptRatio: foregroundRatio(processed),
    width: processed.width,
    height: processed.height,
  };
});

ipcMain.handle("mischief:import-editor:save", (_event, payload: unknown) => {
  if (!pendingImport) return null;
  const request = sanitizeEditorRequest(payload);
  if (!request) return null;
  const processed = processImportRaster(pendingImport.raster, request);
  const ratio = foregroundRatio(processed);
  const useCutout = request.cut && ratio >= IMPORT_CUTOUT_FALLBACK_RATIO;
  const meta = sanitizeCompanionMeta({ cutout: useCutout, face: request.face });
  const raster = useCutout ? processed : pendingImport.raster;
  const png = encodeRasterPng(raster);
  if (!png) return null;

  const descriptor = ensureImportedCompanion(pendingImport.sourcePath, png, meta);
  if (!descriptor) return null;
  events.emit("CustomCompanionImported", {
    characterId: descriptor.packId,
    displayName: descriptor.displayName,
  });
  if (descriptor.packId !== config.companionId) {
    applyConfig(sanitizeConfig({ ...config, companionId: descriptor.packId }));
    persistConfig();
  }
  return companionListPayload();
});

ipcMain.handle("mischief:import-editor:cancel", () => {
  pendingImport = null;
  return null;
});

ipcMain.handle("mischief:settings:set", (_event, partial: unknown) => {
  const merged =
    typeof partial === "object" && partial !== null
      ? { ...config, ...(partial as Record<string, unknown>) }
      : config;
  applyConfig(sanitizeConfig(merged));
  persistConfig();
  return config;
});

app.setName("Mischief");

app.whenReady().then(() => {
  loadConfig();
  registerAssetProtocol();
  companion = loadCompanion(config.companionId);
  if (companion) {
    console.log(`[Mischief] Loaded companion "${companion.displayName}" (${companion.packId})`);
    if (companion.packId !== config.companionId) {
      config.companionId = companion.packId;
      persistConfig();
    }
  } else {
    console.warn("[Mischief] No example experience pack loaded; using built-in creature");
  }

  behaviorEngine = new BehaviorEngine({
    character: companion?.character ?? null,
    personality: config.personality,
    intensity: config.intensity,
  });

  events.emit("RuntimeStarted", { version: app.getVersion() });

  createApplicationMenu();
  createTray();
  createOverlay();
  applyConfig(config);

  behaviorTicker = createTicker(behaviorTick, 1000);
  behaviorTicker.start();

  // --- Power & activity reactions -----------------------------------------
  powerMonitor.on("suspend", () => emitReaction({ kind: "power-suspend" }));
  powerMonitor.on("resume", () => emitReaction({ kind: "power-resume" }));
  powerMonitor.on("lock-screen", () => emitReaction({ kind: "lock-screen" }));
  powerMonitor.on("unlock-screen", () => emitReaction({ kind: "unlock-screen" }));
  powerMonitor.on("on-ac", () => emitReaction({ kind: "on-ac" }));
  powerMonitor.on("on-battery", () => emitReaction({ kind: "on-battery" }));
  powerMonitor.on("shutdown", () => emitReaction({ kind: "app-shutdown" }));

  // Activity burst detection (proxy for fast typing / heavy mouse use).
  activityPollInterval = setInterval(detectActivityBurst, 1000);

  // Morning greeting based on current hour.
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    emitReaction({ kind: "time-morning" });
  } else if (hour >= 20 || hour < 5) {
    emitReaction({ kind: "time-night" });
  }
});

app.on("before-quit", () => {
  emitReaction({ kind: "app-shutdown" });
  if (activityPollInterval) {
    clearInterval(activityPollInterval);
    activityPollInterval = null;
  }
});

app.on("window-all-closed", () => {
  // Mischief lives in the tray; do not quit when windows close.
});
