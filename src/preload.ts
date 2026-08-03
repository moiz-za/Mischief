import { contextBridge, ipcRenderer } from "electron";

export interface BehaviorMessage {
  anim: string;
  mood: string;
}

export interface AppConfig {
  intensity: "silent" | "calm" | "normal" | "playful" | "chaos";
  personality: "friendly" | "curious" | "lazy" | "energetic" | "mischievous";
  interactive: boolean;
  followCursor: boolean;
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
});
