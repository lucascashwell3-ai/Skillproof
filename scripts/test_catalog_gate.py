#!/usr/bin/env python3
"""Proof that the honesty gate holds the short-list shape.

A gate is only worth the claim it protects if you have watched it reject bad
data. Each test breaks ONE rule on a copy of the live list and asserts both
that the build fails AND that it fails for the stated reason. Nothing here
writes to docs/data/skills.json.

Usage: python3 scripts/test_catalog_gate.py
"""
import copy
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIVE = ROOT / "docs" / "data" / "skills.json"
GATE = ROOT / "scripts" / "validate_index.py"


def run_gate(data):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "skills.json"
        path.write_text(json.dumps(data, indent=2) + "\n")
        r = subprocess.run([sys.executable, str(GATE)], capture_output=True, text=True,
                           env=dict(os.environ, SKILLPROOF_DATA=str(path)))
        return r.returncode, r.stdout + r.stderr


class TestGate(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(LIVE.read_text())
        self.entry = self.data["skills"][0]

    def broken(self, **changes):
        d = copy.deepcopy(self.data)
        d["skills"][0].update(changes)
        return d

    def assertRejects(self, data, reason):
        code, out = run_gate(data)
        self.assertNotEqual(code, 0, "gate passed data it must refuse")
        self.assertIn(reason, out)

    def test_live_list_passes(self):
        code, out = run_gate(self.data)
        self.assertEqual(code, 0, out)

    def test_every_live_entry_is_one_skill_folder(self):
        for s in self.data["skills"]:
            self.assertNotEqual(s["category"], "library", s["id"])
            self.assertIn("source", s, s["id"])

    def test_bare_it_in_an_install_line(self):
        self.assertRejects(self.broken(line="Your AI uses it on its own."), "bare 'it'")

    def test_line_that_only_names_the_skill(self):
        self.assertRejects(self.broken(line="Type /grill-me to use grill-me."), "says nothing")

    def test_install_line_must_be_one_line(self):
        self.assertRejects(self.broken(line="Type /x.\nThen more."), "one line")

    def test_whole_pack_category_is_refused(self):
        self.assertRejects(self.broken(category="library"), "unknown category 'library'")

    def test_link_must_be_the_skills_own_folder(self):
        repo = self.entry["source"]["repo"]
        self.assertRejects(self.broken(repo_url=f"https://github.com/{repo}"), "own folder")

    def test_who_calls_it(self):
        self.assertRejects(self.broken(calls="sometimes"), "calls must be one of")

    def test_audience(self):
        self.assertRejects(self.broken(**{"for": "experts"}), "for must be one of")

    def test_required_fields(self):
        d = copy.deepcopy(self.data)
        del d["skills"][0]["line"]
        self.assertRejects(d, "missing required field 'line'")

    def test_tiers_never_come_back(self):
        for field in ("status", "grade", "review", "verdict"):
            self.assertRejects(self.broken(**{field: "x"}), f"tier-era field '{field}'")

    def test_duplicate_id(self):
        d = copy.deepcopy(self.data)
        d["skills"].append(copy.deepcopy(d["skills"][0]))
        self.assertRejects(d, "duplicate id")


if __name__ == "__main__":
    unittest.main()
