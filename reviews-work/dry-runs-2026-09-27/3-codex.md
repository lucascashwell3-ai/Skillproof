# Run 3 — a Codex user who says "look"

**Who:** a developer who uses the Codex CLI on a Python API service.
**App:** Codex CLI (played by a fresh Sonnet agent told to act as Codex, that had never seen Skillproof).
**Their setup:** `~/.codex/config.toml`, one personal skill (`~/.agents/skills/commit-msg`), and `projects/api-service/AGENTS.md` ("run pytest before saying anything works"; "keep diffs minimal").
**Their answers, fixed in advance:** "look" to the opening; "yes" to the plan.
**Start fingerprint:** `a0e4afaa`

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). "Setup unchanged" is a fingerprint of every file in the sandbox except Skillproof's own folder._

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

## Checks

| Check | Result |
|---|---|
| "look" leads to a plan with no more questions | PASS |
| What the setup shows counts as the answer | PASS — a Python/FastAPI service with "run pytest before saying anything works" and "keep diffs minimal" → verification-before-completion and karpathy-guidelines, then grill-me |
| Installed in Codex's own folder | PASS — `~/.agents/skills/` (Codex's personal skills folder per its docs); `commit-msg` untouched |
| Calls a skill the Codex way | PASS — `$grill-me` |
| One clear line per skill, no bare "it" | PASS for the plan and install lines. The one-line summary of their setup quoted their rule loosely ("before saying it works") |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`a0e4afaa`) |
| Backup + undo | PASS — "move … out of" every folder, helper included; nothing existing touched |
| Time | The person's own time ~0.9 min (206 words + "look" and "yes"). The AI's own work: 5:30. Paste to "Installed.": 6:16 |
