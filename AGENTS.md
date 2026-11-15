# AGENTS.md

This repository is a library of agent skills in the open Agent Skills format.
It is not an application: there is nothing to build or run.

## Skills

Each skill is a folder under `skills/`. Read its `SKILL.md` before using it.

- `skills/offline-first-pwa/`: build or retrofit an offline-first, installable PWA with a local DB and sync engine.
- `skills/mcp-connector/`: expose a self-hosted, private app to a cloud-hosted assistant as a remote MCP connector, safely.
- `skills/interactive-learning-site/`: build a textbook-style interactive learning site with equation-linked widgets.

## Working in this repo

- `skills/` is the only source of truth. Never edit through `plugins/*/skills/*`:
  those are symlinks for Claude Code packaging.
- Keep `SKILL.md` frontmatter to `name` (matching the folder name) and
  `description`. Other fields are agent-specific and optional.
- Refer to supporting files with paths relative to the skill folder
  (`references/…`, `assets/…`, `scripts/…`), never absolute or plugin-root paths.
- Write skill bodies so any agent can follow them. Name a specific agent only
  when the content really depends on it, and say so when it does.
- When adding or renaming a skill, update the tables in `README.md` and this
  file, and the symlink and manifests under `plugins/` if it ships as a Claude
  Code plugin.
