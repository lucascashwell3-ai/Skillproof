#!/usr/bin/env python3
"""Automated safety skim for scouted catalog entries.

Free and token-less by design: a shallow git clone of each repo and a set of
tight regex heuristics over its text files. Catches the obvious poison —
remote-exec one-liners, credential harvesting, obfuscated eval — and publishes
the result as a receipt on each entry. It is NOT a virus scanner and never
claims "verified safe"; a clean skim means "no known red-flag patterns found",
and the line-by-line read still only happens in grading.

Findings come in two tiers (kept tight to avoid false positives):
- RED   — remote-exec pipes, eval-of-download, decode-then-execute. An entry
          with a red finding is reported and should be pulled from the catalog
          pending manual review (the script prints them; it never hides them).
- NOTE  — patterns worth knowing about but common in legit tooling (plain
          network calls, long base64 blobs). Counted in the receipt, not fatal.

Usage: python3 scripts/safety_skim.py [--only ID] [--limit N]
Then:  python3 scripts/validate_index.py
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

from clear_flag import load_ledger, valid_clearance

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "docs" / "data" / "skills.json"
TODAY = date.today().isoformat()

MAX_FILE_BYTES = 512 * 1024
MAX_FILES = 600
SKIP_DIRS = {".git", "node_modules", "dist", "build", "vendor", ".next", "__pycache__"}
TEXT_EXT = {".md", ".txt", ".sh", ".bash", ".zsh", ".py", ".js", ".mjs", ".cjs", ".ts",
            ".tsx", ".jsx", ".json", ".yaml", ".yml", ".toml", ".rb", ".ps1", ".bat",
            ".cmd", ".mk", "", ".cfg", ".ini", ".env"}

RED = [
    ("remote-exec pipe", re.compile(r"(curl|wget)\b[^\n|]{0,200}\|\s*(sudo\s+)?(ba|z|fi)?sh\b", re.I)),
    ("eval of download", re.compile(r"\beval\b[^\n]{0,80}\$\(\s*(curl|wget)\b", re.I)),
    ("powershell encoded exec", re.compile(r"powershell[^\n]{0,80}-e(nc|ncodedcommand)\b", re.I)),
    ("decode-then-execute", re.compile(r"(base64\s+(-d|--decode)[^\n]{0,60}\|\s*(ba|z)?sh|eval\s*\(\s*atob\s*\(|exec\s*\(\s*(base64|codecs)\.)", re.I)),
    ("ssh key read", re.compile(r"(\.ssh/id_[a-z0-9]+|\.ssh/authorized_keys)", re.I)),
    ("cloud credential read", re.compile(r"(\.aws/credentials|\.config/gcloud|\.azure/credentials|\.netrc\b)", re.I)),
]
NOTE = [
    ("long base64 blob", re.compile(r"[A-Za-z0-9+/]{600,}={0,2}")),
    ("network call", re.compile(r"\b(requests\.(get|post)|urllib\.request|fetch\s*\(\s*[\"']https?://|axios\.(get|post)|curl\s+-)", re.I)),
]


def scan_repo(url, workdir):
    dest = Path(workdir) / "repo"
    r = subprocess.run(
        ["git", "clone", "--depth", "1", "--quiet", url + ".git", str(dest)],
        capture_output=True, text=True, timeout=300,
    )
    if r.returncode != 0:
        return None
    reds, notes, scanned = {}, {}, 0
    TEST_PART = re.compile(r"^(tests?|spec|__tests__|fixtures)$", re.I)
    for p in dest.rglob("*"):
        if scanned >= MAX_FILES:
            break
        if not p.is_file() or p.is_symlink():
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.suffix.lower() not in TEXT_EXT:
            continue
        try:
            if p.stat().st_size > MAX_FILE_BYTES:
                continue
            text = p.read_text(errors="ignore")
        except OSError:
            continue
        scanned += 1
        rel = str(p.relative_to(dest))
        # Context matters: a curl|bash in a README is an install instruction, in a
        # Dockerfile it runs in THEIR container build, in a test it's a fixture.
        # Only a hit in runnable code that lands on the user's machine is red.
        if p.suffix.lower() in {".md", ".txt"}:
            ctx = "docs"
        elif any(TEST_PART.match(part) for part in p.parts):
            ctx = "tests"
        elif p.name.lower().startswith(("dockerfile", "docker-compose")):
            ctx = "docker"
        else:
            ctx = "code"
        for label, rx in RED:
            if rx.search(text):
                if ctx == "code":
                    reds.setdefault(label, rel)
                else:
                    notes.setdefault(f"{label} in {ctx}", rel)
        if ctx == "code":
            for label, rx in NOTE:
                if rx.search(text):
                    notes.setdefault(label, rel)
    return {"reds": reds, "notes": notes, "files_scanned": scanned}


def receipt(result, is_lib):
    base_lib = "A library, not one skill — each skill needs its own read before use."
    base_one = "Not a line-by-line read — treat as untrusted until graded."
    if result is None:
        return None
    if result["reds"]:
        flags = "; ".join(f"{k} ({v})" for k, v in result["reds"].items())
        return (f"Automated safety skim ({TODAY}): flagged for human review — {flags}. "
                "Held out of recommendations until a person reads the flagged lines.")
    notes = f" Notes: {', '.join(result['notes'])}." if result["notes"] else ""
    return (
        f"Automated safety skim ({TODAY}, {result['files_scanned']} files): no red-flag patterns "
        f"(remote-exec, credential reads, obfuscated exec) found in a shallow-clone scan.{notes} "
        + (base_lib if is_lib else base_one)
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    data = json.loads(DATA.read_text())
    ledger = load_ledger()
    flagged, missed, done = [], [], 0
    already_cleared = []
    for s in data["skills"]:
        if s.get("status") != "scouted":
            continue
        if args.only and s["id"] != args.only:
            continue
        if args.limit and done >= args.limit:
            break
        with tempfile.TemporaryDirectory() as tmp:
            try:
                result = scan_repo(s["repo_url"], tmp)
            except subprocess.TimeoutExpired:
                result = None
        done += 1
        if result is None:
            missed.append(s["id"])
            print(f"  miss: {s['id']} (clone failed) — receipt left as-is")
            continue
        is_lib = s.get("category") == "library"
        s["triage"]["safety"] = receipt(result, is_lib)
        s["skim"] = {
            "date": TODAY,
            "files_scanned": result["files_scanned"],
            "red_flags": sorted(result["reds"]),
            "notes": sorted(result["notes"]),
        }
        # `held` is the enforcement flag the site reads: a red-flagged entry is
        # withheld from stacks and install plans unless a human clearance covers
        # this exact code + flag set. Nothing here can create a clearance —
        # only scripts/clear_flag.py, run by a person, can.
        if result["reds"]:
            cleared = valid_clearance(s, ledger)
            s["skim"]["held"] = not cleared
            if cleared:
                rec = ledger["clearances"][s["id"]]
                s["skim"]["cleared"] = {"date": rec["date"], "by": rec["by"],
                                        "sha": rec["sha"], "reason": rec["reason"]}
                already_cleared.append(s["id"])
                print(f"  ✓ cleared (human-reviewed {rec['date']} @ {rec['sha']}): {s['id']}")
            else:
                s["skim"].pop("cleared", None)
                flagged.append(s["id"])
                print(f"  🚩 RED: {s['id']} — {result['reds']}")
        else:
            s["skim"]["held"] = False
            s["skim"].pop("cleared", None)
            print(f"  ok: {s['id']} ({result['files_scanned']} files{', notes: ' + ','.join(result['notes']) if result['notes'] else ''})")

    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"\nskimmed {done}: {len(flagged)} need review, "
          f"{len(already_cleared)} previously cleared by a human, {len(missed)} missed")
    # NEEDS-REVIEW is the number that matters: previously-cleared entries are
    # reported separately so the weekly signal only rises when something is
    # actually new or has changed since a human last read it.
    print(f"NEEDS_REVIEW_COUNT={len(flagged)}")
    if already_cleared:
        print("cleared (unchanged since human review): " + ", ".join(already_cleared))
    if flagged:
        print("NEEDS REVIEW (read + clear or drop before merge): " + ", ".join(flagged))
    print("now run: python3 scripts/validate_index.py")
    return 1 if flagged or missed else 0


if __name__ == "__main__":
    sys.exit(main())
