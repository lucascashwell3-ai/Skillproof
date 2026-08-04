#!/usr/bin/env python3
"""Honesty gate for docs/data/skills.json.

Every grade must recompute from its dimension scores; every graded entry must
carry receipts (worksheet link, security notes, verification date); every
`reviewed` entry must carry a complete review block pinned to a commit sha that
still matches the repo's recorded HEAD. A hand-set or unsupported value must not
be able to ship. Exits non-zero on any error.

Two modes, because a stale review is a different problem from a false one:

  python3 scripts/validate_index.py
      GATE. Read-only. A `reviewed` entry whose review no longer matches the
      repo's recorded HEAD is a BLOCKING error — stale must never reach the site
      presenting as current.

  python3 scripts/validate_index.py --downgrade-stale
      FIX. Demotes those entries to `scouted`, archiving the old review block
      under `review_stale` with the reason, and writes the file. Runs in the
      pipeline right after signals refresh, so upstream moving costs an entry its
      tier automatically instead of silently invalidating a published claim.

The pipeline runs FIX and then GATE. The fix keeps the catalog honest without
human intervention; the gate means that if the fix is ever skipped, removed, or
broken, the build stops rather than shipping a decayed claim.
"""
import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

from review_contract import (
    inert_file,
    REVIEW_REQUIRED,
    REVIEW_STALE_REQUIRED,
    TOUCHES_EXCLUSIVE,
    TOUCHES_VOCAB,
)

ROOT = Path(__file__).resolve().parent.parent
# SKILLPROOF_DATA lets the gate be pointed at a fixture. A gate nobody can test
# against deliberately-broken data is a gate nobody has evidence works — see
# scripts/test_review_gate.py, which uses this to prove each rule fails closed.
DATA = Path(os.environ.get("SKILLPROOF_DATA")
            or ROOT / "docs" / "data" / "skills.json")
TODAY = date.today().isoformat()

# `reviewed` sits between scouted and graded: full source read by an automated
# reviewer, pinned to a commit. Not installed, not executed — that gap is the
# reason it is a separate tier and not a grade.
STATUSES = {"graded", "provisional", "delisted", "scouted", "reviewed"}
UNTESTED_TIERS = ("scouted", "reviewed")
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
SHA = re.compile(r"^[0-9a-f]{40}$")

# Words a review must never use about itself. Reading source is not running it,
# and the single most damaging thing this catalog could do is blur that line —
# so it is enforced mechanically, not left to whoever writes the prompt.
FORBIDDEN_IN_REVIEW = ("we tested", "we installed", "we ran ", "verified working",
                       "confirmed working", "tested and", "we probed")

# RUBRIC.md v1.0 letter mapping (total /24). Order matters: first match wins.
LETTER = [(23, "A"), (21, "A-"), (20, "B+"), (18, "B"), (17, "B-"),
          (15, "C+"), (13, "C"), (12, "C-"), (10, "D+"), (8, "D"), (0, "F")]


def letter_for(total: int) -> str:
    for floor, letter in LETTER:
        if total >= floor:
            return letter
    return "F"


