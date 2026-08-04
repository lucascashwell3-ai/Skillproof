#!/usr/bin/env python3
"""Proof that the honesty gate fails closed on the `reviewed` tier.

A gate is only worth the claim it protects if you have watched it reject bad
data. So every rule that guards the `reviewed` tier gets a deliberately broken
fixture here, and the test asserts BOTH that the build fails AND that it fails
for the stated reason — a rule that rejects for the wrong reason is a rule that
will pass the wrong thing later.

Fixtures are built from the live catalog, so the tests exercise the real shape of
real data. Nothing here writes to docs/data/skills.json.

Usage: python3 scripts/test_review_gate.py
"""
import copy
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIVE = ROOT / "docs" / "data" / "skills.json"
GATE = ROOT / "scripts" / "validate_index.py"

GOOD_SHA = "a" * 40
MOVED_SHA = "b" * 40


def run_gate(data, *flags):
    """Run the real gate against a fixture. Returns (exit_code, output, data)."""
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "skills.json"
        path.write_text(json.dumps(data, indent=2) + "\n")
        env = dict(os.environ, SKILLPROOF_DATA=str(path))
        r = subprocess.run([sys.executable, str(GATE), *flags],
                           capture_output=True, text=True, env=env)
        return r.returncode, r.stdout + r.stderr, json.loads(path.read_text())


def base_reviewed(source=None):
    """A well-formed `reviewed` entry, built off a real catalog row.

    Two things this must not do, both learned from the 2026-08-03 CI failure:

    1. **Never require a `scouted` row to exist.** It used to pick the first one,
       which was fine until 53 of 54 entries got reviewed and there were none
       left — then the whole suite died on its first fixture, locally and in CI.
       Any row works; the tier-specific fields get stripped below.
    2. **Strip every review remnant, not just `review`.** A row that had already
       been demoted carries `review_stale`. Building a `reviewed` fixture on top
       of it produced an entry with BOTH blocks — which the gate correctly
       blocks, so the fix-mode test failed for a reason that had nothing to do
       with fix mode. That masked a green pipeline as a broken one and stopped
       17 real demotions from ever shipping.

    The rule: a fixture must be defined by what this function sets, never by what
    the live row happened to be carrying.
    """
    data = json.loads(Path(source or LIVE).read_text())
    # A non-graded row already carries what every tier needs (scouted_on, triage
    # receipts) and none of what only a grade may carry. Prefer one; fall back to
    # any row rather than raising, so the suite can never die on catalog shape.
    rows = data["skills"]
    entry = copy.deepcopy(next((s for s in rows if s.get("status") != "graded"), rows[0]))
    for leftover in ("review", "review_stale", "grade", "scores", "score_total",
                     "verdict", "evidence_url", "version_tested", "last_verified"):
        entry.pop(leftover, None)
    entry["status"] = "reviewed"
    entry.setdefault("signals", {})["head_sha"] = GOOD_SHA
    entry["signals"]["head_checked"] = "2026-07-29"
    entry["review"] = {
        "does": "Gives your agent a set of written rules it follows while working.",
        "touches": ["reads project files"],
        "undo": "Delete the folder from ~/.claude/skills/ to remove it.",
        "scope": "SKILL.md + README.md, 6.2KB read",
        "limits": "The code was read, not run — this cannot tell you whether it "
                  "works in practice, only what the source does.",
        "reviewed_at": "2026-07-29",
        "reviewer": "automated-source-review v1",
        "source_sha": GOOD_SHA,
    }
    data["skills"] = [entry] + [s for s in data["skills"] if s["id"] != entry["id"]]
    return data, entry["id"]


CASES = []


def case(name, expect_in_output):
    def deco(fn):
        CASES.append((name, fn, expect_in_output))
        return fn
    return deco


# ---------------------------------------------------------- the three injections

@case("reviewed entry with NO review block",
      "status 'reviewed' but no review block")
def no_block():
    data, sid = base_reviewed()
    del data["skills"][0]["review"]
    return data


