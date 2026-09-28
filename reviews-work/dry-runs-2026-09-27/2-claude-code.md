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

**AI** · 1:32 · setup fingerprint `6d5984b4`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:32 · setup fingerprint `6d5984b4`

> my AI starts writing code before it gets what I want, it tells me stuff is fixed when it isn't, and my store pages look generic

**AI** · 2:56 · setup fingerprint `6d5984b4`

> You want your AI to hold off writing code until it actually gets the ask, stop claiming things are fixed when they're not, and help your store pages look less generic. Right?

**User** · 2:56 · setup fingerprint `6d5984b4`

> yes

**AI** · 6:37 · setup fingerprint `6d5984b4`

> Here's the plan:
> 1. Add **grill-me** (with grilling, the helper grill-me calls) — Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up. Your CLAUDE.md line 6 says no sub-agents; grilling's fact-checks will run here in chat instead of a sub-agent.
> 2. Add **verification-before-completion** — Your AI now runs the checks before saying "done", so "fixed" means fixed.
> 3. Edit CLAUDE.md: remove line 7 ("Before you say something is fixed, tell me how you checked.") since verification-before-completion covers checking before claiming something's fixed. I back up CLAUDE.md first.
> 4. Swap **frontend-polish** for **frontend-design** — Your AI now designs pages with a clear visual direction instead of the usual template look. I move frontend-polish aside first, not delete.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 6:37 · setup fingerprint `6d5984b4`

> yes

**AI** · 8:13 · setup fingerprint `8dd4287f`

> Installed.
> - grill-me: Type /grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - verification-before-completion: Your AI now runs the checks before saying "done", so "fixed" means fixed.
> - frontend-design: Your AI now designs pages with a clear visual direction instead of the usual template look.
> Undo: move grill-me, grilling, verification-before-completion and frontend-design out of `~/.claude/skills/`; put frontend-polish and your old CLAUDE.md back from `~/.claude/skillproof-backups/2026-09-27/`. Takes effect in a new chat.

## Checks

| Check | Result |
|---|---|
| Right skills for the three complaints | PASS — grill-me (asks before building), verification-before-completion (checks before "fixed"), frontend-design (pages) |
| Fits the existing setup | PASS — the clash with CLAUDE.md line 6 ("never use sub-agents") is named in the plan; the weak two-line `frontend-polish` is swapped, not doubled; their line 7 duplicates the new verification skill, so the plan proposes moving it out — backed up first; `short-answers` left alone |
| Installed in the right place | PASS — `~/.claude/skills/grill-me`, `grilling`, `verification-before-completion`, `frontend-design` |
| One clear line per skill, no bare "it" | PASS |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`6d5984b4`) |
| Only the planned edit | PASS — CLAUDE.md differs from the original by exactly the planned line |
| Backup + undo | PASS — `CLAUDE.md` and `frontend-polish` backed up to `~/.claude/skillproof-backups/2026-09-27/`, both identical to the originals; the undo names every folder and both backups |
| Time | The person's own time ~1.9 min (274 words + 3 replies). The AI's own work: 7:53. Paste to "Installed.": 8:13 |