def check_review(sid, s, E, W):
    """Validate an entry's `review` block. Returns "stale" when the block no
    longer describes the repo's recorded HEAD, else None.

    Staleness is reported separately from malformedness because the two have
    different remedies: a malformed review is a bug to fix, a stale one is a
    fact of upstream life and gets an automatic demotion.
    """
    review = s.get("review")
    status = s.get("status")

    if status == "reviewed" and not isinstance(review, dict):
        E(f"{sid}: status 'reviewed' but no review block — the tier IS the block")
        return None
    if not isinstance(review, dict):
        return None

    for field in REVIEW_REQUIRED:
        if not review.get(field):
            E(f"{sid}: review.{field} missing — an incomplete review block must "
              f"not present as a review")
    if review.get("reviewed_at") and not ISO.match(str(review["reviewed_at"])):
        E(f"{sid}: review.reviewed_at '{review['reviewed_at']}' is not YYYY-MM-DD")

    touches = review.get("touches")
    if touches is not None:
        if not isinstance(touches, list) or not touches:
            E(f"{sid}: review.touches must be a non-empty list")
        else:
            for t in touches:
                if t not in TOUCHES_VOCAB:
                    E(f"{sid}: review.touches value '{t}' is not in the fixed "
                      f"vocabulary — an invented category is a claim nobody "
                      f"defined and the site cannot filter on")
            if TOUCHES_EXCLUSIVE in touches and len(touches) > 1:
                E(f"{sid}: review.touches has '{TOUCHES_EXCLUSIVE}' alongside "
                  f"{[t for t in touches if t != TOUCHES_EXCLUSIVE]} — it means "
                  f"nothing else is claimed, so it cannot be combined")

    # Precision is the product: a review may never imply execution.
    prose = " ".join(str(review.get(k, "")) for k in
                     ("does", "undo", "scope", "limits")).lower()
    for phrase in FORBIDDEN_IN_REVIEW:
        if phrase in prose:
            E(f"{sid}: review prose contains '{phrase.strip()}' — a source review "
              f"never executed the code and must not imply it did")
    if review.get("limits") and "not" not in str(review["limits"]).lower():
        W(f"{sid}: review.limits does not appear to state a limit — it must say "
          f"what the review could NOT establish")

    # --- THE PINNING RULE. Without it, "reviewed" decays into a stale assertion
    # the moment the upstream repo changes.
    sha = review.get("source_sha")
    head = (s.get("signals") or {}).get("head_sha")
    if sha and not SHA.match(str(sha)):
        E(f"{sid}: review.source_sha '{sha}' is not a 40-char commit sha")
        return None
    if not head:
        W(f"{sid}: no signals.head_sha recorded, so the review at "
          f"{str(sha)[:8]} cannot be confirmed current — run refresh_signals.py")
        return None
    if sha and sha != head:
        return "stale"
    return None


