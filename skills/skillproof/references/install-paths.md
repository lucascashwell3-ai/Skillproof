# Install paths — where the thing actually goes

You cannot give a working install command without knowing what they're running. Ask once, plainly,
and accept "I don't know":

> Quick thing so I give you a command that actually works — what are you using?
> **Claude Code** (terminal or the desktop app) · **Cursor** · **Claude Desktop** ·
> **Codex / something else** · not sure

If they don't know: ask whether they type commands into a terminal to work with AI (→ Claude
Code) or use an editor with AI built in (→ Cursor). That resolves it nearly always.

| They're running | Path |
|---|---|
| **Claude Code** | `claude plugin marketplace add <owner>/<repo> && claude plugin install <name>@<marketplace>` when the repo ships a plugin manifest. Otherwise a personal skill: the folder goes in `~/.claude/skills/<name>/`; project-only in `<project>/.claude/skills/<name>/`. |
| **Cursor** | No plugin system. Skills that are pure markdown rules go in the project's rules (`.cursor/rules/`). Anything shipping scripts or hooks needs Claude Code — say so instead of improvising. |
| **Claude Desktop** | Skills load from the app's skills folder; MCP servers are added in Settings → Developer. If it's a CLI-only skill, say it won't work here. |
| **Codex / other** | Say plainly that the catalog is built around Claude-family tooling and you can't promise the integration. Give them the repo and the three questions. |

**MCP** means Model Context Protocol — a way to plug an outside tool into your AI. Spell that out
the first time you use it; never leave the acronym bare.

## Global or project?

Ask in phase 2, before reading anything:

> Do you want this everywhere you work, or just in one project?

- **Everywhere** → global (`~/.claude/skills/`), and the conflicts that matter are in the global
  CLAUDE.md and the other global skills.
- **One project** → project (`<project>/.claude/skills/`), and you read that project's CLAUDE.md
  too. Project instructions load *on top of* global ones, so both can conflict.

When in doubt, project scope is the safer default — it's easier to undo and it can't affect
their other work.

## If it genuinely doesn't fit

Say that first and stop. Don't improvise a path that half-works. "This one needs Claude Code and
you're on Cursor" is a complete, useful answer.
