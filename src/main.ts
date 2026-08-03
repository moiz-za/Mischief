import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import * as path from "path";

let overlay: BrowserWindow | null = null;
let tray: Tray | null = null;

function createOverlay(): void {
  overlay = new BrowserWindow({
    width: 96,
    height: 96,
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

  overlay.on("closed", () => {
    overlay = null;
  });
}

function createTray(): void {
  const icon = nativeImage.createEmpty();
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
      { type: "separator" },
      { label: "Quit Mischief", click: () => app.quit() },
    ])
  );
}

app.whenReady().then(() => {
  createTray();
  createOverlay();
});

app.on("window-all-closed", () => {
  // Mischief lives in the tray; do not quit when windows close.
});