@case("review re-pinned across a commit that changed a real file",
      "could affect behaviour")
def repin_over_material_change():
    """The re-pin path is the ONLY way a review survives a commit it was not
    written against. If it ever accepts a real code change, the site states a
    review of code that changed — the one thing this project cannot get wrong.
    So the gate re-checks the file list instead of trusting the refresher."""
    data, sid = base_reviewed()
    e = data["skills"][0]
    e["review"]["source_sha"] = MOVED_SHA
    e["signals"]["head_sha"] = MOVED_SHA
    e["review"]["repinned"] = [{"from": GOOD_SHA, "to": MOVED_SHA,
                                "on": "2026-08-03",
                                "changed": ["README.md", "install.sh"]}]
    return data


@case("re-pin trail that disagrees with the pin it claims to explain",
      "the pin and its trail disagree")
def repin_trail_mismatch():
    data, sid = base_reviewed()
    e = data["skills"][0]
    e["review"]["repinned"] = [{"from": MOVED_SHA, "to": MOVED_SHA,
                                "on": "2026-08-03", "changed": ["README.md"]}]
    return data


@case("re-pin recorded with no evidence of what changed",
      "a re-pin with no evidence is not auditable")
def repin_no_evidence():
    data, sid = base_reviewed()
    data["skills"][0]["review"]["repinned"] = [
        {"from": MOVED_SHA, "to": GOOD_SHA, "on": "2026-08-03"}]
    return data


@case("review pinned to a sha that no longer matches HEAD",
      "must never present as current")
def mismatched_sha():
    data, sid = base_reviewed()
    data["skills"][0]["signals"]["head_sha"] = MOVED_SHA
    return data


@case("invented `touches` value outside the fixed vocabulary",
      "is not in the fixed vocabulary")
def invented_touches():
    data, sid = base_reviewed()
    data["skills"][0]["review"]["touches"] = ["reads your mind"]
    return data


# ------------------------------------------- the rules that back up the same claim

@case("incomplete review block (source_sha stripped)",
      "review.source_sha missing")
def missing_sha():
    data, sid = base_reviewed()
    del data["skills"][0]["review"]["source_sha"]
    return data


@case("review prose implying the code was executed",
      "must not imply it did")
def implies_testing():
    data, sid = base_reviewed()
    data["skills"][0]["review"]["does"] = "We tested it and it works well."
    return data


@case("'no side effects' combined with a real side effect",
      "cannot be combined")
def contradictory_touches():
    data, sid = base_reviewed()
    data["skills"][0]["review"]["touches"] = ["no side effects", "network calls"]
    return data


@case("reviewed entry carrying a grade",
      "neither scouted nor reviewed resources are graded")
def reviewed_with_grade():
    data, sid = base_reviewed()
    data["skills"][0]["grade"] = "A"
    return data


@case("both a current and an archived review block",
      "the stale copy must be dropped")
def double_block():
    data, sid = base_reviewed()
    data["skills"][0]["review_stale"] = dict(
        data["skills"][0]["review"],
        downgraded_on="2026-07-01", stale_reason="upstream moved")
    return data


@case("archived review with no reason recorded",
      "review_stale.stale_reason missing")
def stale_no_reason():
    data, sid = base_reviewed()
    entry = data["skills"][0]
    entry["review_stale"] = dict(entry.pop("review"), downgraded_on="2026-07-01")
    entry["status"] = "scouted"
    return data


@case("graded entry whose worksheet does not exist",
      "does not exist in the repo")
def missing_worksheet():
    data = json.loads(LIVE.read_text())
    g = next(s for s in data["skills"] if s.get("status") == "graded")
    g["evidence_url"] = "grading/worksheets/does-not-exist.md"
    return data


# ------------------------------------------------------------------------- runner

