/**
 * Sample Mischief Plugin: Event Logger
 *
 * Demonstrates subscribing to runtime events via the SDK. This plugin is
 * console-only: it never touches the network or the filesystem.
 *
 * The SDK runtime calls these hooks if present.
 */
export function onInitialize() {
  console.log("[EventLoggerPlugin] Initialized.");
}

export function onReady() {
  console.log("[EventLoggerPlugin] Ready.");
  // TODO(SDK): subscribe to runtime events once the SDK lands, e.g.
  //   events.on("CharacterMoved", (data) => logEvent("CharacterMoved", data));
}

export function onTick() {
  // Called on each runtime tick (if enabled).
}

export function onShutdown() {
  console.log("[EventLoggerPlugin] Shutting down.");
}
