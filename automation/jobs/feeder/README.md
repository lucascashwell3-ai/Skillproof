# Skillproof feeder (v1 job 2)

**Purpose:** grow the catalog past 30 entries without a human review stage.
Finds candidate repos, applies a baseline safety/quality bar, and
auto-publishes them as `status: "scouted"` — listed, screened, not read.

**Schedule:** daily 12:40 UTC via `.github/workflows/feeder.yml` (cron
`40 12 * * *`) + manual `workflow_dispatch`.

**Inputs:**
- `GH_TOKEN` env var (repo secret `SKILLPROOF_FEEDER_TOKEN`, falls back to
  `github.token`).
- `scripts/feeder_sources.json` — named creators exempt from the star bar,
  verified via the API every run.
- Existing `docs/data/skills.json` (dedupe) and `grading/quarantine.json`
  (never re-add a flagged repo).

**Outputs:**
- `docs/data/skills.json` — new scouted entries appended, signals refreshed
  for existing entries.
- `grading/quarantine.json` — any new repo the safety skim flags.

**Failure behavior:** unit test and the honesty gate (`validate_index.py`)
must pass before anything is written. After publish, the workflow polls the
live site JSON for up to 5 minutes; if the count never matches, it
`git revert`s the commit and pushes, then fails the run — GitHub's own
notification (email + mobile) is the alert.

**Caps:** 1 run/day, ≤50 new entries/run, 0 model tokens.

**Dropped-with-reason counts:** every run logs why candidates were cut, one
line per distinct reason, highest count first:
```
check: 28 passed the bar, 22 dropped
  dropped: 12 no OSS license
  dropped: 8 no skill evidence (no skill topic, no SKILL.md)
  dropped: 2 no push in > 12 months
```
Skill evidence = repo topics include one of `claude-skills`,
`claude-code-skills`, `agent-skills`, `anthropic-skills`,
`claude-code-plugin`, `claude-skill`, OR the repo contains a file named
`SKILL.md`. A truncated/unreadable file tree counts as unknown and is
dropped, never assumed to have it.

**Run locally (dry run only):**
```
GH_TOKEN=$(gh auth token) python3 scripts/feeder.py --dry-run
```

**Test:** `python3 -m unittest scripts/test_feeder.py`

**Last-known-good:** not yet run.
