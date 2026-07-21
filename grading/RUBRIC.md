# Skillproof Grading Rubric — v1.0

_This is the canonical rubric text. `docs/methodology.html` renders this same content; if they
ever differ, this file wins and the page gets fixed. Every grade in `docs/data/skills.json`
carries the `rubric_version` it was scored under. Changes to scoring bump the version; old
grades keep their version until re-verified._

## What a grade is

A Skillproof grade is the result of **actually installing and testing a skill** against the
fixed protocol below — not a popularity score, not a README impression. Every grade links to
a filled worksheet (`grading/worksheets/<skill-id>.md`): the receipts. If we didn't run it,
we don't grade it. There are no placeholder grades.

**Conflict of interest:** we do not grade our own skills. Skillproof-family tools, if ever
listed, are tagged `house — not graded`.

## The five dimensions (0–4 each; Effectiveness ×2; total /24)

### 1. Triggering (×1) — does it fire when it should, and stay quiet when it shouldn't?

Protocol: install the skill into a clean fixture project (`.claude/skills/<skill>/`), then run
**5 headless probes** (`claude -p`, fresh session each, pinned model per protocol note below):
3 prompts a real user would type that SHOULD activate it (phrased naturally, never copying the
skill's own description verbatim) and 2 adjacent near-misses that should NOT.
A should-fire probe counts as a hit only if the harness actually invokes the skill.

| Score | Result |
|---|---|
| 4 | 5/5 probes correct |
| 3 | 4/5 |
| 2 | 3/5 |
| 1 | 2/5 |
| 0 | worse |

**Opt-in skills** (`disable-model-invocation: true` — the skill declares it never auto-fires):
scored against their own declared design. The 3 should-fire probes test explicit invocation
(`/name`); the 2 near-miss probes confirm it stays quiet on natural prompts that merely
resemble its topic. A skill is graded against the activation model it promises, not one we
impose.

### 2. Does what it claims (×2) — the heart of the grade

Protocol: in the fixture project, run the skill's **primary claimed job once** — the headline
use case its own README sells. Compare output against its own claims.

| Score | Result |
|---|---|
| 4 | Delivers the claim outright |
| 3 | Delivers with minor gaps |
| 2 | Partial — some claimed value, clearly short of the pitch |
| 1 | Mostly fails |
| 0 | Fails, or the claims are false |

Execution-safety order: **the Safety read-through (dimension 5) happens before anything is
executed.** Skills are only ever run after every line has been read, and only inside a
disposable sandboxed container.

### 3. Docs & install (×1) — checklist, additive

| Points | Check |
|---|---|
| +2 | Installs first try following its own README |
| +1 | README states triggers, requirements, and limitations honestly |
| +1 | Frontmatter is in spec (name + description) and the description matches actual behavior |

### 4. Maintenance (×1) — objective recency scale

Last meaningful commit: **<3 months = 4 · <6 = 3 · <12 = 2 · older = 1 · abandoned/dead = 0.**
Deductions (floor 0): −1 if open issues sit ignored >60 days; −1 if it hardcodes dead models,
retired APIs, or stale version pins that break it today.

### 5. Safety (×1) — every line gets read

Start at 4, deduct (floor 0): −1 undisclosed network calls · −1 writes outside the project
without gating/disclosure · −1 remote code execution patterns (e.g. `curl | bash`), even
disclosed · −1 reads credentials/env secrets without functional need.

**Auto-F override:** undisclosed exfiltration, credential harvesting, destructive defaults, or
deliberately obfuscated code = **F overall regardless of other scores**, entry delisted with
the reason published.

## Letter mapping (total /24)

| Total | Grade |
|---|---|
| 23–24 | A |
| 21–22 | A− |
| 20 | B+ |
| 18–19 | B |
| 17 | B− |
| 15–16 | C+ |
| 13–14 | C |
| 12 | C− |
| 10–11 | D+ |
| 8–9 | D |
| ≤7 or auto-F | F |

Grades are **derived from the dimension scores by this table, never hand-set** —
`scripts/validate_index.py` recomputes every grade and fails the build on any mismatch.

## Freshness & disputes

- A grade older than **90 days** renders as `stale — re-verify pending` on the site.
- Re-grading a newer version **supersedes** the old worksheet (append-only); we never edit
  history.
- Authors who dispute a grade can open an issue; we re-run the protocol and publish the
  re-test either way.

## Protocol notes (v1.0)

- Probe model pinned to a mainstream daily-driver tier (Claude Sonnet class) so triggering
  reflects what a typical user experiences.
- Test environment: disposable Linux container, clean fixture project per skill.
- Every dimension score carries a one-line "why" in both the worksheet and `skills.json` —
  a number without a reason doesn't ship.
