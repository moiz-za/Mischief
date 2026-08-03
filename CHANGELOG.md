# Changelog

All notable changes to Mischief are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

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
