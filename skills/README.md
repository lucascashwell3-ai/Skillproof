# Skillproof skills

Installable Claude skills that ship Skillproof's capability into your own setup.

## skillproof

Most skills fail *after* they're installed. They land in a setup that already has a long
CLAUDE.md, memory files, a dozen other skills and standing instructions — and they get
overridden, out-voted, or ignored. The person installs the thing and nothing changes.

This skill does the whole job in six phases:

1. **Find** the right resource for what you described — Skillproof's catalog first, the wider
   ecosystem after, with what-it-does / what-it-touches / how-to-undo-it on every candidate.
2. **Read your setup**, read-only — global and project `CLAUDE.md`, installed skills, settings,
   memory, plugins.
3. **Say what will fight it**, in plain words: contradictions, overlap, instruction dilution,
   trigger collisions, blocked tools, automation that will overwrite it.
4. **Show every change** it wants to make, numbered, before asking for anything.
5. **Ask permission per change.** One yes does not carry to the next file.
6. **Make the change, confirm it works, hand over the undo.**

It edits your setup — that's the point — but it never writes anything without an explicit yes
for that specific change, it backs up before every edit, and it never deletes. The full contract
is in [`references/consent.md`](skillproof/references/consent.md); read it before you install.

### Install (Claude Code)

```bash
for f in SKILL.md references/consent.md references/conflict-patterns.md references/install-paths.md references/tiers.md references/finding.md; do curl -fsSL --create-dirs https://raw.githubusercontent.com/lucascashwell3-ai/Skillproof/main/skills/skillproof/$f -o ~/.claude/skills/skillproof/$f; done
```

Six files to disk, nothing piped into a shell. Or clone this repo and copy `skills/skillproof/`
into `~/.claude/skills/` (everywhere) or `<project>/.claude/skills/` (one project).

Then ask naturally: *"find me a skill that makes my frontend output less generic"*, *"install
this for me"*, or *"why isn't this skill working"*.

**Renamed 2026-08-03** from `skillproof-scout`. Scouting is phase 1 of 6, so the old name
undersold it. If you installed the old one, delete `~/.claude/skills/skillproof-scout/` after
installing this — otherwise both fire on the same requests.

### Relationship to the root SKILL.md

The repo root's `SKILL.md` is the deeper **research engine** (YouTube/X mining, sub-agent
fan-out, findings review gates) that Skillproof itself uses for discovery sessions. This one is
the user-facing product: your problem in, a working install out.

MIT · Grades and receipts: https://github.com/lucascashwell3-ai/Skillproof
