# Earlier rounds — what went wrong on earlier drafts

**Why this exists:** the earlier rounds on earlier drafts (all three people in rounds 1–2; all five in round 3; five again in round 4, with the Claude Code, Codex and ChatGPT people re-run after fixes), kept so the fixes can be checked against what went wrong. Every slip below was fixed, then everyone was re-run from scratch.

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

**User** · 0:00 · setup fingerprint `6d5984b4`

> (pastes the Skillproof prompt)

**AI** · 1:30 · setup fingerprint `6d5984b4`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:30 · setup fingerprint `6d5984b4`

> my AI starts writing code before it gets what I want, it tells me stuff is fixed when it isn't, and my store pages look generic

**AI** · 2:39 · setup fingerprint `6d5984b4`

> So: your AI should hold off writing code until it's clear on what you want, stop claiming things are fixed when they're not, and your store pages need to look less generic — right?

**User** · 2:39 · setup fingerprint `6d5984b4`

> yes

**AI** · 5:32 · setup fingerprint `6d5984b4`

> Here's the plan:
>
> 1. Add **grill-me** — Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **verification-before-completion** — Your AI now runs the checks before saying "done," so "fixed" means fixed.
> 3. Swap **frontend-polish** for **frontend-design** — Your AI now designs pages with a clear visual direction instead of the usual template look. I back up frontend-polish first.
>
> Clash: your CLAUDE.md line 6 says never use sub-agents — grill-me normally sends one off to look up facts. Plan: it looks things up here in the chat instead.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 5:32 · setup fingerprint `6d5984b4`

> yes

**AI** · 6:53 · setup fingerprint `806394b9`

> Installed.
> - grill-me: Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - verification-before-completion: Your AI now runs the checks before saying "done," so "fixed" means fixed.
> - frontend-design: Your AI now designs pages with a clear visual direction instead of the usual template look.
>
> Undo: move grill-me, grilling, verification-before-completion, and frontend-design out of `~/.claude/skills/`. frontend-polish is backed up at `~/.claude/skillproof-backups/2026-09-27/frontend-polish` — move it back if you want it instead. Takes effect in a new session.

**User** · 0:00 · setup fingerprint `a0e4afaa`

> (pastes the Skillproof prompt)

**AI** · 1:37 · setup fingerprint `a0e4afaa`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:37 · setup fingerprint `a0e4afaa`

> look

**AI** · 4:13 · setup fingerprint `a0e4afaa`

> Read your setup — nothing asked, since files told the story: `api-service` is a Python 3.12 FastAPI project, your AGENTS.md already says "keep diffs minimal" and "run tests before saying anything works," and you've already got a `commit-msg` skill for conventional commits. Here's the plan:
>
> 1. Add **verification-before-completion** — Your AI now runs the checks before saying "done," so "fixed" means fixed.
> 2. Add **karpathy-guidelines** — Your AI now keeps code changes small, names assumptions up front, and stops overbuilding.
>
> Both go in your personal skills, next to commit-msg. Nothing changes until you say go, and you can undo anytime. Go?

**User** · 4:13 · setup fingerprint `a0e4afaa`

> yes

**AI** · 5:01 · setup fingerprint `25b1eabb`

> Installed.
> - verification-before-completion: your AI now runs the checks before saying "done," so "fixed" means fixed.
> - karpathy-guidelines: your AI now keeps code changes small, names assumptions up front, and stops overbuilding.
> Undo: delete `~/.agents/skills/verification-before-completion/` and `~/.agents/skills/karpathy-guidelines/`. Both take effect in a new session.

**User** · 0:00 · setup fingerprint `d41d8cd9`

> (pastes the Skillproof prompt)

**AI** · 2:54 · setup fingerprint `d41d8cd9`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 2:54 · setup fingerprint `d41d8cd9`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 8:05 · setup fingerprint `4127e879`

> Skillproof's installed — skillproof.zip is ready above. Upload it: Customize → Skills → add → upload the zip (turn on code execution first, if it isn't already: Settings → Capabilities).
>
> Which is closest? Reply with a number: 1 Writing and email · 2 Learning · 3 Planning and decisions · 4 Coding · 5 A bit of everything

**User** · 8:05 · setup fingerprint `4127e879`

