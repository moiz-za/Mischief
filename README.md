# Mischief

Offline-first, privacy-first desktop entertainment platform.

Mischief brings personality, delight, and humor back to everyday computer use through a lightweight Runtime that loads modular, declarative "Experience Packs" — desktop creatures, window pranks, cursor effects, ambient companions, and more.

## Principles

- **Offline First** — works fully without internet
- **Privacy First** — no accounts, no telemetry, no analytics
- **Local First** — everything belongs to the user, stored locally
- **Safe By Design** — never deletes files, reads personal data, or executes unknown code
- **Cross Platform** — Windows, macOS, Linux
- **Extensible** — Experience Packs and sandboxed Plugins via a stable SDK

## Getting Started

Requirements: Node.js 18+

```bash
npm install
npm run dev
```

A small companion creature appears as a transparent overlay; a tray icon keeps Mischief running in the background.

## Development

```bash
npm run build      # compile TypeScript + copy assets to dist/
npm run typecheck  # type-check only
npm start          # build + launch Electron
```

## Repository Layout

```
.github/       CI workflows and templates
assets/        branding, icons, logos
docs/          public documentation
scripts/       build and automation scripts
specs/         public specifications
src/           application source
tests/         tests
examples/      sample plugins and experiences
tools/         developer tools
```

## License

MIT
