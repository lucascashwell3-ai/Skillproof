#!/usr/bin/env python3
"""Honesty gate for docs/data/skills.json.

Every grade must recompute from its dimension scores; every graded entry must
carry receipts (worksheet link, security notes, verification date). A hand-set
or unsupported value must not be able to ship. Exits non-zero on any error.
Usage: python3 scripts/validate_index.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "docs" / "data" / "skills.json"

STATUSES = {"graded", "provisional", "delisted", "scouted"}
CATEGORIES = {"workflow", "frontend", "testing", "research", "context",
              "security", "docs", "automation", "output-style", "planning", "git",
              "library"}
DIMS = ("triggering", "effectiveness", "docs_install", "maintenance", "safety")
# A scouted entry is found-and-triaged, never tested. It must carry its triage
# receipts and must NOT carry anything that looks like a grade.
TRIAGE_KEYS = ("provenance", "license", "freshness", "safety")
GRADE_ONLY_FIELDS = ("grade", "scores", "score_total", "evidence_url",
                     "version_tested", "last_verified", "verdict")
KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# RUBRIC.md v1.0 letter mapping (total /24). Order matters: first match wins.
LETTER = [(23, "A"), (21, "A-"), (20, "B+"), (18, "B"), (17, "B-"),
          (15, "C+"), (13, "C"), (12, "C-"), (10, "D+"), (8, "D"), (0, "F")]


def letter_for(total: int) -> str:
    for floor, letter in LETTER:
        if total >= floor:
            return letter
    return "F"


def main() -> int:
    errors, warnings = [], []
    E, W = errors.append, warnings.append

    data = json.loads(DATA.read_text())

    for key in ("as_of", "rubric_version", "pain_points", "skills"):
        if key not in data:
            E(f"top-level: missing '{key}'")
    if errors:
        report(errors, warnings, data)
        return 1

    if not ISO.match(data["as_of"]):
        E(f"as_of '{data['as_of']}' is not YYYY-MM-DD")

    vocab = set()
    for p in data["pain_points"]:
        pid = p.get("id", "(missing)")
        if not KEBAB.match(pid):
            E(f"pain_point '{pid}': id not kebab-case")
        if pid in vocab:
            E(f"pain_point '{pid}': duplicate id")
        vocab.add(pid)
        if not p.get("label"):
            E(f"pain_point '{pid}': missing label")
        if not p.get("keywords"):
            E(f"pain_point '{pid}': empty keywords (free-text match needs them)")

    seen_ids = set()
    graded_count = 0
    for s in data["skills"]:
        sid = s.get("id", "(unnamed)")
        if not KEBAB.match(sid):
            E(f"{sid}: id not kebab-case")
        if sid in seen_ids:
            E(f"{sid}: duplicate id")
        seen_ids.add(sid)

        status = s.get("status")
        if status not in STATUSES:
            E(f"{sid}: bad status '{status}'")
        if s.get("category") not in CATEGORIES:
            E(f"{sid}: category '{s.get('category')}' not in vocab")
        for pp in s.get("pain_points", []):
            if pp not in vocab:
                E(f"{sid}: pain_point '{pp}' not in controlled vocab")
        for field in ("name", "repo_url", "author", "summary"):
            if not s.get(field):
                E(f"{sid}: missing {field}")

        if status == "scouted":
            # Honesty both ways: triage receipts required, grade fields forbidden.
            for field in GRADE_ONLY_FIELDS:
                if field in s:
                    E(f"{sid}: scouted entry carries '{field}' — scouted resources are "
                      "NEVER graded; grades come only from a full grading run")
            if not s.get("scouted_on") or not ISO.match(str(s.get("scouted_on", ""))):
                E(f"{sid}: scouted but scouted_on missing or not YYYY-MM-DD")
            triage = s.get("triage")
            if not isinstance(triage, dict):
                E(f"{sid}: scouted but no triage receipts (provenance/license/freshness/safety)")
            else:
                for key in TRIAGE_KEYS:
                    if not triage.get(key):
                        E(f"{sid}: triage.{key} missing — a scouted entry without "
                          "receipts is just a listicle row")
            continue

        if status != "graded":
            continue
        graded_count += 1

        # Receipts: a graded entry without evidence is a lie.
        for field in ("evidence_url", "security_notes", "last_verified", "verdict",
                      "version_tested", "grade", "scores", "score_total"):
            if not s.get(field) and s.get(field) != 0:
                E(f"{sid}: graded but missing {field}")
        if s.get("last_verified") and not ISO.match(s["last_verified"]):
            E(f"{sid}: last_verified not YYYY-MM-DD")

        scores = s.get("scores") or {}
        total = 0
        for dim in DIMS:
            d = scores.get(dim)
            if not isinstance(d, dict) or not isinstance(d.get("score"), int):
                E(f"{sid}: scores.{dim} missing or score not an int")
                continue
            if not 0 <= d["score"] <= 4:
                E(f"{sid}: scores.{dim}.score {d['score']} out of 0-4")
            if not d.get("note"):
                E(f"{sid}: scores.{dim} has no 'why' note — a number without a reason doesn't ship")
            total += d["score"] * (2 if dim == "effectiveness" else 1)

        if s.get("score_total") != total:
            E(f"{sid}: score_total {s.get('score_total')} != computed {total}")
        expected = "F" if s.get("auto_f") else letter_for(total)
        if s.get("auto_f") and not s.get("auto_f_reason"):
            E(f"{sid}: auto_f set but no auto_f_reason (the reason gets published)")
        if s.get("grade") != expected:
            E(f"{sid}: grade '{s.get('grade')}' != derived '{expected}' — grades are never hand-set")

        if s.get("last_verified"):
            try:
                age = (date.fromisoformat(data["as_of"]) - date.fromisoformat(s["last_verified"])).days
                if age > 90:
                    W(f"{sid}: grade is {age} days old — must render 'stale' on site")
            except ValueError:
                pass

    if graded_count == 0:
        W("0 graded skills — site must state this honestly")

    report(errors, warnings, data)
    return 1 if errors else 0


def report(errors, warnings, data):
    if warnings:
        print("⚠ warnings (non-blocking):")
        for w in warnings:
            print("  - " + w)
    if errors:
        print(f"\n✗ {len(errors)} honesty-gate error(s) — blocking:", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
    else:
        n = len(data.get("skills", []))
        g = sum(1 for s in data.get("skills", []) if s.get("status") == "graded")
        print(f"\n✓ honesty gate passed: {n} skills ({g} graded), 0 errors.")


if __name__ == "__main__":
    sys.exit(main())
