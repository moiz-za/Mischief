# KNOWN ISSUES

Full codebase audit log. Updated 2026-08-04.

---

## 🔴 Open Issues — Round 3 Audit

### ISS-024 — `import-editor.html` Canvas Clearing During Rapid Brush Movements
- **Severity**: Low — Visual artifact
- **Location**: [`src/renderer/import-editor.html`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/import-editor.html) L326–335
- **Issue**: `addStroke()` redraws `currentImage` and calls `drawOverlay()` synchronously on `pointermove`. Rapid continuous brushing can trigger redrawing before the previous frame preview promise resolves, resulting in slight stroke flicker on high-DPI displays.
- **Fix Direction**: Throttle pointermove stroke additions using `requestAnimationFrame` or debounce canvas re-renders.

### ISS-025 — `soundEnabled` Value Normalization in Legacy Config Loading
- **Severity**: Low — Edge case
- **Location**: [`src/renderer/settings.html`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/settings.html) L673
- **Issue**: `$("soundEnabled").checked = config.soundEnabled !== false` evaluates safely, but if `config` loaded from disk lacks the `soundEnabled` property (from v0.1.0 pre-sound configs), the renderer UI shows `checked = true` while the underlying config object passed back to `saveSettings` will omit `soundEnabled` unless explicitly toggled.
- **Fix Direction**: Ensure `sanitizeConfig` is run on all IPC config responses before returning to renderer.

### ISS-026 — Web Audio Context Auto-Play Suspension in `audio.renderer.js`
- **Severity**: Low — Audio playback
- **Location**: [`src/renderer/audio.renderer.js`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/audio.renderer.js)
- **Issue**: Chromium auto-play policy may suspend `AudioContext` created in background Electron windows without initial gesture. Sound signals sent to overlay might silently fail until an explicit user interaction occurs.
- **Fix Direction**: Call `audioCtx.resume()` inside `window.mischief.onPlaySound` listener before playing synthesized buffer.

### ISS-027 — Canvas Hit Testing Exception on CORS Image Fallback
- **Severity**: Medium — Robustness
- **Location**: [`src/renderer/overlay.html`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/overlay.html) L198–212
- **Issue**: If `spriteToBlobUrl` fails and falls back to a non-blob protocol URL, `hitCtx.getImageData(x, y, 1, 1)` will throw a DOMException (tainted canvas) and default `sampleHit` to `false`, disabling click-through transparency for that sprite frame.
- **Fix Direction**: Wrap `getImageData` in a try/catch block (already present) and fallback to bounding box hit testing when canvas is tainted.

---

## ✅ Closed Issues (ISS-001 through ISS-023)

### ISS-001 — Save Button Not Visible in Settings Window ✅ FIXED
- **Root Cause**: `overflow: hidden` overrode `overflow-y: auto`, clipping the page body.
- **Fix**: Removed `overflow: hidden`, changed `height: 100%` → `min-height: 100%` in `settings.html`.
- **Files**: [`src/renderer/settings.html`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/settings.html)

### ISS-002 — Version Badge Shows Hardcoded `v0.2.0` ✅ FIXED
- **Root Cause**: `process.env.npm_package_version` is `undefined` in Electron sandbox renderer.
- **Fix**: `main.ts` passes `app.getVersion()` as URL query param; `settings.html` reads via `URLSearchParams`.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts), [`src/renderer/settings.html`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/settings.html)

### ISS-003 — Follow Mouse / Follow Cursor Not Working ✅ FIXED
- **Root Cause**: `followEnabled === config.followCursor === true` at startup → guard skipped → interval never started.
- **Fix**: Added explicit `applyFollow()` call after `applyConfig(config)` at startup.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-004 — "Pet Me" / Interactive Click Not Working ✅ FIXED
- **Root Cause**: `DEFAULT_CONFIG.interactive = false` → pet reactions always short-circuited.
- **Fix**: Changed `DEFAULT_CONFIG.interactive = true`.
- **Files**: [`src/domain/config.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/domain/config.ts)

### ISS-006 — `ide-save`, `git-commit`, `build-green` Had Identical Speech Pools ✅ FIXED
- **Root Cause**: Shared identical speech pool text across triggers.
- **Fix**: Gave each pool unique, contextually accurate messages.
- **Files**: [`src/domain/reactions.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/domain/reactions.ts)