> 1

**AI** · 11:03 · setup fingerprint `4127e879`

> 1. Add **grill-me** — Say "use grill-me" before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **caveman** — Say "use caveman", and your AI answers in far fewer words until you say "normal mode".
> 3. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 11:03 · setup fingerprint `4127e879`

> yes

**AI** · 13:54 · setup fingerprint `2c8cf15c`

> Installed.
> - grill-me: Say "use grill-me" before a plan or big decision, and your AI asks questions until the plan holds up.
> - caveman: Say "use caveman", and your AI answers in far fewer words until you say "normal mode".
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
>
> Upload each zip above to use them — Customize → Skills → add → upload the zip (grill-me needs its small grilling.zip companion uploaded too, four zips total).
>
> Undo: remove any of them under Customize → Skills. They take effect in a new chat.

**User** · 0:00 · setup fingerprint `d41d8cd9`

> (pastes the Skillproof prompt)

**AI** · 1:29 · setup fingerprint `d41d8cd9`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:29 · setup fingerprint `d41d8cd9`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 4:46 · setup fingerprint `d41d8cd9`

> Here's the plan:
> 1. Add **grill-me** — Say "use grill-me" before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> 3. Add **caveman** — Say "use caveman", and your AI answers in far fewer words until you say "normal mode".
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 4:46 · setup fingerprint `d41d8cd9`

> yes

**AI** · 8:00 · setup fingerprint `f8979efd`

> Installed.
> - grill-me: Say "use grill-me" before a plan or big decision, and your AI asks questions until the plan holds up.
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> - caveman: Say "use caveman", and your AI answers in far fewer words until you say "normal mode".
>
> Undo: delete grill-me, humanizer, and caveman under Skills.
>
> Upload each zip first — grill-me.zip, humanizer.zip, caveman.zip — via Customize → Skills → add; takes effect in a new chat.

**User** · 0:00 · setup fingerprint `d41d8cd9`

> (pastes the Skillproof prompt)

**AI** · 1:37 · setup fingerprint `d41d8cd9`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:37 · setup fingerprint `d41d8cd9`

> my answers are way too long

**AI** · 4:47 · setup fingerprint `d41d8cd9`

> Got it — you want shorter answers, not walls of text. Right?

**User** · 4:47 · setup fingerprint `d41d8cd9`

> yes

**AI** · 5:06 · setup fingerprint `d41d8cd9`

> ChatGPT Free and Plus can't keep skills. The free Claude app can (claude.ai → Customize → Skills), and so can ChatGPT Business, Codex, Cursor and Gemini — paste this prompt there.

**User** · 0:00 · setup fingerprint `6d5984b4`

> (pastes the Skillproof prompt)

**AI** · 1:29 · setup fingerprint `6d5984b4`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:29 · setup fingerprint `6d5984b4`

> my AI starts writing code before it gets what I want, it tells me stuff is fixed when it isn't, and my store pages look generic

**AI** · 3:19 · setup fingerprint `6d5984b4`

> You want your AI to stop writing code before it's clear what you're asking for, stop saying things are fixed when they're not, and make your store pages look less generic. Right?

**User** · 3:20 · setup fingerprint `6d5984b4`

> yes

**AI** · 6:01 · setup fingerprint `6d5984b4`

> Here's the plan:
> 1. Swap **frontend-polish** for **frontend-design** — Your AI now designs pages with a clear visual direction instead of the usual template look.
> 2. Add **grill-me** (with grilling, the helper grill-me calls) — Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> 3. Add **verification-before-completion** — Your AI now runs the checks before saying "done", so "fixed" means fixed.
>
> I back up frontend-polish first. Nothing changes until you say go, and you can undo anytime. Go?

**User** · 6:01 · setup fingerprint `6d5984b4`

> yes

**AI** · 8:30 · setup fingerprint `b9986637`

