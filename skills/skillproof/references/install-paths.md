# Install paths — where skills go in each app

Every app below reads the same thing: a folder named after the skill, holding its `SKILL.md`
(and any files beside it). Installing = copying that folder, whole, into the app's skills
folder. You almost always know which app you're in — don't ask what you can see. If you
genuinely can't tell, fold one question into beat 1: "Which app is this — Claude Code, the
Claude app, Codex, Cursor, Gemini, Copilot, or ChatGPT?"

Paths checked against each vendor's docs on 2026-09-27.

## Apps that keep skills in a folder

| App | Personal (every project) | One project only | Calling a skill by name |
|---|---|---|---|
| **Claude Code** | `~/.claude/skills/<name>/` | `<project>/.claude/skills/<name>/` | `/name` |
| **Codex** (CLI, IDE, desktop app) | `~/.agents/skills/<name>/` | `<repo>/.agents/skills/<name>/` | `$name` |
| **Cursor** | `~/.cursor/skills/<name>/` | `<project>/.cursor/skills/<name>/` | `/name` |
| **Gemini CLI** | `~/.gemini/skills/<name>/` | `<project>/.gemini/skills/<name>/` | ask for it by name |
| **GitHub Copilot** (agent mode, CLI, cloud agent) | `~/.copilot/skills/<name>/` | `<repo>/.github/skills/<name>/` | ask for it by name |

Chat apps: Claude app — ask for it by name ("use grill-me"); ChatGPT Business/Enterprise/Edu —
`@name`. The shelf's `line` uses `/name`; say it the way this app does.

**How to copy a folder from GitHub without running anyone's code:** clone the source repo
shallow into a fresh temp folder, then copy just the skill's folder (and any `source.with`
folders) into place:

```
d=$(mktemp -d) && git clone --depth 1 -q https://github.com/<owner>/<repo> "$d" && mkdir -p <skills folder> && cp -R "$d/<source.path>" <skills folder>/
```

No git? Fetch each file in the folder from `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>`
and write it to disk yourself. Never pipe a download into a shell. Never run an installer
script a skill ships.

**Personal or one project?** Follow their pattern — someone whose skills all sit in the
personal folder gets a personal install. State the choice in the plan ("adding to your personal
skills, next to the others") and let the yes correct it. No pattern to follow: personal for
skills about how the AI talks and thinks; project for skills tied to one codebase.

New skills load in a **new** session. Say so in the undo line when it applies.

## Chat apps — a ready zip and one upload step

**Claude app** (claude.ai, desktop, mobile — Free, Pro, Max, Team, Enterprise). Skills need
code execution on: Settings → Capabilities. The upload takes a ZIP whose root is the skill
folder (`grill-me.zip` → `grill-me/SKILL.md`).

- If you can create files here, build that zip from the skill's source files and hand it over.
- If you can't, give the skill's folder link from `repo_url` and say: "Download the folder,
  zip it, then upload the zip."
- The one step: **"Upload it: Customize → Skills → add → upload the zip."**
- A skill with `needs: files` can't do its job in a chat app — skip it.

**Gemini app** — skills live in Gemini Spark (Google AI Pro or Ultra): Spark → Skills → Upload,
a `SKILL.md` or a zip with `SKILL.md` at its root.

**ChatGPT Business, Enterprise, Edu** — Skills → Create → Upload from your computer (if the
workspace allows it).

## ChatGPT Free or Plus — one line, then stop

These plans can't keep skills. Say exactly this, and nothing more:

> ChatGPT Free and Plus can't keep skills. The free Claude app can (claude.ai → Customize →
> Skills), and so can ChatGPT Business, Codex, Cursor and Gemini — paste this prompt there.

## What can't run where

- **`needs: files`** — the skill reads or writes files (a project, a notes folder). Coding apps
  only; skip it in chat apps.
- **Scripts** — a skill that runs its own scripts needs an app that runs commands (Claude Code,
  Codex, Cursor, Gemini CLI, Copilot). Skip it elsewhere.
- **One app's tools** — a skill that names a tool only one app has (for example Claude Code's
  `AskUserQuestion`, or "call the Skill tool") still works where the model can do the same thing
  by hand; skip it only if its core step can't happen.
- **Fields some apps ignore** — `disable-model-invocation` (Claude Code: only the person can call
  the skill) and `allowed-tools` are not honored everywhere. Harmless; the skill still loads.

## If it genuinely doesn't fit

Say that first, in one line, and stop. "grill-me needs an app that keeps skills, and ChatGPT
Plus doesn't" is a complete answer. Never improvise a path that half-works.
