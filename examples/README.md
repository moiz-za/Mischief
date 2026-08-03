# examples

Run-ready examples for developers.

- `examples/plugins/` — plugin examples (`manifest.json` + `src/index.js`)
- `examples/experiences/` — Experience Pack examples (data-only: manifest + character + sprites)

Every manifest here is validated at load time by the strict manifest validator
(`src/domain/manifest.ts`) and covered by the regression tests in `tests/`.

## Experience Packs

The runtime loads a companion pack at startup (in preference order) and renders
its sprite in the overlay. The default companion is `cat-companion` (Whiskers).

| Pack              | Character           | Personality                           |
| ----------------- | ------------------- | ------------------------------------- |
| `cat-companion`   | Whiskers (cat)      | curious — sneaks, wanders, pounces    |
| `ghost-companion` | Spectra (ghostling) | playful — floats around windows       |
| `robot-companion` | Sparky (robot)      | hyper — rapid idle, beeps             |
| `sample-creature` | Bloop (blob)        | friendly — minimal structure template |

Pack anatomy: `manifest.json` (required, strictly validated) + `characters/<id>.json`
(animations, behavior weights) + sprite assets referenced by `assets`.

## Plugins

| Plugin                | Purpose                                                               |
| --------------------- | --------------------------------------------------------------------- |
| `hello-plugin`        | Minimal SDK skeleton (`onInitialize`/`onReady`/`onTick`/`onShutdown`) |
| `event-logger-plugin` | Subscribes to runtime events, logs metrics (console only)             |