def main():
    print("Honesty-gate failure injection — every case below MUST fail the build.\n")
    passed = failed = 0

    # Control: the live catalog must still pass, or the rest proves nothing.
    code, out, _ = run_gate(json.loads(LIVE.read_text()))
    if code == 0:
        print("  ✓ CONTROL     live catalog passes (exit 0)")
        passed += 1
    else:
        print(f"  ✗ CONTROL     live catalog FAILS — fix that first:\n{out}")
        failed += 1

    # Control: a well-formed reviewed entry must pass.
    code, out, _ = run_gate(base_reviewed()[0])
    if code == 0:
        print("  ✓ CONTROL     well-formed `reviewed` entry passes (exit 0)")
        passed += 1
    else:
        print(f"  ✗ CONTROL     good `reviewed` entry REJECTED:\n{out}")
        failed += 1

    # Regression, 2026-08-03: the fixture builder must survive a catalog whose
    # rows have already been demoted. On the first real demotion (17 repos moved
    # in one week) `base_reviewed()` built its fixture on top of a row that still
    # carried `review_stale`, producing an entry with BOTH blocks. The gate
    # blocked it — correctly — so fix mode "failed", CI went red, and the 17 real
    # demotions never shipped. The live site kept advertising 17 reviews of code
    # that had changed. A green pipeline was reported as broken by its own test.
    demoted = {"downgraded_on": "2026-08-03", "stale_reason": "regression fixture",
               "source_sha": "c" * 40, "does": "x", "touches": ["no side effects"],
               "undo": "x", "scope": "x", "limits": "x"}
    probe = json.loads(LIVE.read_text())
    # Filter FIRST, then mark the row base_reviewed() will actually pick. Marking
    # before filtering silently marked the graded row, which the filter then
    # dropped — leaving a test that passed no matter what. Caught by injection.
    ungraded = [s for s in probe["skills"] if s.get("status") != "graded"]
    probe["skills"] = [dict(ungraded[0], review_stale=demoted)] + ungraded[1:]
    tmp = Path(tempfile.mkdtemp()) / "skills.json"
    tmp.write_text(json.dumps(probe))
    built = base_reviewed(source=tmp)[0]["skills"][0]
    if "review_stale" not in built and built.get("review"):
        print("  ✓ REGRESSION  fixture built off an already-demoted row carries no "
              "leftover `review_stale`")
        passed += 1
    else:
        print("  ✗ REGRESSION  fixture inherited `review_stale` from the live row — "
              "this is the 2026-08-03 CI failure returning")
        failed += 1

    print()
    for name, build, expect in CASES:
        code, out, _ = run_gate(build())
        if code == 0:
            print(f"  ✗ LEAKED      {name}\n                gate passed data it "
                  f"should have blocked")
            failed += 1
        elif expect not in out:
            print(f"  ✗ WRONG WHY   {name}\n                blocked, but not for "
                  f"'{expect}' — rule may be matching by accident")
            failed += 1
        else:
            print(f"  ✓ BLOCKED     {name}")
            print(f"                → {next(l.strip(' -') for l in out.splitlines() if expect in l)[:140]}")
            passed += 1

    # The fix mode: a stale review must be demoted, archived with a reason, and
    # the result must then pass the gate it previously failed.
    print()
    data = mismatched_sha()
    sid = data["skills"][0]["id"]
    code, out, fixed = run_gate(data, "--downgrade-stale")
    entry = next(s for s in fixed["skills"] if s["id"] == sid)
    ok = (code == 0
          and entry["status"] == "scouted"
          and "review" not in entry
          and entry.get("review_stale", {}).get("stale_reason")
          and "downgraded" in out)
    if ok:
        print("  ✓ FIX MODE    --downgrade-stale demoted the stale entry to "
              "`scouted` and archived it")
        print(f"                → {entry['review_stale']['stale_reason'][:120]}")
        code2, _, _ = run_gate(fixed)
        if code2 == 0:
            print("  ✓ FIX MODE    the demoted catalog then passes the gate")
            passed += 2
        else:
            print("  ✗ FIX MODE    demoted catalog still fails the gate")
            failed += 1
    else:
        print(f"  ✗ FIX MODE    --downgrade-stale did not demote correctly "
              f"(exit={code}, status={entry.get('status')})\n{out}")
        failed += 1

    print(f"\n{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
