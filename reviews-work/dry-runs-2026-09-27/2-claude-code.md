# Run 2 — a Claude Code user with a real setup

**Who:** a shop owner who uses Claude Code for a Next.js store and product emails.
**App:** Claude Code (played by a fresh Sonnet agent that had never seen Skillproof).
**Their setup:** `~/.claude/CLAUDE.md` with six rules (short answers; explain changes at the end; **never use sub-agents**; say how you checked before calling something fixed; TypeScript only), a weak two-line `frontend-polish` skill, a `short-answers` skill with one personal line, a `settings.json`, and a `shop-site` project.
**Their answers, fixed in advance:** "my AI starts writing code before it gets what I want, it tells me stuff is fixed when it isn't, and my store pages look generic"; "yes" to the readback and the plan.
**Start fingerprint:** `6d5984b4`

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). "Setup unchanged" is a fingerprint of every file in the sandbox except Skillproof's own folder._

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

## Checks

| Check | Result |
|---|---|
| Right skills for the three pains | PASS — grill-me (asks before building), verification-before-completion (checks before "fixed"), frontend-design (pages) |
| Fits the existing setup | PASS — swapped the weak two-line `frontend-polish` instead of adding a twin; named the clash with CLAUDE.md line 6 ("never use sub-agents"); left `short-answers` alone |
| Installed in the right place | PASS — `~/.claude/skills/grill-me`, `grilling`, `verification-before-completion`, `frontend-design` |
| One clear line per skill, no bare "it" | PASS |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`6d5984b4`); CLAUDE.md byte-for-byte unchanged after |
| Backup + undo | PASS — `frontend-polish` backed up to `~/.claude/skillproof-backups/2026-09-27/` (identical to the original) before the swap; the undo says how to put it back |
| Time | The person's own time ~1.8 min (255 words + 3 replies). The AI's own work: 6:22 |