### ISS-007 — `removeCustomCompanion()` Swapped to Deleted Pack ID ✅ FIXED
- **Root Cause**: Called `swapCompanion(deletedPackId)` after removal.
- **Fix**: Swaps to the first remaining companion or sets companion to null.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-008 — Startup Greeting Bubble Fired Before Overlay Loaded ✅ FIXED
- **Root Cause**: Synchronous IPC message sent before renderer loaded.
- **Fix**: Delayed startup greeting with 1500ms timeout.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-009 — `app-shutdown` Goodbye Bubble Always Throttled ✅ FIXED
- **Root Cause**: 5-second bubble throttle blocked one-time shutdown signal.
- **Fix**: Added `isShutdown` throttle bypass in `emitReaction`.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-010 — Interval Handles Leaked on Quit ✅ FIXED
- **Root Cause**: Reaction & wellness intervals were unreferenced and un-cleared.
- **Fix**: Saved all interval handles to variables and cleared them in `before-quit`.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-011 — Bubble Window Too Short for Multi-Line Text ✅ FIXED
- **Root Cause**: Fixed 80px window height clipped long text.
- **Fix**: Expanded window height and positioning constant to 100px.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-012 — Combo-Streak Always Showed "Combo x2!" ✅ FIXED
- **Root Cause**: `pickReaction` ignored `comboCount` payload property.
- **Fix**: Dynamically constructs `"Combo x${count}! 🎉"` / `"🔥"` message.
- **Files**: [`src/domain/reactions.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/domain/reactions.ts)

### ISS-013 — Selected Companion Tile Didn't Scroll Into View ✅ FIXED
- **Root Cause**: Missing auto-scroll for active tile in grid.
- **Fix**: Added `scrollIntoView({ behavior: "smooth", block: "nearest" })`.
- **Files**: [`src/renderer/settings.html`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/settings.html)

### ISS-014 — `parkInCorner()` Always Used Primary Display ✅ FIXED
- **Root Cause**: Sleeping behavior always jumped to primary display work area.
- **Fix**: Uses `getDisplayNearestPoint` based on current overlay coordinates.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-015 — `overlay.html` Missed `mischief:muted` Listener on Startup ✅ FIXED
- **Root Cause**: `mischief:muted` signal sent before overlay page finished loading.
- **Fix**: Added `mischief:muted` broadcast to `did-finish-load` in `createOverlay()`.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-016 — `overlay.html` Missing Initial Sprite Broadcast for Non-Cutout Companions ✅ FIXED
- **Root Cause**: Renderer did not receive initial sprite payload if query param was missing or loaded late.
- **Fix**: Broadcasts initial `mischief:sprite` payload in `did-finish-load`.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-017 — `enumerateCompanions()` Repeated Disk I/O ✅ FIXED
- **Root Cause**: Re-read and validated all experience directories on every list request.
- **Fix**: Added in-memory caching for `enumerateCompanions()` with invalidation on pack import/remove.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-018 — `bubble.html` Pop-Out Animation Felt Abrupt ✅ FIXED
- **Root Cause**: `animation-direction: reverse` with `ease-in` resulted in inverted timing curve.
- **Fix**: Created dedicated `@keyframes pop-out` with natural easing.
- **Files**: [`src/renderer/bubble.html`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/bubble.html)

### ISS-019 — `overlay.html` Canvas `requestAnimationFrame` Leak on Rapid Switch ✅ FIXED
- **Root Cause**: Async image loading callback launched duplicate motion loops if companion changed quickly.
- **Fix**: Added `motionGeneration` counter check to discard stale `image.onload` callbacks.
- **Files**: [`src/renderer/overlay.html`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/overlay.html)

### ISS-020 — Stale "Remove" Button Flash in Settings ✅ FIXED
- **Root Cause**: `selectedId` retained deleted companion ID during `refreshAll()` promise resolution.
- **Fix**: Reset `selectedId = ""` prior to `refreshAll()`.
- **Files**: [`src/renderer/settings.html`](file:///Users/moiz/Documents/GitHub/Mischief/src/renderer/settings.html)

### ISS-021 — `detectActivityBurst` Counter Accumulation in Non-Interactive Mode ✅ FIXED
- **Root Cause**: Low idle counter accumulated even when `interactive = false`.
- **Fix**: Added early return in `detectActivityBurst()` when `!interactive`.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-022 — Screen Disconnect Mid-Wander Edge Case ✅ FIXED
- **Root Cause**: Overlay could land off-screen if monitor configuration changed while wandering.
- **Fix**: Subscribed to `screen` `display-removed` and `display-metrics-changed` events to reposition overlay.
- **Files**: [`src/main.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/main.ts)

### ISS-023 — All-Symbol Filename `slugify` Fallback ✅ FIXED
- **Root Cause**: Filenames with only symbols fallback to `"companion"`.
- **Fix**: Confirmed intended safe behavior with unique suffixing (`"companion-2"`).
- **Files**: [`src/domain/custom-companion.ts`](file:///Users/moiz/Documents/GitHub/Mischief/src/domain/custom-companion.ts)

---

## ✅ Build Status

| Metric | Result |
| :--- | :--- |
| TypeScript Build | ✅ Clean |
| Vitest Tests | ✅ 161/161 passed |
| Experience Pack Validation | ✅ 19/19 packs clean |
