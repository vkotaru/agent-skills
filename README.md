# agent skills

Personal agent skills in the open [Agent Skills](https://agentskills.io) format —
a folder with a `SKILL.md` (YAML frontmatter + Markdown instructions) and any
supporting files. They work with Claude Code, Codex CLI, Gemini CLI, GitHub
Copilot, Cursor, OpenCode, and any other agent that reads `SKILL.md`.

## Skills

| Skill | What it does |
|---|---|
| [`offline-first-pwa`](skills/offline-first-pwa/SKILL.md) | Build or retrofit an installable PWA that works fully offline: Dexie local DB, a `pendingSync` mutation queue, a bidirectional sync engine, service-worker update prompt, and the mobile baseline. Includes both server dialects (Express/SQLite and FastAPI/SQLAlchemy) and a verification checklist. |
| [`mcp-connector`](skills/mcp-connector/SKILL.md) | Turn a self-hosted, tailnet-only app into a custom remote MCP connector for a cloud-hosted assistant. Covers the separate internet-facing service and why it must not share the app's dependency tree, OAuth 2.1 with DCR and audience-bound rotating tokens, a read-only tool layer built on one query chokepoint, Tailscale Funnel and the ACL that stops the public node reaching anything else, a least-privilege database role, a verification checklist, and eleven traps that each cost real debugging time. |
| [`interactive-learning-site`](skills/interactive-learning-site/SKILL.md) | Build an interactive learning website that teaches a technical topic like a textbook: intuition before maths, every equation linked to a widget you can move, tiny worked examples, "try this" experiments, recap boxes instead of bare back-references, checkpoint quizzes. Gated stages (proposal, first chapters, review), a no-build React + KaTeX architecture, starter assets (widget toolkit, light/dark styles, seeded numerics), a code companion whose numbers and snippets are tested against the page, and a headless-Chrome screenshot script for checking desktop, phone and dark mode. |

## Install

### Any agent — `npx skills`

The [skills CLI](https://github.com/vercel-labs/skills) installs into whichever
agents it finds:

```bash
npx skills add vkotaru/claude-skills
```

Add `-g` for a user-level install, or `-a <agent>` (e.g. `-a codex`) to target
one agent.

### Claude Code — plugin marketplace

The skills are also published as Claude Code plugins, which gives you
`claude plugin update` and listing icons:

```bash
claude plugin marketplace add vkotaru/claude-skills
claude plugin install web-app-patterns@vkotaru-skills   # offline-first-pwa
claude plugin install self-hosted-mcp@vkotaru-skills    # mcp-connector
claude plugin install study-notes@vkotaru-skills        # interactive-learning-site
```

Restart Claude Code, or start a new session, and the skills load
automatically. To update later:

```bash
claude plugin marketplace update vkotaru-skills
claude plugin update web-app-patterns self-hosted-mcp study-notes
```

### Manually

Copy or symlink a skill folder into your agent's skills directory:

```bash
git clone https://github.com/vkotaru/claude-skills
ln -s "$PWD/claude-skills/skills/offline-first-pwa" ~/.agents/skills/
```

`.agents/skills/` (project) and `~/.agents/skills/` (personal) are read by many
agents, including Codex, Gemini CLI, Cursor and Copilot. Agent-specific
locations also work:

| Agent | Project | Personal |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex CLI | `.agents/skills/` | `~/.agents/skills/` |
| Gemini CLI | `.gemini/skills/` | `~/.gemini/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| GitHub Copilot | `.github/skills/` | `~/.copilot/skills/` |

These paths move between releases, so check your agent's docs if a skill doesn't
load.

## Layout

```
skills/<skill>/                     the skills — the only source of truth
  SKILL.md                          frontmatter (name, description) + instructions
  assets/ references/ scripts/      optional supporting files

.claude-plugin/marketplace.json     Claude Code marketplace
plugins/<plugin>/
  .claude-plugin/plugin.json        Claude Code plugin manifest + icon.png
  skills/<skill> -> ../../../skills/<skill>   symlink, resolved on install
```

Each skill is edited only under `skills/`. The `plugins/` folders are a thin
Claude Code packaging layer whose `skills/` entries are symlinks back to the
real folders.

### Adding a skill

1. Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter.
   Keep to the portable fields; Claude-only extras such as `argument-hint` are
   ignored by other agents, which is harmless.
2. To publish it through Claude Code too, symlink it into a plugin:
   `ln -s ../../../skills/<name> plugins/<plugin>/skills/<name>`. For a new
   plugin, also add a `plugins/<plugin>/.claude-plugin/plugin.json` and an entry
   in `.claude-plugin/marketplace.json`.
3. Add a row to the table above and to [AGENTS.md](AGENTS.md).

### Validating

`claude plugin validate` doesn't follow symlinks, so validate the marketplace
directly and a dereferenced copy of each plugin:

```bash
claude plugin validate .
for p in plugins/*; do
  t=$(mktemp -d); cp -RL "$p" "$t/"; claude plugin validate "$t/$(basename "$p")"
done
```

On Windows, clone with `git config core.symlinks true` (needs Developer Mode) or
the plugin symlinks check out as plain text files.
