# Earlier rounds — what went wrong on earlier drafts

**Why this exists:** the two earlier rounds on earlier drafts, kept so the fixes can be checked against what went wrong. Every slip below was fixed, then everyone was re-run from scratch.

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). "Setup unchanged" is a fingerprint of every file in the sandbox except Skillproof's own folder._

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

**User** · 0:00 · setup fingerprint `6d5984b4`

> (pastes the Skillproof prompt)

**AI** · 2:03 · setup fingerprint `6d5984b4`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 2:04 · setup fingerprint `6d5984b4`

> my AI starts writing code before it gets what I want, and it tells me stuff is fixed when it isn't

**AI** · 2:40 · setup fingerprint `6d5984b4`

> You want your AI to nail down what you're asking for before it starts writing code, and stop telling you something's fixed when it isn't. Right?

**User** · 2:40 · setup fingerprint `6d5984b4`

> yes

**AI** · 5:04 · setup fingerprint `6d5984b4`

> 1. Add **grill-me** — Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **verification-before-completion** — Your AI now runs the checks before saying "done", so "fixed" means fixed.
>
> Your CLAUDE.md line 6 says "Never use sub-agents" — grill-me's question rounds normally dispatch one to look up facts on their own; here it'll ask you those instead.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 5:04 · setup fingerprint `6d5984b4`

> yes

**AI** · 5:39 · setup fingerprint `97aff5fa`

> Installed.
> - grill-me: Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - verification-before-completion: Your AI now runs the checks before saying "done", so "fixed" means fixed.
>
> Undo: move `grill-me`, `grilling`, and `verification-before-completion` out of `~/.claude/skills/`. They load in a new session.

**User** · 0:00 · setup fingerprint `a0e4afaa`

> (pastes the Skillproof prompt)

**AI** · 2:54 · setup fingerprint `a0e4afaa`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 2:54 · setup fingerprint `a0e4afaa`

> look

**AI** · 4:31 · setup fingerprint `a0e4afaa`

> Here's the plan — all three go in `~/.agents/skills/`, next to commit-msg:
> 1. Add **grill-me** — Type $grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **show-me** — Your AI now shows long answers as one page you can scan, instead of a wall of text.
> 3. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 4:31 · setup fingerprint `a0e4afaa`

> yes

**AI** · 8:32 · setup fingerprint `84f9b33a`

> Installed.
> - grill-me: Type $grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> Undo: move grill-me, grilling, and humanizer out of `~/.agents/skills/`. They load in a new session.
>
> show-me didn't make it in — its source (lucascashwell3-ai/skills) doesn't resolve on GitHub, so there was nothing to read or verify. Dropped, not installed. Want caveman instead — next on the shelf: type $caveman, and your AI answers in far fewer words until you say "normal mode"?

## Checks

| Round | Slip | Fix |
|---|---|---|
| 1 | Plan and install lines were reworded and a bare "it" crept back in | Lines are used word for word from the list |
| 1 | All-rounders ranked by install count, so one author's three skills crowded out the most broadly helpful | All-rounders follow the list's own order |
| 1 | "Don't wait on me" was read as "skip the question" | Now: wait for my answer; only "I don't know" triggers the fallback |
| 1 | A recap line before "Installed." | The reply starts with "Installed." |
| 2 | 5–9 minutes on the clock; the first reply took ~2 minutes | The opening is asked before anything downloads; list skills are offered after opening their SKILL.md only, and read in full once, at install |
| 2 | "look" ignored the setup (a Python service got the same picks as an empty setup) | What the setup shows counts as the answer; all-rounders fill what's left |
| 2 | A skill whose repo wouldn't open was offered, then dropped after the yes | A pick whose SKILL.md won't open is left out before the plan |
