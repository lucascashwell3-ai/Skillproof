#!/usr/bin/env python3
"""Ingest agent-written review answers into docs/data/skills.json.

The no-CLI review path, in three steps:

    1. python3 scripts/deep_review.py --dump-prompts reviews-work/prompts
       (clones each repo, applies the byte caps, pins the sha, writes one
        <id>.json per entry containing system + prompt)
    2. A reviewing agent answers each prompt file, writing
       reviews-work/answers/<id>.json  →  {"id", "does", "touches", "undo", "limits"}
    3. python3 scripts/ingest_reviews.py reviews-work/answers --prompts reviews-work/prompts

Trust boundary: the agent supplies ONLY the four prose/vocab fields. The sha and
scope come from the prompt dump (written at clone time), the vocabulary and
emptiness rules are enforced here by the same check_fields the other backends
use, and the honesty gate (validate_index.py) still runs after. A malformed or
out-of-vocabulary answer is rejected per-entry, never silently accepted.
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from deep_review import DATA, REVIEWER_ID, TODAY, check_fields  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("answers", help="directory of <id>.json agent answers")
    ap.add_argument("--prompts", required=True,
                    help="the --dump-prompts directory (source of sha + scope)")
    args = ap.parse_args()

    answers_dir, prompts_dir = Path(args.answers), Path(args.prompts)
    data = json.loads(DATA.read_text())
    by_id = {s["id"]: s for s in data["skills"]}

    ok = failed = 0
    for path in sorted(answers_dir.glob("*.json")):
        sid = path.stem
        prompt_file = prompts_dir / f"{sid}.json"
        entry = by_id.get(sid)

        problems = []
        if entry is None:
            problems.append("no published entry with this id")
        if not prompt_file.exists():
            problems.append("no matching prompt dump — sha/scope unavailable")
        try:
            fields = json.loads(path.read_text())
        except json.JSONDecodeError as e:
            problems.append(f"answer is not valid JSON: {e}")
            fields = {}
        if not problems:
            if fields.get("id") not in (None, sid):
                problems.append(f"answer id '{fields.get('id')}' != filename '{sid}'")
            problems += check_fields(fields)
        if problems:
            print(f"  FAIL  {sid}: {'; '.join(problems)}")
            failed += 1
            continue

        dump = json.loads(prompt_file.read_text())
        entry.setdefault("signals", {})["head_sha"] = dump["source_sha"]
        entry["signals"]["head_checked"] = TODAY
        entry["review"] = {
            "does": fields["does"].strip(),
            "touches": fields["touches"],
            "undo": fields["undo"].strip(),
            "scope": dump["scope"],
            "limits": fields["limits"].strip(),
            "reviewed_at": TODAY,
            "reviewer": REVIEWER_ID,
            "source_sha": dump["source_sha"],
        }
        entry.pop("review_stale", None)
        entry["status"] = "reviewed"
        entry["next"] = "Queued for a full grading run (installed + probed)."
        ok += 1
        print(f"  ok    {sid} @ {dump['source_sha'][:8]} · "
              f"touches={','.join(fields['touches'])}")

    if ok:
        DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    n_reviewed = sum(1 for s in data["skills"] if s.get("status") == "reviewed")
    print(f"\ningested {ok} · rejected {failed} · "
          f"REVIEWED_COUNT={n_reviewed} of {len(data['skills'])}")
    print(f"{'wrote ' + str(DATA) if ok else 'nothing written'} — "
          f"now run: python3 scripts/validate_index.py")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
