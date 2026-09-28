# Cold dry runs — 2026-09-27

Three people, three setups, one pasted prompt. Each run is a fresh AI agent that had never seen
Skillproof, playing the assistant inside the named app, working for real inside its own sandbox
home folder. The person's answers were fixed before the run started. Skillproof's files came
from this branch.

| Run | Who | App | What they said | Ended with | Their own time* |
|---|---|---|---|---|---|
| [1](1-beginner.md) | Beginner, empty setup | Claude Code | "idk" | grill-me, humanizer, caveman | ~1.2 min |
| [2](2-claude-code.md) | Shop owner, real CLAUDE.md + 2 skills | Claude Code | "writes code before it gets what I want; says fixed when it isn't" | grill-me, verification-before-completion (+ a clash with their own rule, named) | ~1.4 min |
| [3](3-codex.md) | Developer, AGENTS.md + 1 skill | Codex | "look" | grill-me, humanizer | ~1 min |
| [before](0-before-beginner.md) | The same beginner | Claude Code, old version | "idk" | three rounds of questions, then one skill with no install count behind it | — |

*Reading the AI's messages at 238 words a minute plus typing the replies. Wall clock, including
the AI's own downloading, reading and installing, was 5–9 minutes per run.

**Checks in every run:** at least one proven skill installed in the app's own folder · one line
per skill with no bare "it" · nothing but Skillproof's own folder changed before the yes (file
fingerprints) · an undo naming every folder.

**Known gap:** show-me, plain, boris and linus-review live in a repo that is still private, so the
runs could not fetch them; both runs that picked show-me dropped it and said so in one line.

[First pass](first-pass-all-three.md) — the slips an earlier draft made, and what changed.
