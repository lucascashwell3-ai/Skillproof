# Skillproof skills

Installable skills that ship Skillproof's capability into your own setup.

## skillproof

Most skills fail *after* they're installed. They land in a setup that already has a long
CLAUDE.md, memory files, a dozen other skills and standing instructions — and they get
overridden, out-voted, or ignored. The person installs the thing and nothing changes.

This skill does the whole job in one short conversation — five beats:

1. **Open.** One question: what do you want your AI to do better? "Not sure" is a fine answer.
2. **Find.** It reads your setup (read-only) and Skillproof's short list of proven skills,
   and opens each pick's source before offering it.
3. **Plan.** One short numbered list — every file it would touch, any clash with your own
   rules named in a line.
4. **Your yes.** Nothing is written before it, Skillproof itself included. A no to any part
   cuts that part.
5. **Install.** Backup first, one line per skill, then the exact undo.

It works on Windows, Mac and Linux, in coding apps and chat apps. Where an app or a work
laptop can't keep skills, you get a copy-paste version to keep in a project instead.

It edits your setup — that's the point — but never without the plan and your yes, it backs up
before every edit, and it never deletes. The full contract is in
[`references/consent.md`](skillproof/references/consent.md); read it before you install.

### Install (Claude Code)

```bash
for f in SKILL.md references/consent.md references/conflict-patterns.md references/install-paths.md references/finding.md references/security.md; do curl -fsSL --create-dirs https://raw.githubusercontent.com/lucascashwell3-ai/Skillproof/main/skills/skillproof/$f -o ~/.claude/skills/skillproof/$f; done
```

On Windows (PowerShell):

```powershell
foreach ($f in 'SKILL.md','references/consent.md','references/conflict-patterns.md','references/install-paths.md','references/finding.md','references/security.md') { $p = "$HOME\.claude\skills\skillproof\$f"; New-Item -ItemType Directory -Force (Split-Path $p) | Out-Null; curl.exe -fsSL "https://raw.githubusercontent.com/lucascashwell3-ai/Skillproof/main/skills/skillproof/$f" -o $p }
```

Six files to disk, nothing piped into a shell. Or clone this repo and copy `skills/skillproof/`
into `~/.claude/skills/` (everywhere) or `<project>/.claude/skills/` (one project).

Then ask naturally: *"find me a skill that makes my frontend output less generic"*, *"install
this for me"*, or *"why isn't this skill working"*.

**Renamed 2026-08-03** from `skillproof-scout`. Scouting is only the first beat, so the old
name undersold it. If you installed the old one, move `~/.claude/skills/skillproof-scout/` out
after installing this — otherwise both fire on the same requests.

### The old research tool

The July research skill (YouTube/X mining) that used to sit at the repo root under the same
name now lives in [`archive/research-engine/`](../archive/research-engine/). Nothing installs it.

MIT · Source: https://github.com/lucascashwell3-ai/Skillproof
