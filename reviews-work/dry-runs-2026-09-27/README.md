# Cold dry runs — 2026-09-27

Five people, five setups, one pasted prompt. Each run is a fresh AI agent that had never seen
Skillproof, playing the assistant inside the named app, working for real inside its own
sandbox. The person's answers were fixed before the run started. Skillproof's files came from
this branch.

| Run | Who | App | What they said | Ended with | Their own time* | The AI's own work | Paste to done |
|---|---|---|---|---|---|---|---|
| [1](1-beginner.md) | Beginner, empty setup | Claude Code | "idk" | grill-me, humanizer, caveman | ~1.2 min | 5:45 | 6:08 |
| [2](2-claude-code.md) | Shop owner, real CLAUDE.md + 2 skills | Claude Code | three complaints | grill-me, verification-before-completion, frontend-design; a clash with their own rule named in the plan; a weak old skill and a duplicate rule moved out, both backed up | ~1.9 min | 7:53 | 8:13 |
| [3](3-codex.md) | Developer, AGENTS.md + 1 skill | Codex | "look" | diagnosing-bugs, grill-me, humanizer — picked for what the setup lacks, skipping what their own rules already cover | ~0.9 min | 7:58 | 8:18 |
| [4](4-claude-app.md) | Beginner | Claude app (free) | "idk", then "1" | humanizer, copywriting as ready zips + one upload step | ~1.2 min | 8:21 | 9:15 |
| [5](5-chatgpt-plus.md) | ChatGPT Plus user | ChatGPT | nothing needed | the one line, as the first reply: ChatGPT Free/Plus can't keep skills, and where it can | a few seconds | 0:34 | 1:02 |
| [before](0-before-beginner.md) | The same beginner as run 1 | Claude Code, old version | "idk" | three rounds of questions, then one skill with no install count behind it | — | — | — |

*Reading the AI's messages at 238 words a minute plus typing the replies. "The AI's own work"
is the agent's working time across its turns (fetching, reading, installing, building zips).
"Paste to done" is the clock from the paste to the last message, including the gaps between turns.

**Checks in every run:** proven skills in the app's own place (or the one ChatGPT line) · one
line per skill, word for word, no bare "it" · nothing but Skillproof's own folder changed before
the yes (file fingerprints, or an empty download folder) · anything already there backed up
first · an undo naming every folder.

**Prompt note:** runs 3 and 5 used the final prompt. Runs 1, 2 and 4 used it one line shorter —
before the line telling ChatGPT Free/Plus to say its limit first, which doesn't apply to them.

**Known gap:** show-me, plain, boris and linus-review live in a repo that is still private, so no
run could open them; the runs left them out without comment.

[Earlier rounds](earlier-rounds.md) — the slips earlier drafts made, and what changed.