> All installed and verified. Frontend-polish is moved aside, not deleted.
>
> Installed.
> - frontend-design: Your AI now designs pages with a clear visual direction instead of the usual template look.
> - grill-me: Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - verification-before-completion: Your AI now runs the checks before saying "done", so "fixed" means fixed.
>
> One clash worth knowing: grilling's own instructions (grill-me's helper) say to dispatch a sub-agent for fact-finding — your CLAUDE.md says never use sub-agents, do everything in this chat. Your CLAUDE.md wins, silently: grill-me will still ask its rounds of questions, it just won't spin up a sub-agent to look things up first. Nothing to fix unless you want that sub-agent step; your call.
>
> Undo: move grill-me, grilling, frontend-design and verification-before-completion out of `~/.claude/skills/`, and move frontend-polish back from `~/.claude/skillproof-backups/2026-09-27/skills/frontend-polish/`. All four new skills load in a new session.

**User** · 0:00 · setup fingerprint `a0e4afaa`

> (pastes the Skillproof prompt)

**AI** · 1:29 · setup fingerprint `a0e4afaa`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:29 · setup fingerprint `a0e4afaa`

> look

**AI** · 5:02 · setup fingerprint `a0e4afaa`

> Your setup: a Python FastAPI service, with "run tests before saying it works" and "keep diffs minimal" rules in AGENTS.md, plus a commit-msg skill — solo coding work. Adding these to your personal skills, next to commit-msg:
>
> 1. Add **verification-before-completion** — Your AI now runs the checks before saying "done", so "fixed" means fixed.
> 2. Add **karpathy-guidelines** — Your AI now keeps code changes small, names assumptions up front, and stops overbuilding.
> 3. Add **grill-me** (with grilling, the helper grill-me calls) — Type $grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 5:02 · setup fingerprint `a0e4afaa`

> yes

**AI** · 6:16 · setup fingerprint `5df814b8`

> Installed.
> - verification-before-completion: Your AI now runs the checks before saying "done", so "fixed" means fixed.
> - karpathy-guidelines: Your AI now keeps code changes small, names assumptions up front, and stops overbuilding.
> - grill-me: Type $grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
>
> Undo: move verification-before-completion, karpathy-guidelines, grill-me and grilling out of ~/.agents/skills/. They load in a new session.

**User** · 0:00 · setup fingerprint `d41d8cd9`

> (pastes the Skillproof prompt)

**AI** · 1:57 · setup fingerprint `d41d8cd9`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:57 · setup fingerprint `d41d8cd9`

> my answers are way too long

**AI** · 3:49 · setup fingerprint `d41d8cd9`

> Got it — keeping things short from here.
>
> Still need your answer to start the install: what do you want your AI to do better? Or say "look" and I'll check your setup.

**User** · 3:49 · setup fingerprint `d41d8cd9`

> no i mean my AI in general, its answers are always way too long

**AI** · 5:22 · setup fingerprint `d41d8cd9`

> ChatGPT Free and Plus can't keep skills. The free Claude app can (claude.ai → Customize → Skills), and so can ChatGPT Business, Codex, Cursor and Gemini — paste this prompt there.

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
| 3 | The Claude app zipped Skillproof itself and asked for that upload first | A chat app runs Skillproof from the chat; only the planned skills get zips, after the yes |
| 3 | grill-me's helper folder went into the same zip; the Claude app reads one folder per zip | One zip per skill folder, helpers included |
| 3 | The helper folder (grilling) was installed without being named in the plan | Helpers are named in the plan line |
| 3 | ChatGPT Plus gave a readback before its one line | The line comes first, no readback |
| 3 | The multiple-choice question was skipped once in a chat app | The skill says it's the easy version of the question, not handing it back |
| 3 | A bare "it" in a clash line; "delete" in undo lines | No bare "it" anywhere they read; undo says "move out" |
| 4 | A clash in a helper skill was found only at install | Helpers' SKILL.md are opened before the plan too |
| 4 | ChatGPT Plus read "my answers are way too long" as a note about the chat and asked the opening again, so the one line came late | The pasted prompt now tells ChatGPT Free/Plus to say the one line first, before any question |
| 4 | "look" on a setup whose AGENTS.md already says "run tests before saying anything works" and "keep diffs minimal" got skills doing the same jobs | A need their own rules cover counts as one they have: pick for what the setup lacks, or plan the swap and name the line that moves out |
| 4 | The first reply still took 1–2 minutes on the clock in these runs | Not a product step any more — the opening now comes with zero downloads or file reads; the rest is the model's own reply time in this test setup |
