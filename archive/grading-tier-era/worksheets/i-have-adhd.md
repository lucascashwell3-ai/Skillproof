# Grading worksheet — i-have-adhd

- **Skill:** i-have-adhd
- **Repo:** https://github.com/ayghri/i-have-adhd
- **Author (as stated by the repo):** Ayoub G. (ayghri)
- **Version tested:** 0241185 (2026-07-21)
- **Graded:** 2026-07-21 · **Rubric:** v1.0 · **Grader:** Skillproof (Claude-operated, disposable Linux container)
- **License:** MIT

## 0. Safety read-through (FIRST — before anything executes)

Files read, every line: `skills/i-have-adhd/SKILL.md`, `README.md`, `INSTALL.md`, `plugin.json`,
`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`,
`.codex-plugin/plugin.json`, `skills/i-have-adhd/agents/openai.yaml`,
`.github/workflows/claude.yml`, `.github/workflows/claude-code-review.yml`.

| Check | Finding |
|---|---|
| Network calls | None. Pure markdown + JSON manifests; zero scripts. |
| Writes outside project | None possible — the skill contains no executable content. |
| Remote-exec patterns | None. (`.github/workflows/` run only in the author's own CI, never on an installing user's machine.) |
| Credential/env reads | None. |
| Obfuscation / hidden behavior | None. Entire skill is 10 plainly-written output rules. |

**Safety score: 4/4** — nothing but markdown; there is literally nothing it can touch.
**Auto-F triggered?** No.

## 1. Triggering — 5 headless probes (opt-in variant)

Skill declares `disable-model-invocation: true` — per RUBRIC v1.0, should-fire probes test
explicit `/i-have-adhd` invocation; near-misses confirm it stays quiet uninvoked.

Fixture: clean Node auth-app project, skill at `.claude/skills/i-have-adhd/` (manual-copy
install path from its INSTALL.md). Model: Claude Sonnet class (`claude-sonnet-5`), fresh
headless session per probe. Detection note: slash expansion is not emitted as a transcript
event in headless stream-json, so invocation is verified by rule-conformant output signature
against the control run (probe 5) — signatures noted below.

| # | Type | Probe prompt (verbatim) | Expected | Skill invoked? | Pass |
|---|---|---|---|---|---|
| 1 | should-fire | "/i-have-adhd Fix the bug in auth.js" | fire | Yes — reply is action-first, zero preamble ("Need permission to edit `auth.js` — approve the edit to apply the fix.") | ✅ |
| 2 | should-fire | "/i-have-adhd Explain what is wrong with the token verification in this project" | fire | Yes — answer in line 1, numbered fix steps, ends "Next: run …" (rules 1, 2, 3) | ✅ |
| 3 | should-fire | "/i-have-adhd How should I add a logout function to auth.js?" | fire | Yes — action first, numbered steps, "About 2 minutes" (rule 6), tangent deferred with "Separately: … Want that fixed too?" (rule 4) | ✅ |
| 4 | near-miss | "I have ADHD and I keep losing focus reading long AI replies. Anyway - fix the bug in auth.js" | stay quiet | No — conversational style, no skill signature | ✅ |
| 5 | near-miss | "Fix the bug in auth.js" | stay quiet | No — normal wordy style (doubles as control run) | ✅ |

**Triggering score: 4/4** (5/5 correct) — fires exactly on explicit invocation, never otherwise,
matching its own declared activation model.

## 2. Does what it claims (×2)

- **The skill's own headline claim (quoted):** "A skill for your coding assistant that stops it
  from burying the answer. Action first. Steps numbered. No 'Hope this helps!'"
- **Fixture task run (verbatim prompt):** "/i-have-adhd How should I add a logout function to auth.js?" (probe 3), judged against control "Fix the bug in auth.js" (probe 5).
- **What happened:** Treatment output led with the exact edit, numbered 3 steps, gave a concrete
  time estimate, ended with a single copy-paste verification command, and deferred a discovered
  second bug as a separate question. Control output was explanation-first prose with a
  conversational closer. Rules 1, 2, 3, 4, 6, 10 all directly observed across probes 1–3;
  no rule violations observed.
- **Verdict vs claim:** Delivered outright — the before/after in its own README is an accurate
  description of the observed transformation.

**Effectiveness score: 4/4 (×2 = 8/8)** — does precisely what it sells, verified against a control run.

## 3. Docs & install

| Points | Check | Result |
|---|---|---|
| +2 | Installed first try per its README | ✅ manual-copy path from INSTALL.md worked unmodified |
| +1 | README states triggers/requirements/limitations | ✅ activation model unusually explicit ("If you did not turn it on, it is off"); drift limitation acknowledged in troubleshooting |
| +1 | Frontmatter in spec + description honest | ✅ name + description present; description matches observed behavior exactly, including the on/off switch. (Frontmatter YAML was broken until a same-day fix — the version tested is the fixed one.) |

**Docs score: 4/4** — the activation documentation is a model for opt-in skills.

## 4. Maintenance

- Last meaningful commit: 2026-07-21 (day of grading) → base score 4
- Ignored issues >60d? No — PRs #10, #12, #17 merged same-day. · Dead models/APIs hardcoded? None (no code).

**Maintenance score: 4/4** — actively maintained, same-day fixes.

## Total

| Dim | Score | Weight | Pts |
|---|---|---|---|
| Triggering | 4/4 | ×1 | 4 |
| Effectiveness | 4/4 | ×2 | 8 |
| Docs & install | 4/4 | ×1 | 4 |
| Maintenance | 4/4 | ×1 | 4 |
| Safety | 4/4 | ×1 | 4 |
| **Total** | | | **24/24** |

**Grade: A** (per RUBRIC.md v1.0 mapping)
**One-line verdict for the site:** Does exactly what it promises, fires only when you ask,
and contains nothing but 10 markdown rules — the model citizen of tiny skills.
