import { contextBridge, ipcRenderer } from "electron";
import type { PetMeta } from "./domain/procedural";

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
  /** Custom-pet metadata (cutout flag + face anchor). */
  meta: PetMeta;
}

export interface SpriteMessage {
  url: string;
  meta: PetMeta;
}

export interface PetEditorData {
  sourcePath: string;
  width: number;
  height: number;
  previewDataUrl: string;
}

export interface PetEditorPreview {
  previewDataUrl: string;
  keptRatio: number;
  width: number;
  height: number;
}

export interface PetEditorSaveRequest {
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
  onInteractive(callback: (enabled: boolean) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, enabled: boolean): void => {
      callback(enabled);
    };
    ipcRenderer.on("mischief:interactive", listener);
    return () => {
      ipcRenderer.removeListener("mischief:interactive", listener);
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
  addCustomCompanion(): Promise<CompanionInfo[] | null> {
    return ipcRenderer.invoke("mischief:companions:add-image");
  },
  removeCustomCompanion(packId: string): Promise<boolean> {
    return ipcRenderer.invoke("mischief:companions:remove", packId);
  },
  /** Opens the custom pet editor; resolves with the companion list when it closes. */
  openPetEditor(): Promise<CompanionInfo[] | null> {
    return ipcRenderer.invoke("mischief:pet-editor:open-window");
  },
  /** Overlay: fetch the active companion's sprite + pet metadata. */
  getPetMeta(): Promise<SpriteMessage | null> {
    return ipcRenderer.invoke("mischief:pet:meta");
  },
  // Pet editor window internals.
  getPetEditorData(): Promise<PetEditorData | null> {
    return ipcRenderer.invoke("mischief:pet-editor:get");
  },
  previewPetEditor(request: Omit<PetEditorSaveRequest, "face">): Promise<PetEditorPreview | null> {
    return ipcRenderer.invoke("mischief:pet-editor:preview", request);
  },
  savePetEditor(request: PetEditorSaveRequest): Promise<CompanionInfo[] | null> {
    return ipcRenderer.invoke("mischief:pet-editor:save", request);
  },
  cancelPetEditor(): Promise<null> {
    return ipcRenderer.invoke("mischief:pet-editor:cancel");
  },
});
