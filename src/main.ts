import { app, BrowserWindow, Menu, screen, Tray, nativeImage } from "electron";
import * as path from "path";
import { followPosition } from "./domain/overlay";

let overlay: BrowserWindow | null = null;
let tray: Tray | null = null;
let followCursor = true;
let followInterval: NodeJS.Timeout | null = null;

const OVERLAY_SIZE = 96;
const CURSOR_GAP = 10;

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

  overlay.loadFile(path.join(__dirname, "renderer", "overlay.html"));
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // The overlay is decorative: it must never intercept clicks or hover.
  overlay.setIgnoreMouseEvents(true);

  overlay.on("closed", () => {
    overlay = null;
  });
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

function setFollowCursor(enabled: boolean): void {
  followCursor = enabled;
  if (followInterval) {
    clearInterval(followInterval);
    followInterval = null;
  }
  if (enabled) {
    followInterval = setInterval(followCursorTick, 33);
  }
}

function createTray(): void {
  const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "tray", "icon.png"));
  tray = new Tray(icon);
  tray.setToolTip("Mischief");
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
        checked: followCursor,
        click: (item) => setFollowCursor(item.checked),
      },
      { type: "separator" },
      { label: "Quit Mischief", click: () => app.quit() },
    ])
  );
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

app.setName("Mischief");

app.whenReady().then(() => {
  createApplicationMenu();
  createTray();
  createOverlay();
  setFollowCursor(true);
});

app.on("window-all-closed", () => {
  // Mischief lives in the tray; do not quit when windows close.
});
