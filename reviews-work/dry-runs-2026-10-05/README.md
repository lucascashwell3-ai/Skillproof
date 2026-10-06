# Cold dry runs — 2026-10-05: every kind of setup

Nine people, nine setups, one pasted prompt. Each run is a fresh AI agent that had never seen
Skillproof, told openly that it's a role-play test, playing the assistant inside the named app.
The person's answers were fixed before the run started, and so was the right answer for each
person (which skills they should end up with). Skillproof's files were pinned to a commit, so
they couldn't change mid-run.

Three runs worked for real in a sandbox home folder (Mac, Claude Code and Cursor): every
command ran, every file landed, and the sandbox was fingerprinted before each "yes". The other
six played apps this machine can't run (Copilot, ChatGPT, the Claude app, Windows), with the
computer's answers scripted — including a work network that blocks downloads.

| # | Who | App | Said | Before (main) | After (this branch) |
|---|---|---|---|---|---|
| 1 | Office worker, work laptop | Microsoft 365 Copilot Chat, Windows | "my emails sound stiff and robotic" | Dead end: "can't keep skills… the free Claude app can" | humanizer as a copy-paste version for a Copilot notebook |
| 2 | Project manager, skills switched off by IT | ChatGPT Enterprise, Windows | "idk, I mostly write reports and run meetings" | "Installed." for zips; then "ask IT" and nothing that works | Zips + the right menu; when Skills isn't there: copy-paste versions in a Project, under 8,000 characters |
| 3 | Photographer, never opened Settings | Claude app (free) | "my AI sounds robotic" | — | One line to turn on the setting, then humanizer as a zip (2 files) |
| 4 | Beginner, empty setup | Claude Code, Mac | "idk" | — | grill-me, show-me, humanizer; Skillproof kept only as a plan line |
| 5 | Power user with rules + skills | Claude Code, Mac | "charges ahead… says done when tests fail" | — | grill-me with the clash in their own rules named and softened (backed up); weak skill swapped out |
| 6 | Senior developer, no git | Codex, Windows PowerShell | "bug hunts go in circles… over-built" | — | diagnosing-bugs (script named), karpathy-guidelines; Windows folders, `curl.exe`, no git |
| 7 | Analyst, locked work laptop | Claude Code, Windows, downloads blocked | "answers are way too long" | Tried a second download tool, then worked around the block silently — twice | Stops at the first block, says so in one line, asks a fresh "Go?" before typing the skill in |
| 8 | Senior developer | Cursor, Mac | "the UIs it builds look generic" | — | frontend-design replacing a weak look-and-feel skill (backed up); their brand rule kept |
| 9 | Nurse, home laptop | ChatGPT Plus | "the answers are long and the next step is buried" | — | plain + i-have-adhd as copy-paste versions in one Project |

**Checks in every run:** at most one question before results · plain words · the right skills ·
one short plan · nothing written before the yes · backup + exact undo · nothing doubled or
broken · a path that works when the normal way can't · nothing that looks like malware.

**What the runs found, and the fixes:** a skill that is a whole repo copied its CI files and a
script (now: the skill's own files only); a copy-paste version built from a reader's summary
(now: full text only, or the skill isn't offered); a copy-paste version four times the size of
ChatGPT's 8,000-character Project box (now: fit the box or leave it out). Each fix was re-run.

**Can't be proven here:** an upload into the Claude app, Copilot Chat on a real work laptop,
and Claude Code loading the installed skill — those need a person at the keyboard.

[Before](before.md) · [After](after.md)
