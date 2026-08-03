# Hello Plugin

A minimal plugin skeleton. Plugins use the SDK only — they never import Runtime internals.

## Lifecycle hooks (per spec)

`OnInitialize` → `OnLoaded` → `OnReady` → `OnTick` → `OnPause` → `OnResume` → `OnShutdown`

## Structure

```
hello-plugin/
  manifest.json   # declares metadata + permissions
  src/
    index.js      # entrypoint (referenced by manifest)
  README.md
```

## Rules

- Declare every permission explicitly in `manifest.json`.
- Stay sandboxed: no filesystem/network access unless explicitly permitted.
- Failures must never affect the Runtime.
