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

**AI** · 1:24 · setup fingerprint `a0e4afaa`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:24 · setup fingerprint `a0e4afaa`

> look

**AI** · 5:35 · setup fingerprint `a0e4afaa`

> Here's the plan:
> 1. Add **diagnosing-bugs** — Your AI now works hard bugs step by step — reproduce, narrow down, prove the fix — instead of guessing.
> 2. Add **grill-me** (with grilling, the helper grill-me calls) — Type $grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> 3. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
>
> All three join your personal skills in `~/.agents/skills/`, next to commit-msg. Nothing changes until you say go, and you can undo anytime. Go?

**User** · 5:35 · setup fingerprint `a0e4afaa`

> yes

**AI** · 8:18 · setup fingerprint `8462b93a`

> Installed.
> - diagnosing-bugs: Your AI now works hard bugs step by step — reproduce, narrow down, prove the fix — instead of guessing.
> - grill-me: Type $grill-me before a plan or big decision, and your AI asks questions until the plan holds up.
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
>
> Undo: move diagnosing-bugs, grill-me, grilling and humanizer out of `~/.agents/skills/`. They load in a new session.

## Checks

| Check | Result |
|---|---|
| "look" leads to a plan with no more questions | PASS |
| What the setup shows counts as the answer — and no twins of their own rules | PASS — their AGENTS.md already covers "run tests before saying anything works" and "keep diffs minimal", so the plan skips skills for those and picks what the setup lacks: diagnosing-bugs for a coding project, then grill-me and humanizer |
| Installed in Codex's own folder | PASS — `~/.agents/skills/` (Codex's personal skills folder per its docs); `commit-msg` untouched |
| Calls a skill the Codex way | PASS — `$grill-me` |
| One clear line per skill, no bare "it"; helpers named | PASS — grill-me's plan line names grilling |
| Nothing changed before the yes | PASS — fingerprint before the yes = start (`a0e4afaa`) |
| Backup + undo | PASS — "move … out of" every folder, helper included; nothing existing touched |
| Time | The person's own time ~0.9 min (203 words + "look" and "yes"). The AI's own work: 7:58. Paste to "Installed.": 8:18 |
