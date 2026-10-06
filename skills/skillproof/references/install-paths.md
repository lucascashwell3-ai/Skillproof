# Install paths — where skills go in each app, and what to do when they can't

Every app below reads the same thing: a folder named after the skill, holding its `SKILL.md`
(and any files beside it). Installing = copying that folder, whole, into the app's skills
folder. You almost always know which app you're in — don't ask what you can see. If you
genuinely can't tell, fold one question into beat 1: "Which app is this — Claude Code, the
Claude app, Codex, Cursor, Gemini, Copilot, Microsoft 365 Copilot, or ChatGPT?"

Paths and menus checked against each vendor's docs on 2026-10-05.

## Three ways in — pick the first one this app allows

1. **Install** — the app keeps skills in a folder and you can save files (coding apps).
2. **Upload** — a chat app that keeps skills: you build a zip, they upload it in one step.
3. **The copy-paste version** — the app can't keep skills, or work has them switched off. The
   skill's own instructions as text they keep in a project, notebook or agent (below).

Which one is a fact about the app and the account, not a judgment about the person. Say it in
the plan; never make them work it out.

## 1 · Apps that keep skills in a folder

| App | Personal (every project) | One project only | Calling a skill by name |
|---|---|---|---|
| **Claude Code** | `~/.claude/skills/<name>/` | `<project>/.claude/skills/<name>/` | `/name` |
| **Codex** (CLI, IDE, desktop app) | `~/.agents/skills/<name>/` | `<repo>/.agents/skills/<name>/` | `$name` |
| **Cursor** | `~/.cursor/skills/<name>/` | `<project>/.cursor/skills/<name>/` | `/name` |
| **Gemini CLI** | `~/.gemini/skills/<name>/` | `<project>/.gemini/skills/<name>/` | ask for it by name |
| **GitHub Copilot** (agent mode, CLI, cloud agent) | `~/.copilot/skills/<name>/` | `<repo>/.github/skills/<name>/` | ask for it by name |

**Some apps read more than one folder** — GitHub Copilot in VS Code also loads `~/.claude/skills/`
and `~/.agents/skills/`. Check every folder this app reads before adding: the same skill in two
of them is a twin.

On Windows `~` is the user folder: `C:\Users\<them>\.claude\skills\<name>\`, written
`$HOME\.claude\skills\<name>` in PowerShell.

Chat apps: Claude app — ask for it by name ("use grill-me"); ChatGPT Business/Enterprise/Edu —
`@name`. The shelf's `line` uses `/name`; say it the way this app does.

**Name the installed folder after the skill** — the entry's `name` — even when its source
folder is called something else (`skills/taste-skill` → `design-taste-frontend/`). The Claude app
refuses a folder whose name doesn't match the skill.

### Copying a folder from GitHub — after the yes, never before

Use the shell this app already runs. **Never install a shell, git, or anything else to get
there.** Claude Code on Windows runs bash only when Git for Windows is installed and PowerShell
otherwise; Codex, Cursor and Copilot on Windows usually run PowerShell.

**Mac, Linux, or Windows with bash — and git is there:** clone shallow into a fresh temp folder,
then copy just the planned folders (the skill plus any `source.with`):

```
d=$(mktemp -d) && git clone --depth 1 -q https://github.com/<owner>/<repo> "$d" && mkdir -p <skills folder> && cp -R "$d/<source.path>" <skills folder>/<name>
```

**No git, or PowerShell — fetch the files one by one.** The folder's file list is a read:
`https://api.github.com/repos/<owner>/<repo>/contents/<source.path>?ref=<branch>`. Then save each
file from `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>`:

```
# bash
mkdir -p ~/.claude/skills/<name> && curl -fsSL "<raw url>" -o ~/.claude/skills/<name>/SKILL.md
```

```
# PowerShell — type curl.exe, not curl (in Windows PowerShell plain curl is a different command)
New-Item -ItemType Directory -Force "$HOME\.claude\skills\<name>" | Out-Null
curl.exe -fsSL "<raw url>" -o "$HOME\.claude\skills\<name>\SKILL.md"
```

