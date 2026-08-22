# Retired workflows

- `catalog-refresh.yml.retired` — the v0 weekly refresh (Mon/Thu PR-opening job). Schedule
  removed 2026-08-18; retired fully 2026-08-21 when feeder v2 (daily, self-refreshing,
  quarantine re-check) superseded every step of it. Its helper scripts (`refresh_signals.py`,
  `safety_skim.py` main, the review pipeline) are dead code kept for history. Restore by
  moving the file back under `.github/workflows/` — it will fail the honesty gate on the
  flat schema, by design.
