# Security Policy

Security is a core design principle of Mischief. Please report vulnerabilities responsibly.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, report privately to the maintainers so we can fix the issue before it is disclosed.

- Open a **private vulnerability report** on GitHub (Repository → Security → Report a vulnerability)
- Or email the maintainers (address published via the repository's public metadata)

Please include:

- A description of the vulnerability
- Steps to reproduce
- Affected versions
- Impact assessment (if known)

We will acknowledge reports promptly and work with you on a fix and disclosure timeline. Responsible reporters will be credited (with permission).

## Security Posture

- **No accounts, no telemetry, no analytics.** The app is offline-first and privacy-first.
- **Experience Packs are data only** — they never execute code.
- **Plugins are sandboxed** and must declare permissions; nothing is granted by default.
- The Runtime never accesses user files outside approved application directories.
- See the README "Transparency" section for the full security model.

## Supported Versions

Security fixes are applied to the latest stable release and, where practical, backported to the previous major version.

## Disclosures

Once fixed and released, vulnerabilities are documented in release notes and the changelog.
