# Contributing to Mischief

Thanks for your interest in Mischief! Every contribution — code, docs, translations, experiences, plugins, bug reports — helps make desktop computing more fun.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to follow it.

## Quick Start

```bash
git clone https://github.com/moiz-za/Mischief.git
cd Mischief
npm install
npm run dev
```

You should see a small companion appear on your desktop with a tray icon in the menu bar.

## Getting Started as a Contributor

1. **Find something to work on.** Look for issues labeled `good first issue` or `help wanted`. If you have an idea, open an issue or a Discussion first.
2. **Create a branch.**

   ```bash
   git checkout -b feature/my-contribution
   ```

3. **Make your change.** Small, focused changes are preferred.
4. **Add tests** for any new logic.
5. **Run the checks** (see below) and make sure everything passes.
6. **Open a pull request** using the PR template.

## Checks to Run Before Submitting

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
npm run format      # Prettier (format files)
npm run build       # compile + copy assets
npm test            # unit + integration tests
```

CI runs all of these automatically on every pull request.

## What You Can Contribute

- **Code** — features, fixes, refactors (see `docs/`)
- **Experience Packs** — declarative content: characters, animations, audio (`docs/experiences/`)
- **Plugins** — sandboxed extensions using the SDK (see `examples/plugins/`)
- **Translations** — localization files (`localization/`)
- **Documentation** — `docs/` (treated as source code)
- **Samples & examples** — `examples/`
- **Bug reports & feature ideas** — via issues and Discussions

## Coding Standards

- TypeScript, strict mode.
- Follow the existing architecture and dependency rules (see `docs/README.md`)
- One responsibility per file; clear naming; no unnecessary comments.
- New public APIs must be documented and versioned.
- Accessibility is mandatory; every feature needs an accessibility review.
- Keep changes backward compatible where practical.

## Branch & Commit Conventions

- Branches: `feature/*`, `bugfix/*`, `release/*`, `hotfix/*`.
- Conventional Commits: `feat(scope): description`, `fix(scope):`, `docs(scope):`, `test(scope):`, `chore(scope):`, etc.
- Atomic commits preferred.

## Pull Request Guidelines

Use the pull request template and include:

- Purpose and scope
- Linked issue (if any)
- Screenshots/GIFs if UI changed
- Performance/security/accessibility impact
- Breaking changes + migration notes
- Test results

## Getting Help

- Open a Discussion on GitHub
- Check the README for build and testing commands
- Ask in issues with the `question` label

Thank you for helping make Mischief great!
