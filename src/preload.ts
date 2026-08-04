import { contextBridge, ipcRenderer } from "electron";

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
  onSprite(callback: (sprite: string) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, sprite: string): void => {
      callback(sprite);
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
});
