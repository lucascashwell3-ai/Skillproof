#!/usr/bin/env python3
"""Honesty gate for docs/data/skills.json — flat-catalog edition (2026-08-21).

The catalog has ONE class of entry: a real repo that passed the malice scan.
The gate enforces exactly that, and fails closed if the old tier machinery
(status / grade / review / triage) ever creeps back in. Exits non-zero on any
error; the feeder refuses to publish when it does.

Usage:
    python3 scripts/validate_index.py
    SKILLPROOF_DATA=/path/to/fixture.json python3 scripts/validate_index.py

`--downgrade-stale` is accepted as a no-op so the retired v0 catalog-refresh
workflow can still be dispatched by hand without crashing.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# SKILLPROOF_DATA lets the gate be pointed at a fixture for testing.
DATA = Path(os.environ.get("SKILLPROOF_DATA")
            or ROOT / "docs" / "data" / "skills.json")
QFILE = ROOT / "grading" / "quarantine.json"

CATEGORIES = {"workflow", "frontend", "testing", "research", "context",
              "security", "docs", "automation", "output-style", "planning",
              "git", "library"}
REQUIRED = ("id", "name", "repo_url", "author", "category", "summary",
            "pain_points", "signals", "checked")
# Tier-era fields. Their presence means the nuked verification system is
# growing back — that is a build-stopping error, not a warning.
FORBIDDEN = ("status", "grade", "scores", "score_total", "verdict", "review",
             "review_stale", "triage", "skim", "next", "scouted_on",
             "evidence_url", "version_tested", "last_verified")
KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--downgrade-stale", action="store_true",
                    help="no-op kept for the retired v0 workflow")
    args = ap.parse_args()
    if args.downgrade_stale:
        print("validate_index: --downgrade-stale is a no-op (tiers removed 2026-08-21)")
        return 0

    errors = []
    d = json.loads(DATA.read_text())

    for k in ("as_of", "pain_points", "skills"):
        if k not in d:
            errors.append(f"top-level key missing: {k}")
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        return 1

    pain_ids = {p["id"] for p in d["pain_points"]}
    quarantined = set()
    if QFILE.exists():
        q = json.loads(QFILE.read_text())
        quarantined = {e["repo_url"].lower().rstrip("/")
                       for e in q.get("entries", [])}

    seen_ids, seen_urls = set(), set()
    for s in d["skills"]:
        tag = s.get("id") or s.get("name") or "<unnamed>"
        for k in REQUIRED:
            if k not in s:
                errors.append(f"{tag}: missing required field '{k}'")
        for k in FORBIDDEN:
            if k in s:
                errors.append(f"{tag}: tier-era field '{k}' present — tiers were removed")
        if "id" in s:
            if not KEBAB.match(s["id"]):
                errors.append(f"{tag}: id is not kebab-case")
            if s["id"] in seen_ids:
                errors.append(f"{tag}: duplicate id")
            seen_ids.add(s["id"])
        url = (s.get("repo_url") or "").lower().rstrip("/")
        if url:
            if not url.startswith("https://github.com/"):
                errors.append(f"{tag}: repo_url is not a GitHub URL")
            if url in seen_urls:
                errors.append(f"{tag}: duplicate repo_url")
            seen_urls.add(url)
            if url in quarantined:
                errors.append(f"{tag}: repo is in quarantine but still published")
        if s.get("category") not in CATEGORIES:
            errors.append(f"{tag}: unknown category '{s.get('category')}'")
        for p in s.get("pain_points", []):
            if p not in pain_ids:
                errors.append(f"{tag}: unknown pain_point '{p}'")
        chk = s.get("checked")
        if isinstance(chk, dict):
            if not ISO.match(str(chk.get("date", ""))):
                errors.append(f"{tag}: checked.date is not an ISO date")
        elif chk is not None:
            errors.append(f"{tag}: checked must be an object with a date")
        sig = s.get("signals")
        if isinstance(sig, dict):
            if not isinstance(sig.get("stars"), int):
                errors.append(f"{tag}: signals.stars is not an integer")
        elif sig is not None:
            errors.append(f"{tag}: signals must be an object")

    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        print(f"\nvalidate_index: {len(errors)} error(s) in {len(d['skills'])} entries",
              file=sys.stderr)
        return 1
    print(f"validate_index: OK — {len(d['skills'])} entries, one flat class, "
          f"none quarantined, as_of {d['as_of']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
