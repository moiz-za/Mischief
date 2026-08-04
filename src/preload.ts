import { contextBridge, ipcRenderer } from "electron";
import type { CompanionMeta } from "./domain/procedural";

export interface BehaviorMessage {
  anim: string;
  mood: string;
}

export interface AppConfig {
  companionId: string;
  intensity: "silent" | "calm" | "normal" | "playful" | "chaos";
  personality: "friendly" | "curious" | "lazy" | "energetic" | "mischievous";
  interactive: boolean;
  followCursor: boolean;
}

export interface CompanionInfo {
  packId: string;
  displayName: string;
  species: string;
  /** Overlay-ready sprite URL (mischief-asset://<packId>/<path>). */
  sprite: string;
  /** True for user-added companions that can be removed. */
  custom: boolean;
  /** Companion metadata (cutout flag + anchor point). */
  meta: CompanionMeta;
}

export interface SpriteMessage {
  url: string;
  meta: CompanionMeta;
}

export interface ImportEditorData {
  sourcePath: string;
  width: number;
  height: number;
  previewDataUrl: string;
}

export interface ImportEditorPreview {
  previewDataUrl: string;
  keptRatio: number;
  width: number;
  height: number;
}

export interface ImportEditorSaveRequest {
  cut: boolean;
  tolerance: number;
  keep: Array<{ x: number; y: number; radius: number }>;
  remove: Array<{ x: number; y: number; radius: number }>;
  face: { x: number; y: number } | null;
}

contextBridge.exposeInMainWorld("mischief", {
  version: process.env.npm_package_version ?? "0.2.0",
  onBehavior(callback: (behavior: BehaviorMessage) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, behavior: BehaviorMessage): void => {
      callback(behavior);
    };
    ipcRenderer.on("mischief:behavior", listener);
    return () => {
      ipcRenderer.removeListener("mischief:behavior", listener);
    };
  },
  onSprite(callback: (message: SpriteMessage) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, message: SpriteMessage): void => {
      callback(message);
    };
    ipcRenderer.on("mischief:sprite", listener);
    return () => {
      ipcRenderer.removeListener("mischief:sprite", listener);
    };
  },
  pet(x: number, y: number): void {
    ipcRenderer.send("mischief:pet", { x, y });
  },
  /** Overlay: report whether the cursor is currently over an opaque pixel of the companion. */
  setOverlayHit(active: boolean): void {
    ipcRenderer.send("mischief:overlay:hit", active === true);
  },
  onInteractive(callback: (enabled: boolean) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, enabled: boolean): void => {
      callback(enabled);
    };
    ipcRenderer.on("mischief:interactive", listener);
    return () => {
      ipcRenderer.removeListener("mischief:interactive", listener);
    };
  },
  onBubble(callback: (detail: { text: string; durationMs: number }) => void): () => void {
    const listener = (
      _event: Electron.IpcRendererEvent,
      detail: { text: string; durationMs: number }
    ): void => {
      callback(detail);
    };
    ipcRenderer.on("mischief:bubble", listener);
    return () => {
      ipcRenderer.removeListener("mischief:bubble", listener);
    };
  },
  getSettings(): Promise<AppConfig> {
    return ipcRenderer.invoke("mischief:settings:get");
  },
  saveSettings(partial: Partial<AppConfig>): Promise<AppConfig> {
    return ipcRenderer.invoke("mischief:settings:set", partial);
  },
  listCompanions(): Promise<CompanionInfo[]> {
    return ipcRenderer.invoke("mischief:companions:list");
  },
  /** Picks any image (GIF adds as-is; raster opens the cutout editor). Resolves with the companion list when done. */
  importCompanion(): Promise<CompanionInfo[] | null> {
    return ipcRenderer.invoke("mischief:companions:import");
  },
  removeCustomCompanion(packId: string): Promise<boolean> {
    return ipcRenderer.invoke("mischief:companions:remove", packId);
  },
  /** Overlay: fetch the active companion's sprite + metadata. */
  getCompanionSprite(): Promise<SpriteMessage | null> {
    return ipcRenderer.invoke("mischief:companion:meta");
  },
  // Import editor window internals.
  getImportEditorData(): Promise<ImportEditorData | null> {
    return ipcRenderer.invoke("mischief:import-editor:get");
  },
  previewImportEditor(request: Omit<ImportEditorSaveRequest, "face">): Promise<ImportEditorPreview | null> {
    return ipcRenderer.invoke("mischief:import-editor:preview", request);
  },
  saveImportEditor(request: ImportEditorSaveRequest): Promise<CompanionInfo[] | null> {
    return ipcRenderer.invoke("mischief:import-editor:save", request);
  },
  cancelImportEditor(): Promise<null> {
    return ipcRenderer.invoke("mischief:import-editor:cancel");
  },
});
