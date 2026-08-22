#!/usr/bin/env python3
"""The quarantine: repos the safety scanner flagged, which are NOT on the site.

THE RULE
    A skill only appears on Skillproof if the automated scanner looked at its
    source and found nothing dangerous. If the scanner flags it (remote-exec
    pipes, credential reads, auto-run hooks), it is pulled out of the published
    catalog and parked here. Listing something we suspect is malicious — even
    behind a warning — is still advertising it.

    The feeder re-scans every quarantined repo on each run, on its CURRENT
    code. Clean -> re-admitted automatically (2026-08-21: a flag that was only
    ever in a README never sticks; the scanner treats docs as notes, not
    kills). Still flagged -> stays. Set "hold": true on an entry to stop the
    automatic re-admit; --restore still works for a human who read the source.

Usage:
    python3 scripts/quarantine.py --list
    python3 scripts/quarantine.py --restore <entry-id> --reason "what I checked"
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "docs" / "data" / "skills.json"
QFILE = ROOT / "grading" / "quarantine.json"


def load_quarantine():
    if QFILE.exists():
        return json.loads(QFILE.read_text())
    return {"_comment": "Repos the safety scanner flagged. NOT published to the site. "
                        "Restored only by a human via scripts/quarantine.py --restore.",
            "entries": []}


def save_quarantine(q):
    QFILE.parent.mkdir(parents=True, exist_ok=True)
    QFILE.write_text(json.dumps(q, indent=2, ensure_ascii=False) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--restore")
    ap.add_argument("--reason")
    ap.add_argument("--by", default="lucas")
    args = ap.parse_args()

    q = load_quarantine()
    entries = q.get("entries", [])

    if args.list or not args.restore:
        if not entries:
            print("quarantine is empty — every catalog entry passed the scanner")
            return 0
        print(f"{len(entries)} repo(s) quarantined and NOT on the site:\n")
        for e in entries:
            flags = ", ".join((e.get("skim") or {}).get("red_flags") or [])
            print(f"  {e['id']}\n    {e.get('repo_url','')}\n    flagged: {flags}"
                  f"\n    pulled:  {e.get('quarantined_on','?')}\n")
        print("Restore one only after reading its source:")
        print('  python3 scripts/quarantine.py --restore <id> --reason "what I checked"')
        return 0

    if not args.reason:
        ap.error("--reason is required: restoring without a stated review is not a review")

    hit = next((e for e in entries if e["id"] == args.restore), None)
    if not hit:
        print(f"{args.restore} is not in quarantine", file=sys.stderr)
        return 1

    data = json.loads(DATA.read_text())
    if any(x["id"] == hit["id"] for x in data["skills"]):
        print(f"{hit['id']} is already in the catalog", file=sys.stderr)
        return 1

    restored = {k: v for k, v in hit.items() if k != "quarantined_on"}
    restored.setdefault("skim", {})["human_review"] = {
        "date": date.today().isoformat(), "by": args.by, "reason": args.reason,
        "original_flags": (hit.get("skim") or {}).get("red_flags") or [],
    }
    # the flags are cleared only because a person read the code and said so
    restored["skim"]["red_flags"] = []
    data["skills"].append(restored)
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    q["entries"] = [e for e in entries if e["id"] != hit["id"]]
    save_quarantine(q)
    print(f"restored {hit['id']} to the catalog")
    print(f"  reviewed by {args.by}: {args.reason}")
    print("Note: the next scan re-checks it from scratch. If the repo pushes code that")
    print("trips the scanner again, it goes straight back into quarantine.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
