#!/bin/sh
# gitleaks pre-commit hook: blocks commits containing staged secrets.
# Installed by scripts/install-hooks.sh. Runs only if gitleaks is available.

if command -v gitleaks >/dev/null 2>&1; then
  if ! gitleaks protect --staged --no-banner --redact; then
    echo "gitleaks: possible secret(s) found in staged changes. Commit blocked."
    exit 1
  fi
fi

exit 0
