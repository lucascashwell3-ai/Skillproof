# Dry run 2 — a Claude Code user with a real setup

**Who:** a shop owner who uses Claude Code for a Next.js store and product emails.
**App:** Claude Code (played by a fresh Sonnet agent that had never seen Skillproof).
**Their setup:** `~/.claude/CLAUDE.md` with six rules (short answers; explain changes at the end; **never use sub-agents**; say how you checked before calling something fixed; TypeScript only), a weak two-line `frontend-polish` skill, a `short-answers` skill with one personal line, a `settings.json`, and a `shop-site` project.
**Their answers, fixed in advance:** "my AI starts writing code before it gets what I want, and it tells me stuff is fixed when it isn't"; "yes" to the readback and the plan.
**Start fingerprint:** `6d5984b4`

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). The setup fingerprint covers every file in the sandbox except Skillproof's own folder (the paste itself asks for that one); it stays at the start value until the yes._

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

## Checks

| Check | Result |
|---|---|
| Right skills for the stated pain | PASS — grill-me (asks before building) and verification-before-completion (checks before "fixed") |
| Fits the existing setup | PASS — named the clash with CLAUDE.md line 6 ("Never use sub-agents") in one line; installed no twin of `short-answers` |
| Installed in the right place | PASS — `~/.claude/skills/grill-me`, `grilling`, `verification-before-completion` |
| One clear line per skill, no bare "it" | PASS |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`6d5984b4`); CLAUDE.md byte-for-byte unchanged after |
| Backup + undo | PASS — undo names every folder; no existing file changed. (Run 1 swapped the weak `frontend-polish`: backed up to `~/.claude/skillproof-backups/2026-09-27/` first, with the exact restore line.) |
| The person's own time | ~1.4 min (182 words + 3 short replies); wall clock 5:39 |
