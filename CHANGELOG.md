# Changelog

All notable changes to Mischief are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **Code health** — removed unused `bh` destructure in `positionBubble()` and updated stale `v0.2.0` version fallbacks to `0.3.1` in `settings.html` and `preload.ts`.

## [0.3.1] - 2026-08-04

### Added

- **Companion switcher** — choose from installed companion packs in Settings; the mascot hot-swaps instantly (sprite, tray tooltip, and behavior engine all update live, no restart)
- **Raster sprite support** — companion sprites can be PNG, JPG/JPEG, WebP, or animated GIF in addition to SVG
- **Custom companions** — add any image from Settings (PNG/JPG/WebP/GIF); Mischief builds a validated Experience Pack in the app's user-data folder — no coding, nothing uploaded — renders it over a privileged `mischief-asset://` protocol, and lets you remove it any time
- **Import any image as a companion** — one "Add your own companion…" flow replaces the separate add-image and pet buttons: GIFs are added as-is; static images open an import editor with an optional background cutout (border-flood cutout + Remove/Keep brushes + sensitivity, all on-device) and a pinned anchor for expressions (blink/mouth/Zzz/hearts/tears). Cutout companions are animated per-frame on a canvas (bob/lean/squash-and-stretch + anchored effects). Works for a pet, a person, a logo, a plant — anything. Image pipeline in the main process via `nativeImage` (decode/encode/premultiply), pixel math in pure tested domain modules (`segmentation.ts`, `procedural.ts`); the overlay ports `procedural.ts` to a browser bundle (`procedural.renderer.js`)
- **Import pipeline internals** — new IPC (`mischief:companions:import`, `mischief:import-editor:*`, `mischief:companion:meta`), `CustomCompanionImported` event, `meta` (`CompanionMeta`) carried on companion descriptors and sprite messages, packs persisted under `<userData>/custom-companions/`. Metadata lives in `configuration.mischief.imported` (pre-release `pet` key still read)

### Fixed

- **Settings UI Layout** — fixed flex height constraints and scroll handling in `settings.html`, ensuring footer action buttons (`Save` / `Cancel`) stay pinned at the bottom of the window.
- **Repository Boundaries** — untracked private `Main Docs/` specifications from Git and enforced privacy rules in `.gitignore` and `.agents/AGENTS.md`.

## [0.2.0] - 2026-08-04

### Added

- **Settings** — a settings window (tray menu → "Settings...") with an intensity selector (Silent → Chaos), a personality selector (Friendly/Curious/Lazy/Energetic/Mischievous), and toggles for interactive mode and cursor-following. Changes apply live and persist to `settings.json` under the app's user-data directory
- **Config manager** (`src/domain/config.ts`) — schema-validated config with `sanitizeConfig`/`parseConfig`/`serializeConfig`; corrupted or missing settings fall back to defaults instead of crashing
- **GIF moment capture** (`src/domain/gif.ts`) — "Capture moment (GIF)" records ~1.2s of the mascot and exports a looping GIF to `~/Pictures/Mischief/` (share-loop v2). Pure-JS encoder (omggif): palette from unique colors with transparency preserved, and even lossless for our few-color sprites
- Moment capture split into two menu actions: **GIF** and **PNG snapshot**

## [0.1.3] - 2026-08-03

### Added

- **Personality engine** (spec §24–27, §60) — the mascot now reacts to what you do:
  - Typed **event bus** with the spec §206 event catalog (`CharacterSpawned`, `CharacterClicked`, `CharacterSleeping`, `CharacterMoved`, …)
  - **Behavior engine** with intensity levels (Silent → Chaos) and personalities (Friendly/Curious/Lazy/Energetic/Mischievous) that shape timing and which behaviors get favored
  - **Weighted free-choice behaviors** with cooldowns, plus contextual triggers: sleeps in the corner after inactivity, yawns when you return, reacts excited when petted
  - **Context signals**: system idle time, time-of-day, user activity
  - **Wandering** — the mascot strolls across the desktop when curious/energetic (reversible: it returns to following the cursor)
- **Interactive mode** — a tray toggle ("Interactive (pet me)") that lets you click the mascot; clicking emits `CharacterClicked` and triggers a happy reaction. Off by default (click-through preserved)
- **Moment capture** — saves a PNG of the mascot to `~/Pictures/Mischief/` and reveals it in your file manager (share-loop v1; GIF export is a follow-up)
- **Behavior → animation mapping** in the renderer: bob, sway, sleep (with Zzz), yawn, happy bounce

## [0.1.2] - 2026-08-03

### Added

- **Strict manifest validation** (`src/domain/manifest.ts`) — the first security boundary: experience, plugin, theme, and character manifests are validated before load; invalid content is rejected, never silently tolerated
- **Experience Pack loader** (`src/domain/pack.ts`) — validates a pack manifest, resolves characters, and verifies every declared asset exists
- **Localization foundation** (`src/domain/i18n.ts`) — typed `t()` with interpolation and strict key-parity validation; shipped with `en-US`, `es`, `de`, `fr`
- **Theme support** (`src/domain/theme.ts`) — theme manifests and token→CSS-variable mapping
- **Runtime pack integration** — the app loads a companion pack at startup (default: `cat-companion`/Whiskers), validates it, renders its sprite in the overlay, and shows its name in the tray tooltip
- **Example content** — 4 experience packs (cat, ghost, robot, blob), 2 plugins, 4 locales, 2 themes, and manifest-validation fixtures

### Fixed

- `event-logger-plugin` manifest now conforms to the plugin schema (spec §200) instead of an invented `main`-based shape
- `hello-plugin` manifest completed (added `repository`, removed non-spec `optionalDependencies`)
- `sample-creature` pack declared assets that did not exist; sprite added and asset list corrected

## [0.1.1] - 2026-08-03

### Fixed

- Quit is now reachable: replaced the invisible tray icon (was `nativeImage.createEmpty()`) with a real tray icon, and added an explicit application menu with **Quit** (Cmd+Q on macOS, Ctrl+Q on Windows/Linux)
- Companion now spawns in the bottom-right corner of the screen instead of floating centered mid-air

## [0.1.0] - 2026-08-03

### Added

- Initial project scaffolding (Electron + TypeScript)
- Transparent overlay window with an animated companion
- System tray integration
- Repository structure, community files, and CI foundation
- Secret scanning (gitleaks) in CI and as a pre-commit hook
- Cross-platform release builds (macOS DMG, Windows NSIS, Linux AppImage) via GitHub Actions
- Public good-first-issue backlog
