# First pass — all three personas on an earlier draft

**Why this exists:** the first cold pass of all three personas, on an earlier draft. Each slip below was fixed in the skill and the prompt, then all three were re-run from scratch — see 1-beginner.md, 2-claude-code.md and 3-codex.md.

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). The setup fingerprint covers every file in the sandbox except Skillproof's own folder (the paste itself asks for that one); it stays at the start value until the yes._

**User** · 0:00 · setup fingerprint `f3c6e9e7`

> (pastes the Skillproof prompt)

**AI** · 1:43 · setup fingerprint `f3c6e9e7`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:43 · setup fingerprint `f3c6e9e7`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 4:36 · setup fingerprint `f3c6e9e7`

> Nothing in your setup fights this — clean install. Here's the plan:
>
> 1. Add **grill-me** — type /grill-me before a plan or decision, and your AI asks questions until it holds up.
> 2. Add **teach** — type /teach and a topic, and your AI teaches it step by step, saving lessons as you go.
> 3. Add **handoff** — type /handoff when a chat gets long, and your AI writes a note a fresh chat can pick up from.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 4:36 · setup fingerprint `f3c6e9e7`

> yes

**AI** · 5:17 · setup fingerprint `dac22675`

> Installed.
>
> - grill-me: type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - teach: type /teach and a topic, and your AI teaches it step by step, saving each lesson.
> - handoff: type /handoff when a chat gets long, and your AI writes a note a fresh chat can pick up from.
>
> Undo: move grill-me, grilling, teach, and handoff out of ~/.claude/skills/. Takes effect in a new chat.

**User** · 0:00 · setup fingerprint `6d5984b4`

> (pastes the Skillproof prompt)

**AI** · 5:46 · setup fingerprint `6d5984b4`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.
>
> Here's the plan:
> 1. Add **verification-before-completion** (`~/.claude/skills/verification-before-completion/`) — your AI runs the checks before saying "done," which is exactly your own CLAUDE.md rule ("tell me how you checked"), just automatic now.
> 2. Swap **frontend-polish** for **frontend-design** — your current one is two lines ("make it look nice, add animations"); this replaces it with a real design process for the store's pages. I back up frontend-polish first.
> 3. Add **humanizer** (`~/.claude/skills/humanizer/`) — say "humanize this" on a drafted product email and it stops reading like AI wrote it.
>
> Nothing in your setup fights these — no sub-agents involved, and short-answers already has your terse-reply preference covered, so I left that alone.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 5:46 · setup fingerprint `6d5984b4`

> yes

**AI** · 7:24 · setup fingerprint `b8350fe7`

> Installed.
> - verification-before-completion: your AI now runs the checks before saying "done," so "fixed" means fixed.
> - frontend-design: your AI now designs the store's pages with real visual direction instead of the generic "make it look nice" default.
> - humanizer: say "humanize this" on a draft and your AI rewrites it so it reads like a person, not a chatbot.
>
> Undo: remove `~/.claude/skills/frontend-design/`, `~/.claude/skills/verification-before-completion/`, and `~/.claude/skills/humanizer/`; move `~/.claude/skillproof-backups/2026-09-27/skills/frontend-polish/` back to `~/.claude/skills/frontend-polish/` to restore the old one. These take effect in a new chat, not this one.

**User** · 0:00 · setup fingerprint `a0e4afaa`

> (pastes the Skillproof prompt)

**AI** · 5:56 · setup fingerprint `a0e4afaa`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.
>
> Nothing to go on, so I looked — read-only. Here's the plan:
>
> 1. Add **verification-before-completion** — your AI now runs the actual tests before saying "done" or "fixed," so it backs up your AGENTS.md rule instead of just trusting it.
> 2. Add **diagnosing-bugs** — on a hard bug, your AI builds a repro loop and narrows it down step by step instead of guessing.
> 3. Add **grill-me** — type `$grill-me` before a plan, and your AI questions it until it holds up. Catches scope creep before it happens, which fits your "keep diffs minimal" rule.
>
> Nothing in your setup fights these — clean install, and none of it overlaps your existing commit-msg skill.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 5:56 · setup fingerprint `a0e4afaa`

> yes

**AI** · 6:33 · setup fingerprint `fb4d9b2e`

> All four folders landed with their `SKILL.md` confirmed, matching what I read and reviewed. No existing files touched, so no backups needed.
>
> Installed.
> - verification-before-completion: your AI now runs the checks before saying "done" or "fixed," so it backs your AGENTS.md rule with real evidence.
> - diagnosing-bugs: on a hard bug, your AI builds a repro loop and works it step by step instead of guessing.
> - grill-me: type `$grill-me` before a plan, and your AI questions it until it holds up.
>
> Undo: delete `~/.agents/skills/verification-before-completion/`, `~/.agents/skills/diagnosing-bugs/`, `~/.agents/skills/grill-me/`, and `~/.agents/skills/grilling/`. Takes effect in a new session.

## Checks

| Slip | Fix |
|---|---|
| Plan and install lines were reworded, and a bare "it" crept back in ("teaches it step by step", "questions it until it holds up") | Plan and install lines now use each skill's `line` word for word |
| All-rounders ranked by install count, so three of one author's skills crowded out the most broadly helpful ones | All-rounders follow the list's own order |
| "If I don't know what to say, don't wait on me" was read as "skip the question" | Prompt now says: wait for my answer; only "I don't know" triggers the fallback |
| A recap line before "Installed." | The install reply starts with "Installed." |
