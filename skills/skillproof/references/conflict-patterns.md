# The six conflicts — how to spot each one

A skill that gets overridden by the setup it lands in is worse than no skill, because the person
thinks it's working. These are the six ways that happens, in the order they're worth checking.

Everything here is read-only. Finding a conflict never licenses fixing it — that's the plan and its yes (beats 3–5).

---

## 1. Direct contradiction

A standing instruction says the opposite of what the new skill needs.

**Where to look:** `~/.claude/CLAUDE.md`, project `CLAUDE.md`, output styles, `settings.json`
(hooks, permissions), and any always-loaded memory file.

**What it looks like:** a global rule banning subagents against a subagent-driven skill. A
"never write files without asking" rule against a skill whose whole job is writing files. A
"max terse, no headers" output style against a skill that produces structured reports.

**Why it matters most:** the global instruction usually wins, and it wins silently. The person
sees a skill that "doesn't do anything."

**How to say it:** name the file, the line number, and what breaks. Nothing else.

## 2. Overlap

Something already installed covers the same ground.

**Where to look:** every `description` in `~/.claude/skills/*/SKILL.md` and project
`.claude/skills/`, plus plugin skills.

**What it looks like:** two skills that both claim frontend design work. Two that both claim
"use before finishing a task."

**Why it matters:** the model picks one, and not reliably the one they wanted. Two half-loaded
skills are worse than one.

**The honest options:** keep one, merge them, or narrow one's trigger words. Say which you'd
pick and why, in a clause. It's their call.

## 3. Dilution

The instruction pile is big enough that anything new lands in noise.

**How to measure — do this, don't estimate:**
- line count of every always-loaded instruction file (global + project CLAUDE.md, memory index)
- number of installed skills, and the number of plugin skills whose descriptions load every
  session (plugin packs are the usual culprit — dozens of descriptions for a pack used once)
- total words across always-loaded memory

**What it looks like:** "be terse" stopped working months ago. Rules get followed for a few
turns and then don't. Instructions contradict each other in different files.

**Why it matters:** the model reads everything kept. Every stale line competes with the ones
that matter. A new skill's instructions are a small voice in a large room.

**How to say it:** the number, then the consequence. "Your CLAUDE.md is 281 lines and you have
8 plugin packs loading descriptions every session. Anything new competes with all of it."

Fixing this is the boris cycle — archive what's stale, one home per fact, uninstall packs with
no real use. Offer it as its own change, never bundled with the install.

## 4. Trigger collision

Two skills whose `description` fields fire on the same words.

**How to spot:** pull every installed skill's description, and compare its trigger phrases
against the new one's. Look for the same verbs and the same nouns, not identical sentences.

**Different from overlap:** overlap is two skills doing the same job. Collision is two skills
being *summoned* by the same request, even when their jobs differ.

**The fix is usually small:** narrow one description's trigger words. Say which one and what to.

## 5. Blocked tools

The skill needs a tool or permission the setup denies.

**Where to look:** the new skill's `allowed-tools`, against `settings.json` /
`settings.local.json` permission rules (deny lists, ask rules), and whether the tools it needs
exist in the tool they're running at all.

**What it looks like:** a skill that needs Bash in a setup that denies Bash. A skill needing a
tool the product doesn't have (see install-paths.md — Cursor has no plugin system).

**Say it first and stop** if the answer is "this can't work here." A command that fails silently
is worse than "this one isn't for your setup."

## 6. Automation drift

A hook or scheduled job that will overwrite or fight the new skill.

**Where to look:** hooks in `settings.json`, scheduled tasks, anything that WRITES a file the
new skill also writes — especially auto-formatters, sync daemons, and nightly routines.

**What it looks like:** a skill writes a config a nightly job regenerates. A session-start hook
that re-injects an instruction the new skill contradicts.

**Why it matters:** it works today and breaks tomorrow, which is the hardest kind to diagnose.
The person will blame the skill.

---

## When nothing conflicts

Say it in one line and move on. "Nothing in your setup fights this — it's a clean install."

Do not manufacture findings to look thorough. A false conflict costs more trust than a missed
one, because they'll check.