def main(downgrade: bool = False) -> int:
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
    stale = []
    for s in data["skills"]:
        sid = s.get("id", "(unnamed)")

        # --- THE SAFETY RULE: nothing the scanner flagged may be published.
        # Flagged repos are pulled into grading/quarantine.json by safety_skim
        # and only a human can restore one. If a flagged entry ever appears in
        # the published catalog, that is a blocking error — no warning labels,
        # no exceptions.
        skim = s.get("skim") or {}
        if skim.get("red_flags"):
            E(f"{sid}: carries safety red flags {skim['red_flags']} but is in the published "
              f"catalog — flagged repos must be quarantined, never listed")
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

        # A review block is validated wherever it appears, not only on the tier
        # that requires one — so an entry can never carry a malformed or decayed
        # review quietly under some other status.
        if check_review(sid, s, E, W) == "stale":
            stale.append(s)

        # The archived footprint of a review that went stale. It is kept for the
        # audit trail and must never be mistaken for a current one, so it has to
        # say when and why it was demoted.
        rs = s.get("review_stale")
        if isinstance(rs, dict):
            for field in REVIEW_STALE_REQUIRED:
                if not rs.get(field):
                    E(f"{sid}: review_stale.{field} missing — an archived review "
                      f"must record when and why it stopped being current")
        if isinstance(rs, dict) and isinstance(s.get("review"), dict):
            E(f"{sid}: carries both 'review' and 'review_stale' — a current review "
              f"supersedes the archived one; the stale copy must be dropped")

        # A re-pinned review claims: upstream moved, but nothing that changed can
        # affect behaviour, so the bytes we read are still the bytes there now.
        # That claim is only as good as the file list behind it, so the list is
        # re-checked here rather than trusted. This is the one path that keeps a
        # review alive across a commit it was not written against — if it is ever
        # wrong, the site states a review of code that changed, which is the one
        # thing this project cannot get wrong.
        rv = s.get("review")
        if isinstance(rv, dict) and rv.get("repinned"):
            if not isinstance(rv["repinned"], list):
                E(f"{sid}: review.repinned must be a list of re-pin records")
            else:
                for hop in rv["repinned"]:
                    if not isinstance(hop, dict) or not hop.get("changed"):
                        E(f"{sid}: a review.repinned record lists no changed files "
                          f"— a re-pin with no evidence is not auditable")
                        continue
                    guilty = [f for f in hop["changed"] if not inert_file(f)]
                    if guilty:
                        E(f"{sid}: review re-pinned across {hop.get('from','?')[:8]}→"
                          f"{hop.get('to','?')[:8]} but {len(guilty)} changed file(s) "
                          f"could affect behaviour ({', '.join(guilty[:3])}) — only "
                          f"docs, licences and images may keep a review alive")
                    if hop.get("to") and rv.get("source_sha") and \
                            rv["repinned"][-1] is hop and hop["to"] != rv["source_sha"]:
                        E(f"{sid}: last re-pin points at {hop['to'][:8]} but "
                          f"review.source_sha is {rv['source_sha'][:8]} — the pin and "
                          f"its trail disagree")

        if status in UNTESTED_TIERS:
            # Honesty both ways: triage receipts required, grade fields forbidden.
            # This holds for `reviewed` too — reading source is not testing, so a
            # reviewed entry is still barred from anything that looks like a grade.
            for field in GRADE_ONLY_FIELDS:
                if field in s:
                    E(f"{sid}: {status} entry carries '{field}' — neither scouted nor "
                      "reviewed resources are graded; grades come only from a full "
                      "grading run (installed + probed)")
            if not s.get("scouted_on") or not ISO.match(str(s.get("scouted_on", ""))):
                E(f"{sid}: {status} but scouted_on missing or not YYYY-MM-DD")
            triage = s.get("triage")
            if not isinstance(triage, dict):
                E(f"{sid}: {status} but no triage receipts (provenance/license/freshness/safety)")
            else:
                for key in TRIAGE_KEYS:
                    if not triage.get(key):
                        E(f"{sid}: triage.{key} missing — a {status} entry without "
                          "receipts is just a listicle row")
            continue

        if status != "graded":
            continue
        graded_count += 1

        # No entry may claim a tier above the evidence on file. For `graded` the
        # evidence is a worksheet, so the file has to actually exist — a link to
        # a missing worksheet is exactly the kind of receipt a skeptic checks.
        ev = s.get("evidence_url")
        if ev and not str(ev).startswith("http") and not (ROOT / ev).is_file():
            E(f"{sid}: graded but evidence_url '{ev}' does not exist in the repo — "
              f"a grade without a readable worksheet is unsupported")

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

    # --- STALE REVIEWS. A review describes one commit. When upstream moves on,
    # the claim is no longer about the code a visitor would install.
    if stale:
        if downgrade:
            for s in stale:
                sid = s["id"]
                old = s.pop("review")
                head = (s.get("signals") or {}).get("head_sha", "unknown")
                s["review_stale"] = dict(
                    old,
                    downgraded_on=TODAY,
                    stale_reason=(
                        f"upstream HEAD moved from {old['source_sha'][:8]} to "
                        f"{head[:8]}; the review described code that is no longer "
                        f"what a visitor would install"
                    ),
                )
                if s.get("status") == "reviewed":
                    s["status"] = "scouted"
                    s["next"] = ("Upstream changed since the last source review — "
                                 "queued for re-review.")
                print(f"⤓ downgraded {sid}: reviewed → scouted "
                      f"({old['source_sha'][:8]} ≠ {head[:8]})")
            DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
            print(f"⤓ {len(stale)} stale review(s) demoted; wrote {DATA}")
            stale = []
        else:
            for s in stale:
                head = (s.get("signals") or {}).get("head_sha", "unknown")
                E(f"{s['id']}: review pinned to {s['review']['source_sha'][:8]} but "
                  f"recorded HEAD is {head[:8]} — a stale review must never present "
                  f"as current. Run: validate_index.py --downgrade-stale")

    report(errors, warnings, data)
    return 1 if errors else 0


def tier_counts(data):
    c = {}
    for s in data.get("skills", []):
        c[s.get("status", "?")] = c.get(s.get("status", "?"), 0) + 1
    return c


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
        c = tier_counts(data)
        n = len(data.get("skills", []))
        # Every count the site states is derived from this data, never hardcoded.
        split = " · ".join(f"{c[k]} {k}" for k in
                           ("graded", "reviewed", "scouted", "provisional", "delisted")
                           if c.get(k))
        print(f"\n✓ honesty gate passed: {n} entries ({split}), 0 errors.")
        print(f"TIER_SPLIT={json.dumps(c, sort_keys=True)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--downgrade-stale", action="store_true",
                    help="demote reviews whose source_sha no longer matches the "
                         "repo's recorded HEAD, and write the file")
    sys.exit(main(ap.parse_args().downgrade_stale))
