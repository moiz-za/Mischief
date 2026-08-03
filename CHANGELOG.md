# Changelog

All notable changes to Mischief are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

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
