#!/bin/sh
# Installs local git hooks for this repository.
# Usage: ./scripts/install-hooks.sh
# Requires: git (and optionally gitleaks for the secret scan hook)

set -e

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

install_hook() {
  hook="$1"
  source="$SCRIPT_DIR/$2"
  dest="$HOOKS_DIR/$hook"
  if [ -e "$dest" ] && ! cmp -s "$dest" "$source"; then
    echo "WARNING: existing $dest differs; backing up to $dest.bak"
    cp "$dest" "$dest.bak"
  fi
  cp "$source" "$dest"
  chmod +x "$dest"
  echo "installed $hook"
}

install_hook pre-commit gitleaks-pre-commit.sh

echo "Hooks installed."
