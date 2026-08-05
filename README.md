<div align="center">

<p>
  <img src="assets/branding/logo.svg" alt="Mischief" width="150" />
</p>

# Mischief

### by [Moiz Solutions](https://tools.moiz.solutions)

[![Version](https://img.shields.io/badge/version-0.4.0-blue?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/moiz-za/Mischief?style=flat-square&label=stars)](https://github.com/moiz-za/Mischief)
[![Last Commit](https://img.shields.io/github/last-commit/moiz-za/Mischief?style=flat-square)](https://github.com/moiz-za/Mischief/commits/main)
[![Repo Size](https://img.shields.io/github/repo-size/moiz-za/Mischief?style=flat-square)](https://github.com/moiz-za/Mischief)
[![Downloads](https://img.shields.io/github/downloads/moiz-za/Mischief/total?style=flat-square)](https://github.com/moiz-za/Mischief/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/moiz-za/Mischief/ci.yml?style=flat-square&label=CI)](https://github.com/moiz-za/Mischief/actions)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-orange?style=flat-square)](#-installation)
[![Secrets](https://img.shields.io/badge/secrets-gitleaks%20scanned-success?style=flat-square)](.gitleaks.toml)

**The open-source platform for desktop entertainment.**

**Real personality for your computer.** Harmless desktop creatures, playful window antics, cursor surprises, and ambient companions — all optional, all reversible, all yours.

**100% offline & privacy-first.** No accounts. No telemetry. No analytics. Runs entirely on your machine.

---

</div>

## 📖 Table of Contents

- [Features](#-features)
- [How It Works](#-how-it-works)
- [Why Mischief](#-why-mischief)
- [Installation](#-installation)
- [Building Experiences](#-building-experiences)
- [Security & Privacy](#-security--privacy)
- [Transparency](#-transparency)
- [Repository Structure](#-repository-structure)
- [FAQ](#-faq)
- [Changelog](#-changelog)
- [Community & Support](#-community--support)
- [Author & Maintainer](#-author--maintainer)
- [License & Disclaimer](#-license--disclaimer)

---

## 🚀 Features

### 🎭 A platform, not an app

- **Experience Packs** — declarative, data-only content anyone can create: characters, antics, ambience, seasonal effects
- **Plugin SDK** — sandboxed extension host for real logic without touching core

### ⚖️ Deterministic personality engine

- Events carry **priority, conditions, and cooldowns** — the companion never spams you
- **Intensity levels** from _Silent_ to _Chaos_ — you decide how much mischief you want
- The companion **reacts to your real work**: sleeps after inactivity, yawns when you return, wanders the desktop, perks up when you click it
- **Interactive mode** — click your companion and watch it react (off by default; click-through preserved)
- **Settings window** — tune intensity (Silent → Chaos) and personality live, persist your preferences
- **19 Flagship Characters** — Zen (Red Panda), Kumo (Cyber Fox), Astra (Stardust Dragon), Barnaby (Capybara), Pippin (Penguin), Pocus (Ghostling), Byte (Vintage Bot), Nami (Sea Otter), Pixel-Rex (Pixel Dino), Lumina (Crystal Phoenix), Mochi (Shiba Baker), Voxel (Mecha Cat), Bramble (Hedgehog), Sola (Sunflower), Whiskers (Cat), Spectra (Ghost), Sparky (Robot), Pixel (Pixel Buddy), and Bloop (Sample Creature) — each with unique species-themed dialogue
- **Character-Specific Speech** — every companion has its own dialogue pools for petting, idle moments, power events, and more; user-imported companions get a voice that matches their personality
- **Anti-Repeat Chatter** — a shuffled picker never repeats the same bubble twice in a row, so the companion stays fresh
- **Behavior-Aware Reactions** — the companion comments on its own antics (hiding, peeking, spinning, pouncing, sneaking, dancing)
- **Playful Behaviors** — six playful behaviors (hide, peek, spin, pounce, sneak, dance) run for every companion, including custom imports
- **Combo Streaks** — consecutive pets trigger escalating reactions (Combo x2! 🎉, Super happy!)
- **Developer Triggers** — IDE save, git commit, and build green reactions for your workflow
- **Wellness Reminders** — hydration and posture check nudges during work hours, plus deep-focus and weekend greetings

### 🛡️ Safe by design

- Every effect is **reversible, optional, and transparent**
- Manifests validated at load — a strict security boundary before any third-party content runs
- Mischief is a mischievous friend — **never malware, never destructive**

### 🔒 Privacy-first & offline-first

- **No accounts, no telemetry, no analytics** — zero network calls by default
- Works entirely offline on Windows, macOS, and Linux

### 🧩 Built for contributors

- Pure, tested domain layer (`src/domain/`) with Vitest coverage
- CI that typechecks, lints, builds, tests, audits dependencies, and scans for secrets
- [`good first issue`](https://github.com/moiz-za/Mischief/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) bugs you can pick up in minutes

---

## ⚙️ How It Works

Mischief is a lightweight **Runtime** that loads modular **Experience Packs**. Packs are data — the runtime decides _when_ and _how_ to show them.

```
  1. LOAD ────► Experience Pack manifest validated (pure, tested domain layer)
                    │ PASS
                    ▼
  2. SCHEDULE ─► events scored by priority, conditions & cooldowns
                    │ event fires
                    ▼
  3. ACT ─────► overlay companion · window antics · cursor effects · speech bubbles
                    │
  4. REVERT ───► every effect is reversible
                    │ intensity: Silent → Chaos
```

Each step checks the previous before proceeding. Third-party content is never trusted blindly — validation happens before anything is scheduled or rendered.

---

## 🏆 Why Mischief

| Dimension          | Typical prank apps     | Desktop pets (Shimeji, Goose) | **Mischief**                                    |
| :----------------- | :--------------------- | :---------------------------- | :---------------------------------------------- |
| **Business model** | Ads, bundles, paywalls | Free, often abandoned         | **Open source, MIT**                            |
| **Safety**         | Irreversible effects   | Varies                        | **Reversible + transparent + intensity levels** |
| **Extensibility**  | Closed                 | Limited                       | **Experience Packs + plugin SDK**               |
| **Privacy**        | Telemetry              | Varies                        | **Zero telemetry, offline-first**               |
| **Platform**       | Single OS              | One OS                        | **Windows / macOS / Linux**                     |
| **Trust**          | Unknown binaries       | Unsigned                      | **CI-tested, gitleaks-scanned, reproducible**   |

---

## 🔧 Installation

### Option 1: Install a release (recommended)

Installers for Windows, macOS, and Linux are published in [Releases](https://github.com/moiz-za/Mischief/releases). Download the build for your OS, install, and a small companion appears at the corner of your desktop with a tray icon.

### Option 2: Run from source

> Requires Node.js 18+

```bash
git clone https://github.com/moiz-za/Mischief.git
cd Mischief
npm install
npm run dev
```

A small companion appears on your desktop, and a tray icon keeps Mischief running.

### Build installers locally

```bash
npm run dist:mac   # or dist:win / dist:linux
```

---

## 🧩 Building Experiences

Any data-only pack can become an experience. Start from the reference pack:

```bash
examples/experiences/sample-creature/   # a complete working character
examples/plugins/hello-plugin/          # a minimal plugin skeleton
```

- [Experience Pack docs](docs/experiences/README.md)
- [Plugin skeletons](examples/plugins/hello-plugin/)

New to the project? Browse the [`good first issue`](https://github.com/moiz-za/Mischief/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) list — icons, localization, and manifest validation are great starting points.

---

## 🔒 Security & Privacy

Security is a core design principle, not an afterthought:

- **Secret scanning** — gitleaks blocks secrets in the pre-commit hook and in CI; the full history is scanned
- **Dependency audit** — `npm audit` runs in CI on every push and gates every release
- **Pinned, maintained Electron** — upgraded and kept current; 0 known vulnerabilities at every release
- **Zero telemetry** — Mischief makes no network calls by default; nothing leaves your machine
- **Private vulnerability reporting** — report via the repository's Security tab (see [`SECURITY.md`](SECURITY.md))

See [Transparency](#-transparency) for exactly what Mischief does with your machine.

---

## 🔍 Transparency

Mischief is a desktop app that lives on your screen, so you deserve to know exactly what it can and cannot do. This is the whole truth — nothing hidden, nothing "in beta."

### What Mischief does

| Behavior                                         | Details                                                                                                                                                                             |
| :----------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reads your cursor position**                   | Moves the companion to follow or wander near it. Position data never leaves your machine                                                                                            |
| **Reads system idle time**                       | To know when you've stepped away (so the companion can nap). It does **not** log what you were doing                                                                                |
| **Draws a small overlay on top of your windows** | A 96×96px transparent, always-on-top companion window. It's decorative; it can't read or modify other apps                                                                          |
| **Captures the screen — only when you ask**      | "Capture moment" grabs ~1.2s or a single frame **only when you click the menu item**, and saves it to `~/Pictures/Mischief/`. There is **no background or automatic capture**, ever |
| **Writes two local files**                       | `settings.json` (your preferences, mode 0600) and your saved moments in `~/Pictures/Mischief/`                                                                                      |

### What Mischief never does

- ❌ **No network calls** — Mischief runs 100% offline; it cannot phone home, fetch content, or update itself silently
- ❌ **No accounts, no telemetry, no analytics, no advertising SDKs**
- ❌ **No keylogging** — it reads cursor position and idle time only
- ❌ **No file access** — it reads nothing outside its own install, `settings.json`, and the moments folder
- ❌ **No destructive effects** — every effect is reversible, optional, and off by default
- ❌ **No third-party code runs** — community packs are strict-validated data; the plugin host ships disabled

### Verifying authenticity

- **Source-first** — the app is MIT-licensed and fully auditable at [`github.com/moiz-za/Mischief`](https://github.com/moiz-za/Mischief). Build it yourself with `npm run dist:mac` (or `dist:win` / `dist:linux`)
- **Checksums** — every release attaches a `SHA256SUMS` manifest; verify the installer before running it (`shasum -a 256 -c SHA256SUMS`)
- **Signed builds** — as of now, release builds are **unsigned**, so macOS Gatekeeper and Windows SmartScreen will warn on first launch. That warning is the OS being cautious about any new unsigned app, not a sign Mischief is dangerous. Code signing is planned (see [Security & Privacy](#-security--privacy)); until then, the source + checksums above are your ground truth

### Platform support & testing

Mischief targets macOS, Windows, and Linux, and every release ships installers
for all three (built on native CI runners). The full test suite (pure-JS unit
tests for cutout/motion/manifests/behavior/config) runs on **Windows, macOS,
and Linux** in CI, and a **Linux boot smoke** boots the real Electron app under
a virtual display on every push to confirm it starts, loads a companion, and
registers its handlers without fatal errors.

We develop and runtime-test on **macOS**, so it's the most polished. Windows
and Linux are continuously build- and unit-test-verified, but occasional
cosmetic differences (tray icon rendering, transparent-window behavior on some
Linux window managers) may surface there first — report them as an issue and
they get fixed fast.

---

## 📦 Repository Structure

```
mischief/
├── src/                    Electron runtime
│   ├── main.ts             tray + overlay host
│   ├── preload.ts          secure IPC bridge
│   ├── renderer/           overlay companion (sprite + cutout canvas)
│   └── domain/             pure, tested logic (no Electron)
├── examples/               starter content
│   ├── experiences/        19 companion packs (zen, kumo, astra, …)
│   └── plugins/            plugin skeletons
├── docs/                   experience-pack guide + community docs
├── tests/                  unit tests (Vitest)
├── localization/           locale data
├── assets/                 branding + icons
└── scripts/                build + hook tooling
```

---

## ❓ FAQ

**Q: Is Mischief malware?**
A: No. Every effect is reversible, optional, and transparent. It is a mischievous friend, never destructive.

**Q: Will it interfere with my work?**
A: You control the intensity — from _Silent_ to _Chaos_. Events respect priority, conditions, and cooldowns, so the companion never spams you.

**Q: Does it need an account or internet?**
A: No accounts, no telemetry, no analytics. It runs entirely offline.

**Q: Can I make my own companion?**
A: Yes. Experience Packs are declarative data — copy `sample-creature`, tweak the manifest and assets, and load it. No core changes needed.

**Q: What platforms are supported?**
A: Windows, macOS, and Linux. Builds are produced with electron-builder.

**Q: How is this different from Shimeji or Desktop Goose?**
A: They're single-app pets. Mischief is a **platform**: a small runtime that loads any number of packs, with safety, intensity controls, and an SDK at its core.

---

## 📋 Changelog

| Version    | Date    | Summary                                                                                                                                                                                                                                                                    |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v0.4.0** | 2026-08 | Playful behaviors (hide/peek/spin/pounce/sneak/dance) for every companion, always-on drag-to-move, anti-repeat + companion-specific + personality-matched speech, behavior-aware chatter, follow-cursor & quick-menu sync, spin/hide animation fixes, removed sound chimes |
| **v0.3.1** | 2026-08 | Companion switcher, raster sprite support (PNG/JPG/WebP/GIF), custom companions, import any image with background cutout + expression anchor, import pipeline internals, settings UI layout + repository-boundary fixes                                                    |
| **v0.3.0** | 2026-08 | 14 character-specific speech pools with unique dialogue, combo streak tracking, developer triggers (IDE save, git commit, build green), wellness reminders (hydration, posture)                                                                                            |
| **v0.2.0** | 2026-08 | Settings window (intensity/personality selectors, interactive & cursor-follow toggles, persisted), config manager with fallbacks, GIF moment capture to `~/Pictures/Mischief/`, PNG snapshot                                                                               |
| **v0.1.3** | 2026-08 | Personality engine: event bus, intensity levels (Silent→Chaos), weighted behaviors with cooldowns, sleeps/yawns/wanders, interactive pet mode, PNG moment capture                                                                                                          |
| **v0.1.2** | 2026-08 | Strict manifest validation (security boundary), Experience Pack loader, typed localization (`en-US`/`es`/`de`/`fr`), themes, runtime loads the Whiskers companion pack, 4 example packs + 2 plugins                                                                        |
| **v0.1.0** | 2026-08 | Initial foundation — Electron + TypeScript skeleton, overlay companion + tray, pure tested domain layer, CI (typecheck/lint/build/test/audit), gitleaks secret scanning, packaging config                                                                                  |

See full [CHANGELOG.md](./CHANGELOG.md) for details.

---

## 🤝 Community & Support

- **Report bugs & request features** — [Open a GitHub Issue](https://github.com/moiz-za/Mischief/issues)
- **Questions** — GitHub Discussions on this repository
- **Contribute** — See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines; every PR is squashed and CI-gated
- **Star the repo** — Helps others discover Mischief

---

## 👤 Author & Maintainer

Built and maintained by **Moiz Zoaib Ali**:

- **Personal Website:** [moiz.solutions](https://moiz.solutions)
- **AI Tools Directory:** [tools.moiz.solutions](https://tools.moiz.solutions)
- **GitHub Profile:** [@moiz-za](https://github.com/moiz-za)

---

## 📄 License & Disclaimer

- **License:** Distributed under the **MIT License**. Copyright (c) 2026 Moiz Zoaib Ali. See [`LICENSE`](./LICENSE) for details.
- **Disclaimer:** Mischief is provided for entertainment. All effects are reversible and user-controlled; the user remains responsible for how the software is used. Not affiliated with or endorsed by any OS vendor.

---

<div align="center">

**Built by [Moiz Solutions](https://tools.moiz.solutions)** · Report issues on [GitHub](https://github.com/moiz-za/Mischief/issues)

</div>
