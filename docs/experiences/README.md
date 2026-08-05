# Experience Packs

Experience Packs are the content of Mischief — declarative, data-only, and safe.

- Pack structure and manifest
- Supported assets (characters, animations, audio, images)
- Categories and tags
- Building your first pack in ~10 minutes
- Submission guidelines

Experience Packs contain no executable code and cannot access the filesystem or network.

---

## Quick start (≈10 minutes)

1. Copy the starter pack:

   ```bash
   cp -r examples/experiences/sample-creature examples/experiences/my-companion
   ```

2. Edit `manifest.json` and `characters/*.json` (see the references below).
3. Drop in a sprite at `images/…` and reference it from `assets` (SVG, PNG,
   JPG/JPEG, WebP, or animated GIF — see _Supported sprite formats_ below).
4. Validate against the same strict loader the runtime uses:

   ```bash
   npm run validate:packs
   ```

   All packs under `examples/experiences/` are checked — `[OK]` means yours will load.

---

## Anatomy of a pack

```
my-companion/
├── manifest.json          # pack metadata (required, strictly validated)
├── characters/
│   └── my-creature.json   # character definition (referenced by manifest)
├── images/                # sprite assets (must exist; one .svg becomes the overlay sprite)
├── audio/                 # sound assets (optional)
├── animations/            # reserved for future animation packs
└── README.md              # describe your pack for humans
```

Every path in the manifest is **relative to the pack root**, and every referenced
file must **exist on disk** — the loader verifies this at load time.

---

## `manifest.json` reference

Fields are validated strictly: **unknown fields are rejected**, ids must be
kebab-case, and versions must be semantic version strings.

| Field                   | Type     | Rule                                                                                                                                 |
| :---------------------- | :------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | string   | Required, kebab-case (`my-companion`)                                                                                                |
| `name`                  | string   | Required, non-empty                                                                                                                  |
| `version`               | string   | Required, semver (`0.1.0`)                                                                                                           |
| `category`              | string   | Required, non-empty (e.g. `animals`, `fantasy`, `tech`)                                                                              |
| `author`                | string   | Required, non-empty                                                                                                                  |
| `license`               | string   | Required, non-empty (e.g. `MIT`)                                                                                                     |
| `description`           | string   | Required, non-empty                                                                                                                  |
| `tags`                  | string[] | Required (may be empty)                                                                                                              |
| `minimumRuntimeVersion` | string   | Required, semver                                                                                                                     |
| `assets`                | string[] | Required. Paths must exist; the first supported sprite is used as the overlay sprite (SVG/PNG/JPG/JPEG/WebP/GIF, safe relative path) |
| `characters`            | string[] | Required. Paths must exist and contain valid character manifests                                                                     |
| `animations`            | string[] | Required (may be empty)                                                                                                              |
| `audio`                 | string[] | Required (may be empty)                                                                                                              |
| `configuration`         | object   | Required. Free-form per-pack settings (e.g. `idleTimeoutMs`)                                                                         |
| `compatibility`         | object   | Required. `{ "platforms": ["windows","macos","linux"] }` — non-empty subset of those three                                           |

### Supported sprite formats

Any image format the overlay `<img>` can render works as a companion sprite:

- **SVG** — crisp at any size, and can embed its own CSS animation.
- **PNG / JPG / JPEG / WebP** — static raster images.
- **GIF** — animates for free in the overlay; a great way to give a companion
  living motion. The `pixel-buddy` example pack is an animated GIF sprite.

Raster sprites are static (except GIFs); the CSS bob/sway/sleep effects still
apply to every format. Paths must be safe relative paths (no `..`, no leading
`/`) so they can be turned into overlay URLs.

### Minimal example

```json
{
  "id": "my-companion",
  "name": "My Companion",
  "version": "0.1.0",
  "category": "animals",
  "author": "You",
  "license": "MIT",
  "description": "A friendly blob that follows your cursor.",
  "tags": ["companion"],
  "minimumRuntimeVersion": "0.2.0",
  "assets": ["images/creature.svg"],
  "characters": ["characters/blob.json"],
  "animations": [],
  "audio": [],
  "configuration": { "idleTimeoutMs": 30000 },
  "compatibility": { "platforms": ["windows", "macos", "linux"] }
}
```

---

## Character manifest reference

Each file listed in `characters` describes one character:

| Field         | Type     | Rule                                                                      |
| :------------ | :------- | :------------------------------------------------------------------------ |
| `id`          | string   | Required, kebab-case                                                      |
| `species`     | string   | Required, non-empty                                                       |
| `displayName` | string   | Required, non-empty (shown in the tray tooltip)                           |
| `author`      | string   | Required, non-empty                                                       |
| `personality` | string   | Required. `friendly`, `curious`, `lazy`, `energetic`, or `mischievous`    |
| `animations`  | object   | Required. Map of animation name → `{ fps ≥ 1, duration ≥ 1, loop: bool }` |
| `behavior`    | object   | Required. `{ "weightedDecision": bool, "<anim>Weight": number ≥ 0 }`      |
| `voice`       | object   | Required. `{ "enabled": bool }`                                           |
| `sounds`      | string[] | Required (may be empty)                                                   |

