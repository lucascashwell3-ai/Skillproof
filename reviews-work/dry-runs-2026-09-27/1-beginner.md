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

**AI** · 1:29 · setup fingerprint `f3c6e9e7`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:29 · setup fingerprint `f3c6e9e7`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 3:57 · setup fingerprint `f3c6e9e7`

> Since you're not sure, I checked your setup — it's empty. Here's the plan:
>
> 1. Add **grill-me** (with grilling, the helper grill-me calls) — Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> 3. Add **caveman** — Type /caveman, and your AI answers in far fewer words until you say "normal mode".
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 3:57 · setup fingerprint `f3c6e9e7`

> yes

**AI** · 6:08 · setup fingerprint `8911be87`

> Installed.
> - grill-me: Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> - caveman: Type /caveman, and your AI answers in far fewer words until you say "normal mode".
> Undo: move grill-me, grilling, humanizer and caveman out of `~/.claude/skills/`. They load in a new session.

## Checks

| Check | Result |
|---|---|
| A beginner with nothing to say ends up with proven skills | PASS — grill-me (with grilling, named in the plan), humanizer, caveman in `~/.claude/skills/` |
| Installed in the right place | PASS — each folder has its SKILL.md under `~/.claude/skills/` |
| One clear line per skill, no bare "it" | PASS — each line is the list's `line`, word for word |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`f3c6e9e7`); only Skillproof's own folder was added, which the paste asks for |
| Backup + undo | PASS — the undo says "move … out of" every folder, helper included; nothing existing touched, so nothing needed a backup |
| Time | The person's own time ~1.2 min (193 words to read + 2 short replies). The AI's own work: 5:45. Paste to "Installed.": 6:08 |
| show-me | Left out without comment: its repo is still private, so its SKILL.md wouldn't open |
