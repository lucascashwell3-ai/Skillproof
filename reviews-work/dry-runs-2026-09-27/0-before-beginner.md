# Before — the same beginner on the old version

**Version:** the Skillproof live on the site before this change (prompt ends "ask me one question — what am I trying to improve?").
**Who / app / setup / answers:** the same beginner, same empty Claude Code setup, same "idk" opening answer.

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). The setup fingerprint covers every file in the sandbox except Skillproof's own folder (the paste itself asks for that one); it stays at the start value until the yes._

**User** · 0:00 · setup fingerprint `f3c6e9e7`

> (pastes the old Skillproof prompt)

**AI** · 2:25 · setup fingerprint `f3c6e9e7`

> Skillproof's installed. What are you trying to improve?

**User** · 2:25 · setup fingerprint `f3c6e9e7`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 3:10 · setup fingerprint `f3c6e9e7`

> No stress. What do you mainly do with it so far — write code, write, research, something else?

**User** · 3:10 · setup fingerprint `f3c6e9e7`

> nothing yet really, i havent used it much

**AI** · 3:41 · setup fingerprint `f3c6e9e7`

> Got it — no problem to fix yet, you're just starting out. My guess: you want a couple of solid, proven skills installed now so you're not starting from zero, rather than fixing one specific thing. Right?

**User** · 3:41 · setup fingerprint `f3c6e9e7`

> yes

**AI** · 8:25 · setup fingerprint `f3c6e9e7`

> Pick: **prompt-master** — turns any rough idea into a ready-to-paste, tool-specific prompt (works for Claude Code, ChatGPT, image/video tools, anything). Read it end to end — clean, no shell commands, no credential reads, nothing hidden.
>
> Nothing in your setup fights this — you've got no other skills or rules yet, so it's a clean install, going in next to Skillproof.
>
> Plan:
> 1. Install `prompt-master` to `~/.claude/skills/prompt-master/` (its SKILL.md + 2 reference files).
>
> Go?

_Note_ · 8:25 · setup fingerprint `f3c6e9e7`

> (stopped here: the old version reached one unproven pick after three rounds of questions)

## Checks

| What happened | |
|---|---|
| Answers the beginner had to give before any suggestion | 3 ("idk", "nothing yet really", "yes" to a guess) |
| What it offered | one skill, `prompt-master`, from the old 100-entry catalog — no install count behind it |
| Extra talk | "Read it end to end — clean, no shell commands, no credential reads, nothing hidden." |