One file per command, each one named in the plan's folder. Nothing runs after it lands —
a skill's own installer script is never run.

**A skill that is a whole repo** (`source.path` is empty): copy only the skill's own files —
`SKILL.md`, its license, and the files `SKILL.md` points to. Never `.git`, CI files, packaging
or test scripts. Clone-and-copy would bring all of that, so fetch the files one by one.

**Moving aside:** `mv` in bash, `Move-Item` in PowerShell. Never `rm`, never `Remove-Item`.

**Personal or one project?** Follow their pattern — someone whose skills all sit in the
personal folder gets a personal install. State the choice in the plan ("adding to your personal
skills, next to the others") and let the yes correct it. No pattern to follow: personal for
skills about how the AI talks and thinks; project for skills tied to one codebase.

New skills load in a **new** session. Say so in the undo line when it applies.

## 2 · Chat apps that keep skills — a ready zip and one upload step

Build the zip yourself after the yes: its root is the skill folder (`grill-me.zip` →
`grill-me/SKILL.md`), **one skill folder per zip**. A skill with a helper folder (`source.with`)
gets a zip for each: `grill-me.zip` and `grilling.zip`, both uploaded. Never send someone to
download a folder from GitHub — GitHub has no button for that.

**Claude app** (claude.ai, desktop, mobile — Free, Pro, Max, Team, Enterprise).
- Skills need one setting on: **Settings → Capabilities → "Code execution and file creation"**.
  If you can't create files in this chat, that setting is off: put turning it on in the plan as
  its own line, and build the zips once they say it's on.
- The upload step: **"Customize → Skills → + → Create skill → Upload a skill, then pick the
  zip."**
- Skillproof itself needs no upload here — it runs from this chat. Only the skills in the plan
  get a zip, after the yes.
- **Work account, and no Skills section or the setting is greyed out:** their company has
  skills switched off. That's the copy-paste version (section 3), in a Claude Project.

**ChatGPT Business, Enterprise, Healthcare, Edu.** Upload: **"Plugins (in the sidebar) → Skills
tab → Create → Upload from your computer."** ChatGPT scans the upload; it may say "Needs Review"
first. Admins can switch off skills or uploading — then there's no Skills tab or no Upload
option: the copy-paste version, in a ChatGPT Project.

**Microsoft 365 Copilot, with Cowork.** Upload: **"In Cowork: + → Customize → Skills tab → Add
→ Upload skill."** It takes a `.md` file or a `.zip` with `SKILL.md` at its root. No Cowork in
their Copilot (only Copilot Chat)? The copy-paste version.

**Gemini app** — skills live in Gemini Spark (Google AI Pro or Ultra): Spark → Skills → Upload,
a `SKILL.md` or a zip with `SKILL.md` at its root. No Spark: the copy-paste version, in a Gem.

Every upload step gets one more line right under it, in plain words: **"Don't see that? Your
work may have it switched off — say so and I'll give you the copy-paste version."**

## 3 · The copy-paste version — when this app can't keep skills

For ChatGPT Free, Go, Plus and Pro, Microsoft 365 Copilot Chat, a work account with skills
switched off, or any app without a skills feature. Say why in one plain line, then offer it.
Don't stop at "can't".

**What it is:** the skill's own instructions, from the `SKILL.md` you already read in beat 2,
trimmed to fit: keep the author's words, drop install notes, tool names this app lacks, and
anything about files or scripts. First line: `<name> — from <repo_url> (<license>)`. Never add
an instruction the skill didn't have. Build it only from the full text, word for word: if your
web reader gave you a summary, that skill isn't offered — take the next one.

**Where it goes** — somewhere it loads only when they want it, never into instructions that
apply to every chat:

| App | Where | Steps to say |
|---|---|---|
| ChatGPT (any plan) | a Project | "Projects → New project → Instructions → paste." |
| Claude app | a Project | "Projects → New project → Project instructions → paste." |
| Microsoft 365 Copilot Chat | a notebook | "Notebooks → New notebook → ••• (top right) → Instructions → paste → Save." Or, if their work lets them make agents: "Agents → New agent → Configure → Instructions → paste" (8,000 characters at most). |
| Gemini app | a Gem | "Gems → New Gem → Instructions → paste." |
| Anything else | a note | "Save it, and paste it at the start of a chat when you need it." |

**Fit the box: 8,000 characters at most per project, notebook or agent** (ChatGPT Projects and
Copilot agents stop there). Long skills get trimmed to their core rules, in the author's words;
if the core rules alone won't fit, that skill isn't offered as a copy-paste version. One
project can hold two or three short skills together — they share the 8,000. A skill they call
by name (`calls: you`) works when they ask for it inside that project ("humanize this").

**Skip it in a copy-paste version:** `needs: files` or `scripts`, and any skill whose `license`
isn't an open one (MIT, Apache, BSD and the like) — never copy text you may not share.

**In the plan,** each line says it's the copy-paste version and where it goes, and the plan
adds one plain line: "These are copy-paste versions: they work where you paste them, but won't
start on their own."

**After the yes:** each version in its own copy box, then the one where-to-paste step. The undo:
"Remove the text from the project's instructions."

**At work, also say once:** "If you want real skills here, IT can turn them on." Nothing more.

## 4 · When the normal way is blocked — stop, say it, offer what works

You find out by doing, never by probing. The first time something is blocked, stop right
there. One plain line — what happened, no error codes, no blame — then the offer.

| What happens | Say | Offer |
|---|---|---|
| A download fails (certificate error, blocked, refused) | "This computer's network blocks downloads from GitHub, so I couldn't save grill-me." | The copy-paste version. In a coding app you may offer to type it in as the skill's `SKILL.md` from the text you read — said plainly ("typed in from what I read, not downloaded"), as a new one-line plan with its own "Go?". Only for skills with no scripts. |
| Can't write the skills folder (access denied) | "This computer won't let me save into your skills folder." | The copy-paste version as text to keep. |
| A command is blocked by policy ("blocked by your administrator", execution policy) | "Your IT blocks that here." | The copy-paste version. |
| The app has no Skills section or upload (work account) | "Your work account has skills switched off." | The copy-paste version (section 3). |
| You can't reach GitHub at all from here | "I can't reach GitHub from here, so I can't read these skills." | Stop. Name the skills and their links for later. |

What was already installed stays; the undo line covers it.

**Never, after a block:** a second download tool (`Invoke-WebRequest`, `certutil`, `bitsadmin`,
`wget`), turning off a certificate check (`-k`, `--insecure`, `-SkipCertificateCheck`), changing
execution policy, running as admin, touching proxy or security settings, or a workaround of any
kind. At work, never suggest another AI app or their own device — that can break their job's
rules. At home it's fine to say once, after the copy-paste version: "The free Claude app keeps
real skills (claude.ai → Customize → Skills)."

## What can't run where

- **`needs: files`** — the skill reads or writes files (a project, a notes folder). Coding apps
  only; skip it in chat apps and copy-paste versions.
- **`needs: scripts`** — a skill that runs its own scripts needs an app that runs commands (Claude Code,
  Codex, Cursor, Gemini CLI, Copilot). Skip it elsewhere. Its plan line says "includes a small
  script", so someone on a work computer knows before the yes.
- **One app's tools** — a skill that names a tool only one app has (for example Claude Code's
  `AskUserQuestion`, or "call the Skill tool") still works where the model can do the same thing
  by hand; skip it only if its core step can't happen.
- **Fields some apps ignore** — `disable-model-invocation` (Claude Code: only the person can call
  the skill) and `allowed-tools` are not honored everywhere. Harmless; the skill still loads.

## If nothing fits here

Say that in one line, and what would help instead. Never improvise a path that half-works.
