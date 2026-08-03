import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  powerMonitor,
  screen,
  shell,
  Tray,
} from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  BehaviorEngine,
  type BehaviorDef,
  type Intensity,
  type Personality,
  type ContextSignals,
} from "./domain/behavior";
import { EventBus } from "./domain/events";
import type { CharacterManifest } from "./domain/manifest";
import { followPosition } from "./domain/overlay";
import { loadExperiencePack, type PackReader } from "./domain/pack";
import { createTicker, type Ticker } from "./domain/scheduler";

let overlay: BrowserWindow | null = null;
let tray: Tray | null = null;
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

const events = new EventBus();

const OVERLAY_SIZE = 96;
const CURSOR_GAP = 10;
const EXPERIENCE_DIR = path.join(__dirname, "renderer", "experiences");
const PACK_ORDER = ["cat-companion", "ghost-companion", "robot-companion"];

interface LoadedCompanion {
  packId: string;
  displayName: string;
  species: string;
  sprite: string;
  character: CharacterManifest;
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

function loadCompanion(): LoadedCompanion | null {
  for (const packId of PACK_ORDER) {
    const dir = path.join(EXPERIENCE_DIR, packId);
    if (!fs.existsSync(dir)) continue;
    const result = loadExperiencePack(createDirReader(dir));
    if (!result.pack) continue;
    const character = result.pack.characters[0];
    if (!character) continue;
    const sprite = result.pack.manifest.assets.find((asset) => asset.endsWith(".svg"));
    if (!sprite) continue;
    return {
      packId,
      displayName: character.character.displayName,
      species: character.character.species,
      sprite: `experiences/${packId}/${sprite}`,
      character: character.character,
    };
  }
  return null;
}

function toPersonality(value: string | undefined): Personality {
  switch (value) {
    case "friendly":
      return "friendly";
    case "lazy":
      return "lazy";
    case "mischievous":
      return "mischievous";
    case "hyper":
    case "playful":
    case "energetic":
      return "energetic";
    case "curious":
    default:
      return "curious";
  }
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
    },
  });

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

async function captureMoment(): Promise<void> {
  if (!overlay || overlay.isDestroyed()) return;
  const image = await overlay.webContents.capturePage();
  const dir = path.join(os.homedir(), "Pictures", "Mischief");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `mischief-${stamp}.png`);
  fs.writeFileSync(file, image.toPNG());
  shell.showItemInFolder(file);
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
        label: "Capture moment",
        click: () => {
          void captureMoment();
        },
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

app.setName("Mischief");

app.whenReady().then(() => {
  companion = loadCompanion();
  if (companion) {
    console.log(`[Mischief] Loaded companion "${companion.displayName}" (${companion.packId})`);
  } else {
    console.warn("[Mischief] No example experience pack loaded; using built-in creature");
  }

  behaviorEngine = new BehaviorEngine({
    character: companion?.character ?? null,
    personality: companion ? toPersonality(companion.character.personality) : "curious",
    intensity: "normal" as Intensity,
  });

  events.emit("RuntimeStarted", { version: app.getVersion() });

  createApplicationMenu();
  createTray();
  createOverlay();
  applyFollow();

  behaviorTicker = createTicker(behaviorTick, 1000);
  behaviorTicker.start();
});

app.on("window-all-closed", () => {
  // Mischief lives in the tray; do not quit when windows close.
});
