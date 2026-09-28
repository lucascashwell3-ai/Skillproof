# Run 1 — a beginner with nothing to say (Claude Code)

**Who:** a complete beginner who just installed Claude Code and has nothing to say.
**App:** Claude Code (played by a fresh Sonnet agent that had never seen Skillproof).
**Their setup:** empty — `~/.claude/settings.json` holding `{}`, an empty `~/Documents`. No skills, no instructions.
**Their answers, fixed in advance:** "idk honestly…" to the opening; "yes" to any plan.
**Start fingerprint:** `f3c6e9e7`

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). "Setup unchanged" is a fingerprint of every file in the sandbox except Skillproof's own folder._

**User** · 0:00 · setup fingerprint `f3c6e9e7`

> (pastes the Skillproof prompt)

**AI** · 1:30 · setup fingerprint `f3c6e9e7`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:30 · setup fingerprint `f3c6e9e7`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 3:43 · setup fingerprint `f3c6e9e7`

> Your setup's empty — no existing skills or AI rules to go on — so here's a solid all-around starting set:
>
> Here's the plan:
> 1. Add **grill-me** — Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> 3. Add **caveman** — Type /caveman, and your AI answers in far fewer words until you say "normal mode".
>
> These go in your personal skills folder, next to Skillproof itself. Nothing changes until you say go, and you can undo anytime. Go?

**User** · 3:43 · setup fingerprint `f3c6e9e7`

> yes

**AI** · 5:26 · setup fingerprint `8911be87`

> Installed.
> - grill-me: Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> - caveman: Type /caveman, and your AI answers in far fewer words until you say "normal mode".
> Undo: delete `~/.claude/skills/grill-me`, `~/.claude/skills/grilling`, `~/.claude/skills/humanizer`, and `~/.claude/skills/caveman`. Takes effect in a new session.

## Checks

| Check | Result |
|---|---|
| A beginner with nothing to say ends up with proven skills | PASS — grill-me (+ grilling, which it calls), humanizer, caveman in `~/.claude/skills/` |
| Installed in the right place | PASS — each folder has its SKILL.md under `~/.claude/skills/` |
| One clear line per skill, no bare "it" | PASS — each line is the list's `line`, word for word |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`f3c6e9e7`); only Skillproof's own folder was added, which the paste asks for |
| Backup + undo | PASS — undo names every folder; no existing file was touched, so nothing needed a backup |
| Time | The person's own time ~1.3 min (205 words to read + 2 short replies). The AI's own work: 5:07 |
| show-me | Left out without comment: its repo is still private, so its SKILL.md wouldn't open |
