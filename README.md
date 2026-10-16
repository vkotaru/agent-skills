# claude-skills

Personal [Claude Code](https://claude.ai/code) skills, distributed as a plugin marketplace.

## Install

```bash
claude plugin marketplace add vkotaru/claude-skills
claude plugin install web-app-patterns@vkotaru-skills
claude plugin install self-hosted-mcp@vkotaru-skills
claude plugin install study-notes@vkotaru-skills
```

Restart Claude Code, or start a new session, and the skills load automatically.

To update later:

```bash
claude plugin marketplace update vkotaru-skills
claude plugin update web-app-patterns
claude plugin update self-hosted-mcp
claude plugin update study-notes
```

## Plugins

### `web-app-patterns`

Opinionated, end-to-end architecture recipes for small web apps.

| Skill | What it does |
|---|---|
| `offline-first-pwa` | Build or retrofit an installable PWA that works fully offline: Dexie local DB, a `pendingSync` mutation queue, a bidirectional sync engine, service-worker update prompt, and the mobile baseline. Includes both server dialects (Express/SQLite and FastAPI/SQLAlchemy) and a verification checklist. |

### `self-hosted-mcp`

Exposing a privately hosted app to Claude without handing the internet a route
into it.

| Skill | What it does |
|---|---|
| `mcp-connector` | Turn a self-hosted, tailnet-only app into a custom remote MCP connector. Covers the separate internet-facing service and why it must not share the app's dependency tree, OAuth 2.1 with DCR and audience-bound rotating tokens, a read-only tool layer built on one query chokepoint, Tailscale Funnel and the ACL that stops the public node reaching anything else, a least-privilege database role, a verification checklist, and eleven traps that each cost real debugging time. |

### `study-notes`

Learning (or teaching) a topic properly by building it as an interactive textbook site.

| Skill | What it does |
|---|---|
| `interactive-learning-site` | Build an interactive learning website that teaches a technical topic like a textbook: intuition before maths, every equation linked to a widget you can move, tiny worked examples, "try this" experiments, recap boxes instead of bare back-references, checkpoint quizzes. Gated stages (proposal, first chapters, review), a no-build React + KaTeX architecture, starter assets (widget toolkit, light/dark styles, seeded numerics), a code companion whose numbers and snippets are tested against the page, and a headless-Chrome screenshot script for checking desktop, phone and dark mode. |

## Local development

Point Claude Code at a working copy instead of the published repo:

```bash
claude plugin marketplace add /path/to/claude-skills
```

Validate before committing:

```bash
claude plugin validate .
claude plugin validate ./plugins/web-app-patterns
claude plugin validate ./plugins/self-hosted-mcp
claude plugin validate ./plugins/study-notes
```

## Layout

```
.claude-plugin/marketplace.json     the marketplace others add
plugins/<plugin>/
  .claude-plugin/plugin.json        the plugin manifest
  skills/<skill>/SKILL.md           one directory per skill
```

Adding a skill means adding a directory under an existing plugin's `skills/`.
Adding a plugin means a new entry in `marketplace.json` alongside it.

## License

MIT
