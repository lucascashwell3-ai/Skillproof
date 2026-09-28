# Skillproof feeder

**Purpose:** keep the short list of proven single skills current without a
human review stage. The list was chosen by hand on 2026-09-27; the feeder adds
only what is new since — a new skill folder from a proven author once it shows
real use, or a skill that newly crosses the install bar — and keeps every
listed entry's numbers and malice scan fresh.

**Schedule:** daily 12:40 UTC via `.github/workflows/feeder.yml` (cron
`40 12 * * *`) + manual `workflow_dispatch`.

**Inputs:**
- `GH_TOKEN` env var (repo secret `SKILLPROOF_FEEDER_TOKEN`, falls back to
  `github.token`).
- `scripts/feeder_sources.json` — `authors`: proven builders followed skill by
  skill, verified via the API every run; `skip`: skills that clear the numbers
  but don't fit a normal AI user's list, each with its reason.
- skills.sh install counts (leaderboard page + search API). Unreachable = no
  one is admitted on installs that run; listed counts are kept.
- `docs/data/skills.json`, `grading/quarantine.json`,
  `grading/feeder_seen.json` (every folder already judged, with its verdict).

**The one bar** (same for every entry): real use (≥200,000 installs; ≥20,000
for a proven author; or ≥5,000 stars on a repo that is just this skill) · an
original (source repo ≥1,000 stars) · not tied to one vendor's product or a
paid service · open license · pushed within 12 months · malice scan of exactly
the folders it installs. At most 1 new entry per run, never past 30 entries.

**Outputs:**
- `docs/data/skills.json` — at most one new entry; stars, installs, pushed
  date and folder commit refreshed for listed entries; a folder that changed
  is re-scanned.
- `grading/quarantine.json` — anything the scan flags (pulled, never listed).
- `grading/feeder_seen.json` — verdicts, so nothing is judged twice. A new
  skill without enough use yet stays "waiting" for 90 days, then closes.

**Failure behavior:** unit tests and the honesty gate (`validate_index.py`)
must pass before anything is written. After publish, the workflow polls the
live site JSON; if the count never matches, it `git revert`s the commit and
pushes, then fails the run — GitHub's own notification is the alert.

**Caps:** 1 run/day, ≤1 new entry/run, ≤30 entries, ≤200 skills.sh lookups,
0 model tokens.

**Log format** — why new folders weren't added, one line per reason, highest
count first:
```
check: 0 cleared the bar and fit, 12 not added
  not added: 7 not enough real use yet
  not added: 3 tied to one vendor's product or a paid service
  not added: 2 part of caveman, which is already listed
```

**Run locally (dry run only):**
```
GH_TOKEN=$(gh auth token) python3 scripts/feeder.py --dry-run
```
`--baseline` records every folder visible now as judged and admits nothing —
used once when the list was chosen by hand.

**Test:** `python3 -m unittest scripts/test_feeder.py scripts/test_catalog_gate.py`