### How animations and weights drive behavior

- The behavior engine builds one **behavior per animation** in `animations`.
- Its likelihood is `behavior.<anim>Weight` (default `0.1` when absent); higher
  weight = chosen more often.
- **Movement animations** (`walk`, `waddle`, `stroll`, `float`, `glide`, `fly`,
  `sneak`, `run`, `pounce`, `jump`) make the companion **wander the desktop**.
- **High-energy animations** (`pounce`, `jump`, `run`, `spin`, `bounce`, `dance`,
  `zoom`, `sneak`) are only selected at **Playful** intensity or above.
- The renderer maps animation names to motion: `idle` bobs; movement anims sway;
  `sleep` sleeps with "z"; `yawn` and `happy` play as one-shots. Unknown anim
  names fall back to a gentle idle bob.

### Example character

```json
{
  "id": "blob",
  "species": "blob",
  "displayName": "Bloop",
  "author": "You",
  "animations": {
    "idle": { "fps": 8, "duration": 1000, "loop": true },
    "walk": { "fps": 10, "duration": 500, "loop": true },
    "yawn": { "fps": 6, "duration": 2200, "loop": false }
  },
  "behavior": {
    "weightedDecision": true,
    "idleWeight": 0.6,
    "walkWeight": 0.3,
    "yawnWeight": 0.1
  },
  "personality": "curious",
  "voice": { "enabled": false },
  "sounds": []
}
```

---

## Validating your pack

```bash
npm run validate:packs
```

This runs every pack under `examples/experiences/` through the **same loader the
runtime uses** — the strict manifest checks, character resolution, and
asset-existence checks. A pack only ships if it prints `[OK]`.

---

## Adding your own companion (no coding needed)

Anyone can turn any image — a pet, a person, a logo, a plant, a photo of
anything — into a companion from the **Settings → Companion → Add your own
companion…** button. 100% on-device, nothing is uploaded.

1. Pick a **PNG, JPG/JPEG, WebP, or animated GIF** on your computer.
   - **GIFs** (already moving, can't be cut out) are added as-is.
2. For static images the **import editor** opens with an automatic background
   cutout (a light border-flood algorithm — no ML model, ~0 MB added):
   - Toggle **Cut out the background** off to keep the original image as-is.
   - **Remove** brush erases (paints transparency), **Keep** brush restores.
   - **Sensitivity** raises/lowers the auto-cut tolerance for similar
     background colors.
   - **Pin anchor** marks where expressions (blinks, yawns, hearts, tears)
     land. Skip it for a sensible default (centered upper-third).
3. Mischief generates a safe pack in the app's local user-data folder
   (`~/Library/Application Support/Mischief/custom-companions/` on macOS;
   `%APPDATA%/Mischief/custom-companions/` on Windows): id from the file name
   (`my-best-friend.jpg` → `my-best-friend`), a friendly character persona,
   and the image as its sprite. It is added to the Companion dropdown
   instantly and becomes the active companion.

Custom companions are marked `(custom)` in the dropdown — cutout ones are
marked `(animated)` because they move on their own — and can be **removed**
(locally deleted) any time. They behave like any other companion: they follow
your cursor, wander, sleep, and react to petting, using the same behavior
engine. The image stays on your machine — nothing is uploaded.

Under the hood each one is just an Experience Pack (see below), so pack
authors get the same result by hand-writing packs and dropping them in that
folder.

---

## Cutout companions: how the animation works

Cutout companions render on a canvas with **per-frame motion** — bobbing,
leaning, squash-and-stretch, plus anchored effects — instead of the plain CSS
bob used for regular (uncut) companions. They use the same behavior engine, so
they wander, sleep, and react to petting; `run` and `sad` are built into every
imported companion. The sprite is stored premultiplied (dark halos around
edges are prevented by clamping each pixel's color to its alpha).

`configuration.mischief.imported.cutout` is the flag the overlay checks: packs
without it (including hand-written ones) use the classic CSS path, so adding an
imported pack by hand is safe — just write
`"imported": { "cutout": true, "face": { "x": 0.5, "y": 0.3 } }`. (The
pre-release `pet` key is still read for compatibility.)

---

## Loading your pack

The runtime bundles every pack under `examples/experiences/` (see `PACK_ORDER`
in `src/main.ts`). To make your pack the companion:

1. Put it at `examples/experiences/<your-pack-id>/`.
2. Build (`npm run build`) so it is copied into `dist/renderer/experiences/`.
3. `npm run dev` — it now appears in **Settings → Companion**, where you can
   switch to it instantly (no restart).

The last chosen companion is persisted in `settings.json` (`companionId`);
if a chosen pack is removed, the runtime falls back to the first valid pack.

---

## Submission guidelines

- Packs are **data only** — no executable code, ever.
- Everything a pack references must exist in the pack.
- Keep manifests schema-compliant; `npm run validate:packs` must pass.
- Be kind: reversible, non-destructive behavior only. Mischief is a mischievous
  friend, never malware.
