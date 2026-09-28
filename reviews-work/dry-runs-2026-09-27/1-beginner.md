# Dry run 1 — a beginner with nothing to say

**Who:** a complete beginner who just installed Claude Code and has nothing to say.
**App:** Claude Code (played by a fresh Sonnet agent that had never seen Skillproof).
**Their setup:** empty — `~/.claude/settings.json` holding `{}`, an empty `~/Documents`. No skills, no instructions.
**Their answers, fixed in advance:** "idk honestly…" to the opening; "yes" to any plan.
**Start fingerprint:** `f3c6e9e7`

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). The setup fingerprint covers every file in the sandbox except Skillproof's own folder (the paste itself asks for that one); it stays at the start value until the yes._

**User** · 0:00 · setup fingerprint `f3c6e9e7`

> (pastes the Skillproof prompt)

**AI** · 1:48 · setup fingerprint `f3c6e9e7`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:48 · setup fingerprint `f3c6e9e7`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 4:42 · setup fingerprint `f3c6e9e7`

> show-me's source repo doesn't exist anymore, so here's the other three, added to your personal skills folder next to Skillproof:
>
> 1. Add **grill-me** — Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> 3. Add **caveman** — Type /caveman, and your AI answers in far fewer words until you say "normal mode".
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 4:42 · setup fingerprint `f3c6e9e7`

> yes

**AI** · 5:53 · setup fingerprint `8911be87`

> Installed.
> - grill-me: Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> - caveman: Type /caveman, and your AI answers in far fewer words until you say "normal mode".
>
> Undo: move grill-me, grilling, humanizer and caveman out of ~/.claude/skills/. They load in a new session.

## Checks

| Check | Result |
|---|---|
| A beginner with nothing to say ends up with proven skills | PASS — grill-me (+ grilling, which it calls), humanizer, caveman in `~/.claude/skills/` |
| Installed in the right place | PASS — each folder has its SKILL.md under `~/.claude/skills/` |
| One clear line per skill, no bare "it" | PASS — each line is the list's `line`, word for word |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`f3c6e9e7`); only Skillproof's own folder was added, which the paste itself asks for |
| Backup + undo | PASS — undo names every folder; no existing file was touched, so nothing needed a backup |
| The person's own time | ~1.2 min (193 words to read at 238 wpm + 2 short replies); wall clock 5:53 including the AI's work |
| show-me skipped | Expected: its repo is still private, so the AI couldn't read it and said so in one line |
