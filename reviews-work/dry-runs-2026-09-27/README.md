# Cold dry runs — 2026-09-27

Five people, five setups, one pasted prompt. Each run is a fresh AI agent that had never seen
Skillproof, playing the assistant inside the named app, working for real inside its own
sandbox. The person's answers were fixed before the run started. Skillproof's files came from
this branch.

| Run | Who | App | What they said | Ended with | Their own time* | The AI's own work |
|---|---|---|---|---|---|---|
| [1](1-beginner.md) | Beginner, empty setup | Claude Code | "idk" | grill-me, humanizer, caveman | ~1.3 min | 5:07 |
| [2](2-claude-code.md) | Shop owner, real CLAUDE.md + 2 skills | Claude Code | three pains | grill-me, verification-before-completion, frontend-design (weak old skill backed up and swapped; a clash with their own rule named) | ~1.8 min | 6:22 |
| [3](3-codex.md) | Developer, AGENTS.md + 1 skill | Codex | "look" | verification-before-completion, karpathy-guidelines — picked from what the setup shows | ~0.8 min | 4:21 |
| [4](4-claude-app.md) · [4b](4b-claude-app-rerun.md) | Beginner | Claude app (free) | "idk", then "1" | grill-me, humanizer, caveman as ready zips + one upload step | ~1.5 min | 13:00 / 7:43 |
| [5](5-chatgpt-plus.md) | ChatGPT Plus user | ChatGPT | "answers are way too long" | the one line: ChatGPT Free/Plus can't keep skills, and where it can | ~0.5 min | 4:04 |
| [before](0-before-beginner.md) | The same beginner as run 1 | Claude Code, old version | "idk" | three rounds of questions, then one skill with no install count behind it | — | — |

*Reading the AI's messages at 238 words a minute plus typing the replies. "The AI's own work" is
the agent's working time across its turns (fetching, reading, installing, building zips).

**Checks in every run:** at least one proven skill installed in the app's own place (or the one
ChatGPT line) · one line per skill with no bare "it" · nothing but Skillproof's own folder
changed before the yes (file fingerprints, or an empty download folder) · an undo naming every
skill.

**Known gap:** show-me, plain, boris and linus-review live in a repo that is still private, so no
run could open them; the runs left them out without comment.

[Earlier rounds](earlier-rounds.md) — the slips earlier drafts made, and what changed.
