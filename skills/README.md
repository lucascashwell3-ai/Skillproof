# Skillproof skills

Installable Claude skills that ship Skillproof's capability into your own setup.

## skillproof-scout

Given a pain point (frontend design output, AI coding, AI workflows, agent tooling), it checks
the Skillproof **graded index** first, then scouts the ecosystem (GitHub, directories) for
candidates and triages each one against the Skillproof triage rubric — provenance, license,
freshness, safety red flags — returning a receipted shortlist. Read-only by design: it never
installs anything, and it never presents a scouted find as if it were graded.

### Install (Claude Code)

```bash
mkdir -p ~/.claude/skills/skillproof-scout
curl -fsSL https://raw.githubusercontent.com/lucascashwell3-ai/Skillproof/main/skills/skillproof-scout/SKILL.md \
  -o ~/.claude/skills/skillproof-scout/SKILL.md
```

Or clone this repo and copy `skills/skillproof-scout/` into your project's `.claude/skills/`.

Then ask naturally: *"find me a skill that makes my frontend output less generic"* — the skill
triggers on find/scout/what's-out-there phrasing.

### Relationship to the root SKILL.md

The repo root's `SKILL.md` is the deeper **research engine** (YouTube/X mining, sub-agent
fan-out, findings review gates) that Skillproof itself uses for discovery sessions. The scout
is the lightweight user-facing front end: one pain point in, one receipted shortlist out.

MIT · Grades and receipts: https://github.com/lucascashwell3-ai/Skillproof
