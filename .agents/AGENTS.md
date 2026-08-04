# Workspace Agent Rules

## Privacy & Repository Boundaries
- **Main Docs/ is Strictly Private**: The `Main Docs/` directory and any files within it (such as `KNOWN_ISSUES.md`, `LAWS.md`, `RULES.md`, etc.) are private master specifications.
- **NEVER Stage or Commit Main Docs**: Under no circumstances should `git add`, `git commit`, or `git push` include any file inside `Main Docs/`.
- **Enforce .gitignore**: Ensure `Main Docs/` remains in `.gitignore`. If any file in `Main Docs/` ever becomes tracked, run `git rm --cached` immediately to untrack it without deleting the local file.
