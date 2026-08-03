import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("mischief", {
  version: process.env.npm_package_version ?? "0.1.0",
});
