# Grading worksheet — <skill-id>

- **Skill:** <display name>
- **Repo:** <url>
- **Author (as stated by the repo):** <author>
- **Version tested:** <commit sha> (<date of that commit>)
- **Graded:** <YYYY-MM-DD> · **Rubric:** v1.0 · **Grader:** <name/agent>
- **License:** <license>

## 0. Safety read-through (FIRST — before anything executes)

Files read, every line: <list every file>

| Check | Finding |
|---|---|
| Network calls | <none / disclosed / undisclosed — details> |
| Writes outside project | <finding> |
| Remote-exec patterns (`curl\|bash` etc.) | <finding> |
| Credential/env reads | <finding> |
| Obfuscation / hidden behavior | <finding> |

**Safety score: _/4** — <one-line why>
**Auto-F triggered?** <no / yes — reason>
_(If auto-F: stop here, record F, delist with published reason.)_

## 1. Triggering — 5 headless probes

Fixture: <path>; model: <pinned model>; each probe = fresh `claude -p` session.

| # | Type | Probe prompt (verbatim) | Expected | Skill invoked? | Pass |
|---|---|---|---|---|---|
| 1 | should-fire | "" | fire | | |
| 2 | should-fire | "" | fire | | |
| 3 | should-fire | "" | fire | | |
| 4 | near-miss | "" | stay quiet | | |
| 5 | near-miss | "" | stay quiet | | |

**Triggering score: _/4** (<n>/5 correct) — <one-line why>

## 2. Does what it claims (×2)

- **The skill's own headline claim (quoted):** "<quote from its README>"
- **Fixture task run (verbatim prompt):** "<prompt>"
- **What happened:** <observed output/behavior, evidence pasted or linked>
- **Verdict vs claim:** <delivered / minor gaps / partial / mostly fails / false>

**Effectiveness score: _/4 (×2 = _/8)** — <one-line why>

## 3. Docs & install

| Points | Check | Result |
|---|---|---|
| +2 | Installed first try per its README | |
| +1 | README states triggers/requirements/limitations | |
| +1 | Frontmatter in spec + description honest | |

**Docs score: _/4** — <one-line why>

## 4. Maintenance

- Last meaningful commit: <date> → base score <n>
- Ignored issues >60d? <finding> · Dead models/APIs hardcoded? <finding>

**Maintenance score: _/4** — <one-line why>

## Total

| Dim | Score | Weight | Pts |
|---|---|---|---|
| Triggering | /4 | ×1 | |
| Effectiveness | /4 | ×2 | |
| Docs & install | /4 | ×1 | |
| Maintenance | /4 | ×1 | |
| Safety | /4 | ×1 | |
| **Total** | | | **/24** |

**Grade: <letter>** (per RUBRIC.md v1.0 mapping)
**One-line verdict for the site:** <the sentence a user sees on the card>
