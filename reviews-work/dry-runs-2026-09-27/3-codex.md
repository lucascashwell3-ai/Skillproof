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

## Checks

| Check | Result |
|---|---|
| "look" leads to a plan with no more questions | PASS |
| What the setup shows counts as the answer | PASS — a Python/FastAPI service with "run tests before saying anything works" and "keep diffs minimal" in AGENTS.md → verification-before-completion and karpathy-guidelines |
| Installed in Codex's own folder | PASS — `~/.agents/skills/` (Codex's personal skills folder per its docs); `commit-msg` untouched |
| One clear line per skill, no bare "it" | PASS |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`a0e4afaa`) |
| Backup + undo | PASS — undo names every folder; nothing existing touched |
| Time | The person's own time ~0.8 min (171 words + "look" and "yes"). The AI's own work: 4:21 |
