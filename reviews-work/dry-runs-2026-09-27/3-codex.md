# Dry run 3 — a Codex user who says "look"

**Who:** a developer who uses the Codex CLI on a Python API service.
**App:** Codex CLI (played by a fresh Sonnet agent told to act as Codex, that had never seen Skillproof).
**Their setup:** `~/.codex/config.toml`, one personal skill (`~/.agents/skills/commit-msg`), and `projects/api-service/AGENTS.md` ("run pytest before saying anything works"; "keep diffs minimal").
**Their answers, fixed in advance:** "look" to the opening; "yes" to the plan.
**Start fingerprint:** `a0e4afaa`

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). The setup fingerprint covers every file in the sandbox except Skillproof's own folder (the paste itself asks for that one); it stays at the start value until the yes._

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

| Check | Result |
|---|---|
| "look" leads to a plan with no more questions | PASS |
| Installed in Codex's own folder | PASS — `~/.agents/skills/grill-me`, `grilling`, `humanizer` (Codex's personal skills folder per its docs) |
| Calls a skill the Codex way | PASS — `$grill-me`, not `/grill-me` |
| One clear line per skill, no bare "it" | PASS |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`a0e4afaa`) |
| Backup + undo | PASS — undo names every folder; nothing existing touched |
| show-me could not be installed | Its repo is still private. The AI dropped it, said so, and asked a new yes for a replacement instead of installing one on its own |
| The person's own time | ~1 min (217 words + "look" and "yes"); wall clock 8:32 |
