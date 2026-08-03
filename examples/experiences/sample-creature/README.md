# Sample Creature

A minimal example Experience Pack. Copy this folder to start your own.

## Structure

```
sample-creature/
  manifest.json      # pack metadata (required)
  characters/
    bloop.json       # character definition
  images/            # sprite assets
  audio/             # sound assets
  README.md
```

## Rules

- Experience Packs are **data only** — no executable code.
- Every pack must have a valid `manifest.json`.
- Assets are optional until referenced by the manifest.

## Validating

A pack validator will be provided in `tools/`. Until then, keep the manifest
schema-compliant (see `docs/experiences/`).
