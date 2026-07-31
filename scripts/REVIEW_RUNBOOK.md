# Source-review runbook (agent backend)

The `reviewed` tier is produced by a Claude session's own subagents — NOT by shelling out
to the `claude` CLI. The CLI backend (`deep_review.py --backend cli`) is retired: it hangs
~10 minutes per entry in rate-limit backoff and then fails, and its test suite only ever
ran against a stub, so the live path was never actually proven. Do not resurrect it.

## How a run works
1. **Dump** (deterministic, free):
   `python3 scripts/deep_review.py --dump-prompts reviews-work/prompts`
   Clones each repo shallowly, applies the byte caps and doc-priority file selection,
   pins `git rev-parse HEAD`, and writes one prompt file per entry
   (`{system, prompt, id, source_sha, scope, files_read}`). Entries whose existing review
   is already pinned to the current sha are skipped — **a weekly refresh only dumps repos
   that actually pushed.**
2. **Review** (the only model step): a Claude session fans out subagents. Each reads
   prompt file(s) and Writes an answer file `{id, does, touches, undo, limits}`.
   - **Batch 4–6 repos per agent** — per-agent fixed overhead is ~30k+ tokens, so
     one-repo-per-agent roughly doubles the cost (measured: 67k single vs 45k/entry batched).
   - Reviews are describe-only; low reasoning effort is enough. Escalate to a stronger
     model only for entries the first pass rejects or that carry unusual content.
   - If a safety filter declines a repo (e.g. offensive-security content), retry once on a
     different model with the defensive-catalog framing; if it declines again, the entry
     stays `scouted` — record why in the session notes.
3. **Ingest** (deterministic): `python3 scripts/ingest_reviews.py reviews-work/answers
   --prompts reviews-work/prompts` — validates via the same `check_fields` the CLI path
   used (vocabulary enforced, execution-implying prose rejected), takes `source_sha` and
   `scope` ONLY from the dump-time prompt files (never from the reviewing agent), writes
   `skills.json`.
4. **Gate**: `python3 scripts/validate_index.py` — must pass before commit.
5. Branch + PR as usual; a human skims the prose before merge. Never write to main.

## Cost expectations
- Full 53-entry backfill (2026-07-31, one-time): ~3.5M subagent tokens.
- Weekly delta with batching: ~10–15 changed repos → 2–4 batched agents → ~300–500k tokens.

## Safety invariants (unchanged from PR #12)
- Nothing is installed or executed; agents read source text only.
- `source_sha` is pinned at dump time; upstream movement auto-demotes to `scouted`.
- The honesty gate fails the build on execution-implying prose, out-of-vocabulary
  `touches`, or a missing review block.
