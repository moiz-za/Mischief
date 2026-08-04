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
import { createTicker, type Ticker } from "./domain/scheduler";
import { isSafeSpritePath, pickSprite } from "./domain/sprite";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "mischief-asset",
    privileges: { standard: true, secure: true, corsEnabled: false },
  },
]);

let overlay: BrowserWindow | null = null;
let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;
let followEnabled = true;
let followPausedByBehavior = false;
let followInterval: NodeJS.Timeout | null = null;
let companion: LoadedCompanion | null = null;
let behaviorEngine: BehaviorEngine;
let behaviorTicker: Ticker | null = null;
let interactive = false;
let lastPetAt: number | null = null;
let currentBehavior: BehaviorDef | null = null;
let wanderTimer: NodeJS.Timeout | null = null;
let wandering = false;
let config: AppConfig = { ...DEFAULT_CONFIG };

const events = new EventBus();

const OVERLAY_SIZE = 96;
const CURSOR_GAP = 10;
const EXPERIENCE_DIR = path.join(__dirname, "renderer", "experiences");
const PACK_ORDER = ["cat-companion", "ghost-companion", "robot-companion", "pixel-buddy"];
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
}> {
  return enumerateCompanions().map(({ packId, displayName, species, spritePath, custom }) => ({
    packId,
    displayName,
    species,
    sprite: `mischief-asset://${packId}/${spritePath}`,
    custom,
  }));
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
  // Default: decorative click-through. Interactive mode (tray) flips this.
  overlay.setIgnoreMouseEvents(!interactive);

  overlay.on("closed", () => {
    overlay = null;
  });

  events.emit("CharacterSpawned", { characterId: companion?.packId ?? "builtin" });
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
    overlay.webContents.send("mischief:sprite", next.sprite);
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
    width: 400,
    height: 560,
    resizable: false,
    title: "Mischief Settings",
    backgroundColor: "#0f172a",
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
  if (overlay && !overlay.isDestroyed()) {
    overlay.setIgnoreMouseEvents(!interactive);
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

ipcMain.handle("mischief:settings:get", () => config);

ipcMain.handle("mischief:companions:list", () => companionListPayload());

ipcMain.handle("mischief:companions:add-image", async () => {
  const result = await dialog.showOpenDialog({
    title: "Choose a companion image",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const descriptor = ensureCustomCompanion(result.filePaths[0]);
  if (!descriptor) return null;
  if (descriptor.packId !== config.companionId) {
    applyConfig(sanitizeConfig({ ...config, companionId: descriptor.packId }));
    persistConfig();
  }
  return companionListPayload();
});

ipcMain.handle("mischief:companions:remove", (_event, packId: unknown) => {
  if (typeof packId !== "string") return false;
  const removed = removeCustomCompanion(packId);
  if (removed) persistConfig();
  return removed;
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
});

app.on("window-all-closed", () => {
  // Mischief lives in the tray; do not quit when windows close.
});
