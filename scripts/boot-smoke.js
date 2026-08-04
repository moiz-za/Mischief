// Boot smoke test: launches the real Electron app and asserts it starts, loads
// a companion, and registers its protocol/IPC handlers without fatal errors.
//
// Used in CI on Linux under xvfb (see .github/workflows/ci.yml). Can also be
// run locally: `node scripts/boot-smoke.js` (a window will briefly appear).
//
// Exits 0 on success, 1 on failure. Fails if:
//   - the app does not log "[Mischief] Loaded companion ..." within the timeout
//   - the app logs a fatal JS error (TypeError, unhandled rejection, etc.)
//
// GPU/EGL warnings under xvfb are expected noise and are ignored.

"use strict";

const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TIMEOUT_MS = 60_000;
const GRACE_MS = 6_000;

/** The spawned Electron process (module-scope so `finish` can kill it). */
let child = null;
/** Combined stdout+stderr from the app (module-scope so `finish` can scan it). */
let output = "";
/** Timestamp when the companion-load marker was first seen, or null. */
let successAt = null;

const SUCCESS_MARKER = "[Mischief] Loaded companion";

// Only fail on these — they mean the runtime itself is broken.
const FATAL_PATTERNS = [
  /TypeError:/,
  /ReferenceError:/,
  /UnhandledPromiseRejection/i,
  /Uncaught Exception/i,
  /Cannot find module/i,
  /FATAL ERROR/i,
];

function buildCommand() {
  const electron = require("electron"); // resolves to the Electron binary path
  const args = ["."];
  if (process.env.CI) args.push("--no-sandbox", "--disable-gpu");

  if (process.platform === "linux" && !process.env.DISPLAY) {
    // No display: run under a virtual X server.
    return {
      command: "xvfb-run",
      args: ["-a", "-s", "-screen 0 1280x720x24", electron, ...args],
    };
  }
  return { command: electron, args };
}

async function main() {
  const { command, args } = buildCommand();
  console.log(`[boot-smoke] spawning: ${command} ${args.join(" ")}`);

  child = spawn(command, args, { cwd: ROOT, env: process.env });
  let exited = false;

  const collect = (chunk) => {
    output += chunk;
    if (!successAt && output.includes(SUCCESS_MARKER)) {
      successAt = Date.now();
      console.log(`[boot-smoke] ${SUCCESS_MARKER} seen`);
    }
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  child.on("error", (error) => {
    exited = true;
    console.error(`[boot-smoke] failed to spawn Electron: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    exited = true;
    console.log(`[boot-smoke] app exited with code ${code}`);
    finish(false);
  });

  const start = Date.now();
  while (!successAt && Date.now() - start < TIMEOUT_MS) {
    await sleep(500);
    if (exited) return;
  }

  if (!successAt) {
    console.error("[boot-smoke] FAIL: companion was never loaded");
    finish(false);
    return;
  }

  // Give the app a moment to surface late errors (overlay load, IPC wiring).
  await sleep(GRACE_MS);
  finish(true);
}

function finish(ok) {
  if (child && child.exitCode === null) {
    child.kill();
  }
  const fatal = FATAL_PATTERNS.filter((pattern) => pattern.test(output));
  if (fatal.length > 0) {
    console.error(`[boot-smoke] FAIL: fatal error patterns matched: ${fatal.map(String).join(", ")}`);
    dumpTail();
    process.exit(1);
  }
  if (!ok) {
    dumpTail();
    process.exit(1);
  }
  console.log("[boot-smoke] OK: app booted and loaded a companion cleanly");
  dumpTail();
  process.exit(0);
}

function dumpTail() {
  const lines = output.split("\n").filter((line) => line.trim());
  const tail = lines.slice(-25);
  if (tail.length > 0) {
    console.log("--- last output ---");
    for (const line of tail) console.log(line);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
