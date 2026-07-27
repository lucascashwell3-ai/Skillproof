#!/usr/bin/env python3
"""Record a human safety clearance for a red-flagged catalog entry.

WHY THIS EXISTS
    safety_skim.py re-scans every scouted entry on every weekly run, so an
    entry a human already read and cleared gets re-flagged forever. Left alone
    the weekly PR shouts "N flags NEED HUMAN REVIEW" every Monday whether or
    not anything changed, and a number that never goes down is a number people
    stop reading. That is how a real flag gets merged by a tired reviewer.

WHAT A CLEARANCE IS (and is not)
    A clearance says: "a human read THIS code, with THESE flags, and judged it
    safe." It is bound to a signature of both:
        - the exact set of red flags, and
        - the repo's HEAD commit at review time.
    If either changes, the clearance no longer applies and the entry is flagged
    again automatically. A clearance is never a permanent pass on a repo name —
    new code is always unreviewed code.

    Clearances are ONLY written by this script, run by a human, with a reason.
    Nothing in the automated pipeline may create one.

Usage:
    python3 scripts/clear_flag.py --id <entry-id> --reason "why this is safe"
    python3 scripts/clear_flag.py --list          # show current clearances
    python3 scripts/clear_flag.py --revoke <id>   # withdraw a clearance
"""
import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "docs" / "data" / "skills.json"
LEDGER = ROOT / "grading" / "skim_clearances.json"


def head_sha(repo_url):
    """The repo's current HEAD — what the reviewer is actually signing off on."""
    try:
        out = subprocess.run(
            ["git", "ls-remote", repo_url, "HEAD"],
            capture_output=True, text=True, timeout=45, check=True,
        ).stdout.split()
        return out[0][:12] if out else None
    except (subprocess.SubprocessError, IndexError):
        return None


def signature(flags, sha):
    return "|".join(sorted(flags)) + "@" + (sha or "unknown")


def load_ledger():
    if LEDGER.exists():
        return json.loads(LEDGER.read_text())
    return {"_comment": "Human safety clearances. Written only by scripts/clear_flag.py.",
            "clearances": {}}


def save_ledger(led):
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    LEDGER.write_text(json.dumps(led, indent=2, ensure_ascii=False) + "\n")


def valid_clearance(entry, led):
    """True only if a clearance covers this entry's CURRENT flags and code."""
    rec = led.get("clearances", {}).get(entry["id"])
    if not rec:
        return False
    flags = (entry.get("skim") or {}).get("red_flags") or []
    return rec.get("signature") == signature(flags, rec.get("sha"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id")
    ap.add_argument("--reason")
    ap.add_argument("--by", default="lucas")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--revoke")
    args = ap.parse_args()

    data = json.loads(DATA.read_text())
    by_id = {s["id"]: s for s in data["skills"]}
    led = load_ledger()

    if args.list:
        if not led["clearances"]:
            print("no clearances recorded")
            return 0
        for eid, rec in sorted(led["clearances"].items()):
            entry = by_id.get(eid)
            live = "VALID" if entry and valid_clearance(entry, led) else "STALE — code or flags changed, re-review needed"
            print(f"{eid}\n  cleared {rec['date']} by {rec['by']} @ {rec['sha']}\n  flags: {', '.join(rec['flags']) or '(none)'}\n  reason: {rec['reason']}\n  status: {live}\n")
        return 0

    if args.revoke:
        if led["clearances"].pop(args.revoke, None) is None:
            print(f"no clearance for {args.revoke}", file=sys.stderr)
            return 1
        save_ledger(led)
        print(f"revoked clearance for {args.revoke} — it is flagged again")
        return 0

    if not args.id or not args.reason:
        ap.error("--id and --reason are both required (a clearance without a stated reason is not a review)")

    entry = by_id.get(args.id)
    if not entry:
        print(f"no catalog entry with id {args.id}", file=sys.stderr)
        return 1
    flags = (entry.get("skim") or {}).get("red_flags") or []
    if not flags:
        print(f"{args.id} has no red flags — nothing to clear", file=sys.stderr)
        return 1

    sha = head_sha(entry["repo_url"])
    if not sha:
        print(f"could not read HEAD for {entry['repo_url']} — refusing to clear code I can't pin",
              file=sys.stderr)
        return 1

    led["clearances"][args.id] = {
        "date": date.today().isoformat(),
        "by": args.by,
        "sha": sha,
        "flags": sorted(flags),
        "reason": args.reason,
        "signature": signature(flags, sha),
    }
    save_ledger(led)
    print(f"cleared {args.id} @ {sha}\n  flags: {', '.join(sorted(flags))}\n  reason: {args.reason}")
    print("This clearance expires automatically if the repo pushes new code or the flags change.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
