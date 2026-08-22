# Skillproof skills

Installable Claude skills that ship Skillproof's capability into your own setup.

## skillproof

Most skills fail *after* they're installed. They land in a setup that already has a long
CLAUDE.md, memory files, a dozen other skills and standing instructions — and they get
overridden, out-voted, or ignored. The person installs the thing and nothing changes.

This skill does the whole job in one short conversation — five beats:

1. **Readback.** Your problem in one line: "here's what I think is wrong — right?"
2. **Find.** What you already have installed, then the Skillproof catalog and live GitHub
   sources in the same pass. It reads the source of anything before recommending it.
3. **Fit-check + plan.** It reads your setup (CLAUDE.md, installed skills, settings), names
   what would fight the install in plain words, and shows one numbered plan — every file it
   would touch.
4. **Your yes.** Nothing is written before it. A no to any part just cuts that part.
5. **Execute + confirm.** Backup first, install, verify it actually triggers, hand you the
   undo. "You're all set."

It edits your setup — that's the point — but never without the plan and your yes, it backs up
before every edit, and it never deletes. The full contract is in
[`references/consent.md`](skillproof/references/consent.md); read it before you install.

### Install (Claude Code)

```bash
for f in SKILL.md references/consent.md references/conflict-patterns.md references/install-paths.md references/finding.md references/security.md; do curl -fsSL --create-dirs https://raw.githubusercontent.com/lucascashwell3-ai/Skillproof/main/skills/skillproof/$f -o ~/.claude/skills/skillproof/$f; done
```

Six files to disk, nothing piped into a shell. Or clone this repo and copy `skills/skillproof/`
into `~/.claude/skills/` (everywhere) or `<project>/.claude/skills/` (one project).

Then ask naturally: *"find me a skill that makes my frontend output less generic"*, *"install
this for me"*, or *"why isn't this skill working"*.

**Renamed 2026-08-03** from `skillproof-scout`. Scouting is only the first beat, so the old
name undersold it. If you installed the old one, delete `~/.claude/skills/skillproof-scout/`
after installing this — otherwise both fire on the same requests.

### Relationship to the root SKILL.md

The repo root's `SKILL.md` is the deeper **research engine** (YouTube/X mining, sub-agent
fan-out, findings review gates) that Skillproof itself uses for discovery sessions. This one is
the user-facing product: your problem in, a working install out.

MIT · Source: https://github.com/lucascashwell3-ai/Skillproof
